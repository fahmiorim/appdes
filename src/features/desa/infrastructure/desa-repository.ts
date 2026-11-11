import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { villageDomains, villages } from "@/db/schema";
import type { DesaFormInput } from "@/features/desa/domain/desa";
import type { BarisDesa } from "@/features/desa/domain/tenant";

/** Perbarui identitas desa berdasarkan id. */
export async function updateIdentitasDesa(id: number, input: DesaFormInput): Promise<void> {
  await db
    .update(villages)
    .set({
      name: blankToNull(input.namaDesa),
      code: blankToNull(input.kodeDesa),
      postalCode: blankToNull(input.kodePos),
      district: blankToNull(input.namaKecamatan),
      districtCode: blankToNull(input.kodeKecamatan),
      regency: blankToNull(input.namaKabupaten),
      regencyCode: blankToNull(input.kodeKabupaten),
      province: blankToNull(input.namaPropinsi),
      provinceCode: blankToNull(input.kodePropinsi),
      officeAddress: blankToNull(input.alamatKantor),
      headName: blankToNull(input.namaKepalaDesa),
      headNip: blankToNull(input.nipKepalaDesa),
      email: blankToNull(input.emailDesa),
      phone: blankToNull(input.telepon),
      website: blankToNull(input.website),
      logo: blankToNull(input.logo),
      signature: blankToNull(input.tandaTangan),
      stamp: blankToNull(input.stempel),
      penomoranSurat: input.penomoranSurat,
    })
    .where(eq(villages.id, id));
}

/** Ubah teks kosong menjadi `NULL`. */
function blankToNull(value: string): string | null {
  return value === "" ? null : value;
}

/**
 * Identitas desa. Nama field mengikuti kosakata domain aplikasi (Indonesia);
 * pemetaan dari kolom basis data (Inggris) terjadi di sini agar lapisan atas
 * tidak perlu tahu detail penyimpanan.
 */
export interface IdentitasDesa {
  id: number;
  namaDesa: string | null;
  kodeDesa: string | null;
  kodePos: string | null;
  namaKecamatan: string | null;
  kodeKecamatan: string | null;
  namaKabupaten: string | null;
  kodeKabupaten: string | null;
  namaPropinsi: string | null;
  kodePropinsi: string | null;
  alamatKantor: string | null;
  namaKepalaDesa: string | null;
  nipKepalaDesa: string | null;
  emailDesa: string | null;
  telepon: string | null;
  website: string | null;
  logo: string | null;
  /** Jalur media gambar tanda tangan Kepala Desa. */
  tandaTangan: string | null;
  /** Jalur media gambar stempel desa. */
  stempel: string | null;
  /** Domain publik desa (host tanpa protokol), bila sudah dipetakan. */
  domain: string | null;
  /** Mode penomoran surat layanan (1–4). */
  penomoranSurat: number;
}

const identitasColumns = {
  id: villages.id,
  namaDesa: villages.name,
  kodeDesa: villages.code,
  kodePos: villages.postalCode,
  namaKecamatan: villages.district,
  kodeKecamatan: villages.districtCode,
  namaKabupaten: villages.regency,
  kodeKabupaten: villages.regencyCode,
  namaPropinsi: villages.province,
  kodePropinsi: villages.provinceCode,
  alamatKantor: villages.officeAddress,
  namaKepalaDesa: villages.headName,
  nipKepalaDesa: villages.headNip,
  emailDesa: villages.email,
  telepon: villages.phone,
  website: villages.website,
  logo: villages.logo,
  tandaTangan: villages.signature,
  stempel: villages.stamp,
  domain: villages.domain,
  penomoranSurat: villages.penomoranSurat,
};

/** Identitas desa berdasarkan tenant. */
export async function getIdentitasDesa(villageId: number): Promise<IdentitasDesa | null> {
  const [row] = await db
    .select(identitasColumns)
    .from(villages)
    .where(eq(villages.id, villageId))
    .limit(1);
  return row ?? null;
}

/** Nama desa berdasarkan tenant, `null` bila desa tidak ditemukan. */
export async function getNamaDesa(villageId: number): Promise<string | null> {
  const [row] = await db
    .select({ name: villages.name })
    .from(villages)
    .where(eq(villages.id, villageId))
    .limit(1);
  return row?.name ?? null;
}

/** Id desa aktif pertama. Hanya untuk fallback mode satu-desa/administrasi. */
export async function getFirstVillageId(): Promise<number | null> {
  const [row] = await db
    .select({ id: villages.id })
    .from(villages)
    .where(eq(villages.active, true))
    .orderBy(asc(villages.id))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Daftar desa beserta seluruh domain/alias dan slug subdomainnya.
 *
 * Satu desa dapat muncul beberapa kali (satu baris per alias). `villages.domain`
 * tetap disertakan sebagai cermin domain utama agar instalasi lama tetap
 * ter-resolve meski baris `village_domains` belum lengkap.
 *
 * Desa nonaktif tidak dipetakan dari host mana pun.
 */
export async function listVillageDomains(): Promise<BarisDesa[]> {
  const [desa, alias] = await Promise.all([
    db
      .select({ id: villages.id, domain: villages.domain, slug: villages.slug })
      .from(villages)
      .where(eq(villages.active, true))
      .orderBy(asc(villages.id)),
    db
      .select({ villageId: villageDomains.villageId, domain: villageDomains.domain })
      .from(villageDomains)
      .innerJoin(villages, eq(villageDomains.villageId, villages.id))
      .where(eq(villages.active, true)),
  ]);

  const slugPerDesa = new Map(desa.map((baris) => [baris.id, baris.slug]));
  const hasil: BarisDesa[] = desa.map((baris) => ({
    id: baris.id,
    domain: baris.domain,
    slug: baris.slug,
  }));

  for (const baris of alias) {
    hasil.push({
      id: baris.villageId,
      domain: baris.domain,
      slug: slugPerDesa.get(baris.villageId) ?? null,
    });
  }

  return hasil;
}
