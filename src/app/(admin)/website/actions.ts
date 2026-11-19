"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateIdentitas } from "@/features/desa/application/use-cases";
import { desaFormSchema } from "@/features/desa/domain/desa";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  createDokumenPublik, createMenuPublik, deleteDokumenPublik, deleteMenuPublik,
  dokumenSlugExists, listMenuPublik, updateDokumenPublik, updateMenuPublik,
} from "@/features/publik/infrastructure/content-repository";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import { requirePermission } from "@/lib/dal";

const text = (fd: FormData, key: string) => { const value = fd.get(key); return typeof value === "string" ? value.trim() : ""; };
const num = (fd: FormData, key: string) => { const value = Number(text(fd,key)); return Number.isSafeInteger(value) && value > 0 ? value : null; };
const slugify = (value: string) => value.normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,190);

export async function simpanIdentitasWebsiteAction(fd: FormData): Promise<void> {
  const input = desaFormSchema.parse({
    namaDesa:text(fd,"namaDesa"), kodeDesa:text(fd,"kodeDesa"), kodePos:text(fd,"kodePos"),
    namaKecamatan:text(fd,"namaKecamatan"), kodeKecamatan:text(fd,"kodeKecamatan"),
    namaKabupaten:text(fd,"namaKabupaten"), kodeKabupaten:text(fd,"kodeKabupaten"),
    namaPropinsi:text(fd,"namaPropinsi"), kodePropinsi:text(fd,"kodePropinsi"),
    alamatKantor:text(fd,"alamatKantor"), namaKepalaDesa:text(fd,"namaKepalaDesa"),
    nipKepalaDesa:text(fd,"nipKepalaDesa"), emailDesa:text(fd,"emailDesa"),
    telepon:text(fd,"telepon"), website:text(fd,"website"), logo:text(fd,"logo"),
    tandaTangan:text(fd,"tandaTangan"), stempel:text(fd,"stempel"), penomoranSurat:text(fd,"penomoranSurat") || "2",
  });
  await updateIdentitas(input);
  revalidatePath("/website"); revalidatePath("/website/pengaturan");
  redirect("/website/pengaturan?saved=1");
}

export async function tambahMenuWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman","create"); const villageId = await resolveVillageId(user);
  const nama=text(fd,"nama"), link=text(fd,"link"), linkTipe=text(fd,"linkTipe") || "internal";
  if (!nama || !link || nama.length>50 || link.length>500 || !["internal","eksternal","halaman"].includes(linkTipe)) throw new Error("Data menu tidak valid.");
  const parentId=num(fd,"parentId");
  if (parentId && !(await listMenuPublik(villageId,true)).some((item)=>item.id===parentId)) throw new Error("Menu induk tidak ditemukan pada desa ini.");
  await createMenuPublik(villageId,{nama,link,linkTipe,parentId,urut:Number(text(fd,"urut"))||0,aktif:true});
  revalidatePath("/website/halaman"); redirect("/website/halaman?saved=1");
}

export async function ubahMenuWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman","update"); const villageId = await resolveVillageId(user);
  const id=num(fd,"id"); if(!id) throw new Error("Menu tidak valid.");
  const menu=await listMenuPublik(villageId,true); if(!menu.some((item)=>item.id===id)) throw new Error("Menu tidak ditemukan.");
  const aktif=text(fd,"aktif")==="true";
  await updateMenuPublik(villageId,id,{aktif}); revalidatePath("/website/halaman"); redirect("/website/halaman?saved=1");
}

export async function hapusMenuWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman","delete"); const villageId = await resolveVillageId(user);
  const id=num(fd,"id"); if(!id) throw new Error("Menu tidak valid.");
  const menu=await listMenuPublik(villageId,true); if(!menu.some((item)=>item.id===id)) throw new Error("Menu tidak ditemukan.");
  await deleteMenuPublik(villageId,id); revalidatePath("/website/halaman"); redirect("/website/halaman?deleted=1");
}

export async function tambahDokumenWebsiteAction(fd: FormData): Promise<void> {
  const user=await requirePermission("website-dokumen","create"); const villageId=await resolveVillageId(user);
  const nama=text(fd,"nama"), kategori=text(fd,"kategori") || "informasi_publik";
  if(!nama || nama.length>200) throw new Error("Nama dokumen wajib diisi (maksimal 200 karakter).");
  const slug=slugify(text(fd,"slug") || nama); if(!slug) throw new Error("Slug dokumen tidak valid.");
  if(await dokumenSlugExists(villageId,slug)) throw new Error("Slug dokumen sudah digunakan.");
  const file=fd.get("berkas"); let berkas: string|null=null;
  if(file instanceof File && file.size>0){
    berkas=await simpanBerkasMedia(villageId,{nama:file.name,mime:file.type,ukuran:file.size,isi:new Uint8Array(await file.arrayBuffer())},"dokumen","berkas");
  }
  const tautan=text(fd,"tautan"); if(!berkas && !tautan) throw new Error("Unggah PDF atau isi tautan dokumen.");
  const tahunText=text(fd,"tahun"); const tahun=tahunText ? Number(tahunText) : null;
  if(tahun!==null && (!Number.isInteger(tahun)||tahun<1900||tahun>2200)) throw new Error("Tahun dokumen tidak valid.");
  await createDokumenPublik(villageId,{nama,slug,kategori,jenis:text(fd,"jenis")||null,nomor:text(fd,"nomor")||null,tahun,berkas,tautan:tautan||null,keterangan:text(fd,"keterangan")||null,aktif:fd.get("aktif")==="on"});
  revalidatePath("/website/dokumen"); redirect("/website/dokumen?saved=1");
}

export async function ubahStatusDokumenWebsiteAction(fd: FormData): Promise<void> {
  const user=await requirePermission("website-dokumen","update"); const villageId=await resolveVillageId(user);
  const id=num(fd,"id"); if(!id) throw new Error("Dokumen tidak valid.");
  await updateDokumenPublik(villageId,id,{aktif:text(fd,"aktif")==="true"});
  revalidatePath("/website/dokumen"); redirect("/website/dokumen?saved=1");
}

export async function hapusDokumenWebsiteAction(fd: FormData): Promise<void> {
  const user=await requirePermission("website-dokumen","delete"); const villageId=await resolveVillageId(user);
  const id=num(fd,"id"); if(!id) throw new Error("Dokumen tidak valid.");
  await deleteDokumenPublik(villageId,id); revalidatePath("/website/dokumen"); redirect("/website/dokumen?deleted=1");
}