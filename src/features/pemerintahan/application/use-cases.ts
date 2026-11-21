import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { getIdentitasDesa } from "@/features/desa/infrastructure/desa-repository";
import {
  clearAtasanPerangkat,
  countAreaByLayer,
  countPerangkatByJabatan,
  deleteAnggota,
  deleteArea,
  deleteDokumen,
  deleteJabatan,
  deleteLembaga,
  deletePerangkat,
  deletePolygon,
  deleteRiwayat,
  getAnggota,
  getArea,
  getDashboardPemerintahan,
  getDokumen,
  getJabatan,
  getJabatanBySlug,
  getLembaga,
  getLembagaStatusPublik,
  getPerangkat,
  getPerangkatByNik,
  getPerangkatByNip,
  getPerangkatStatus,
  getPolygon,
  getProfilDesa,
  getRiwayat,
  insertAnggota,
  insertArea,
  insertDokumen,
  insertJabatan,
  insertLembaga,
  insertPerangkat,
  insertPolygon,
  insertRiwayat,
  listAnggota,
  listArea,
  listBerkasDokumen,
  listDokumenPemerintahan,
  listFotoAnggota,
  listJabatanRingkas,
  listLembaga,
  listPerangkat,
  listPerangkatWilayah,
  listPolygon,
  listRegions,
  listRiwayatJabatan,
  updateAnggota,
  updateArea,
  updateDokumen,
  updateJabatan,
  updateLembaga,
  updatePerangkat,
  updatePolygon,
  updateRiwayat,
  upsertProfilWilayah,
  type AnggotaValues,
  type AreaValues,
  type DokumenValues,
  type LembagaValues,
  type PerangkatValues,
  type PolygonValues,
  type RiwayatValues,
} from "@/features/pemerintahan/infrastructure/pemerintahan-repository";
import { bacaMedia, hapusMedia } from "@/features/publik/infrastructure/media-storage";
import { requirePermission, requireUser } from "@/lib/dal";

async function tenant(resource: string, action: "read" | "update" | "delete" = "read") {
  const user = await requirePermission(resource, action);
  return resolveVillageId(user);
}

export async function getPemerintahanDashboard() {
  const villageId = await tenant("pemerintahan-dashboard");
  const [data, identitas] = await Promise.all([
    getDashboardPemerintahan(villageId),
    getIdentitasDesa(villageId),
  ]);
  const dusunNames = new Set(data.wilayah.map((x) => x.dusun).filter(Boolean));
  // Nomor RT/RW dapat berulang di dusun atau RW berbeda; hitung kombinasi
  // wilayah, bukan hanya label nomor yang sama.
  const rtNames = new Set(
    data.wilayah.filter((x) => x.rt).map((x) => `${x.dusun ?? ""}::${x.rw ?? ""}::${x.rt}`),
  );
  const rwNames = new Set(data.wilayah.filter((x) => x.rw).map((x) => `${x.dusun ?? ""}::${x.rw}`));
  return {
    totalPerangkat: data.totalPerangkat,
    totalLembaga: data.totalLembaga,
    totalBpd: data.totalBpd,
    totalDusun: dusunNames.size,
    totalRt: rtNames.size,
    totalRw: rwNames.size,
    totalArea: data.totalArea,
    perangkat: data.perangkat,
    lembaga: data.lembaga,
    wilayah: { dusun: dusunNames.size, rt: rtNames.size, rw: rwNames.size },
    identitas,
  };
}

export async function getPerangkatDesaData() {
  const villageId = await tenant("perangkat-desa");
  const [rows, jabatan, riwayat, dokumen] = await Promise.all([
    listPerangkat(villageId),
    listJabatanRingkas(villageId),
    listRiwayatJabatan(villageId),
    listDokumenPemerintahan(villageId),
  ]);
  return { rows, jabatan, riwayat, dokumen };
}

export async function simpanPerangkatDesa(id: number | null, input: PerangkatValues) {
  const villageId = await tenant("perangkat-desa", "update");
  if (!input.nama.trim()) throw new Error("Nama perangkat wajib diisi.");
  if (!["aktif", "nonaktif"].includes(input.status ?? ""))
    throw new Error("Status perangkat tidak valid.");
  if (input.nik && !/^\\d{16}$/.test(input.nik))
    throw new Error("NIK harus terdiri dari 16 digit.");
  if (input.nik && (await getPerangkatByNik(villageId, input.nik, id)))
    throw new Error("NIK sudah digunakan oleh perangkat desa lain.");
  if (input.nip && (await getPerangkatByNip(villageId, input.nip, id)))
    throw new Error("NIP sudah digunakan oleh perangkat desa lain.");
  if (
    input.tanggalPengangkatan &&
    input.tanggalPemberhentian &&
    input.tanggalPemberhentian < input.tanggalPengangkatan
  ) {
    throw new Error("Tanggal pemberhentian tidak boleh sebelum tanggal pengangkatan.");
  }
  if (id) {
    const existing = await getPerangkat(villageId, id);
    if (!existing) throw new Error("Perangkat tidak ditemukan pada desa aktif.");
  }
  if (input.jabatanId && !(await getJabatan(villageId, input.jabatanId))) {
    throw new Error("Jabatan tidak ditemukan pada desa aktif.");
  }
  if (input.atasanId === id)
    throw new Error("Perangkat tidak dapat menjadi atasan dirinya sendiri.");
  if (input.atasanId) {
    let currentId: number | null = input.atasanId;
    const visited = new Set<number>();
    while (currentId !== null) {
      if (currentId === id)
        throw new Error("Relasi atasan membentuk siklus pada struktur organisasi.");
      if (visited.has(currentId))
        throw new Error("Struktur organisasi yang dipilih sudah memiliki relasi melingkar.");
      visited.add(currentId);
      const parent = await getPerangkat(villageId, currentId);
      if (!parent) throw new Error("Atasan tidak ditemukan pada desa aktif.");
      if (parent.status !== "aktif")
        throw new Error("Atasan langsung harus merupakan perangkat yang berstatus aktif.");
      currentId = parent.atasanId;
    }
  }
  const data = { ...input, foto: input.foto || null };
  if (id) {
    const before = await getPerangkat(villageId, id);
    await updatePerangkat(villageId, id, data);
    if (before?.foto && before.foto !== data.foto) await hapusMedia(before.foto);
  } else await insertPerangkat(villageId, data);
}

export async function hapusPerangkatDesa(id: number) {
  const villageId = await tenant("perangkat-desa", "delete");
  const person = await getPerangkat(villageId, id);
  const docs = await listBerkasDokumen(villageId, { perangkatId: id });
  await clearAtasanPerangkat(villageId, id);
  await deletePerangkat(villageId, id);
  if (person?.foto) await hapusMedia(person.foto);
  await Promise.all(docs.map((doc) => hapusMedia(doc.berkas)));
}

export async function getLembagaDesaData() {
  const villageId = await tenant("lembaga-desa");
  const [rows, anggota, dokumen] = await Promise.all([
    listLembaga(villageId),
    listAnggota(villageId),
    listDokumenPemerintahan(villageId),
  ]);
  return { rows, anggota, dokumen };
}

export async function simpanLembagaDesa(id: number | null, input: LembagaValues) {
  const villageId = await tenant("lembaga-desa", "update");
  if (!input.nama.trim()) throw new Error("Nama lembaga wajib diisi.");
  if (!["bpd", "lpm", "pkk", "karang-taruna", "bumdes", "lainnya"].includes(input.jenis ?? ""))
    throw new Error("Jenis lembaga tidak valid.");
  if (!["aktif", "nonaktif"].includes(input.status ?? ""))
    throw new Error("Status lembaga tidak valid.");
  if (
    input.masaBaktiMulai &&
    input.masaBaktiSelesai &&
    input.masaBaktiSelesai < input.masaBaktiMulai
  ) {
    throw new Error("Akhir masa bakti tidak boleh sebelum tanggal mulai.");
  }
  if (id) {
    if (!(await getLembaga(villageId, id)))
      throw new Error("Lembaga tidak ditemukan pada desa aktif.");
    await updateLembaga(villageId, id, input);
  } else await insertLembaga(villageId, input);
}

export async function hapusLembagaDesa(id: number) {
  const villageId = await tenant("lembaga-desa", "delete");
  const members = await listFotoAnggota(villageId, id);
  const docs = await listBerkasDokumen(villageId, { lembagaId: id });
  await deleteLembaga(villageId, id);
  await Promise.all([
    ...members.flatMap((x) => (x.foto ? [hapusMedia(x.foto)] : [])),
    ...docs.map((x) => hapusMedia(x.berkas)),
  ]);
}

export async function simpanAnggotaLembaga(id: number | null, input: AnggotaValues) {
  const villageId = await tenant("lembaga-desa", "update");
  if (!(await getLembaga(villageId, input.lembagaId)))
    throw new Error("Lembaga tidak ditemukan pada desa aktif.");
  if (!input.nama.trim()) throw new Error("Nama anggota wajib diisi.");
  if (input.periodeMulai && input.periodeSelesai && input.periodeSelesai < input.periodeMulai) {
    throw new Error("Akhir periode anggota tidak boleh sebelum tanggal mulai.");
  }
  if (id) {
    const existing = await getAnggota(villageId, id);
    if (!existing) throw new Error("Anggota tidak ditemukan pada desa aktif.");
    const before = await getAnggota(villageId, id);
    await updateAnggota(villageId, id, input);
    if (before?.foto && before.foto !== input.foto) await hapusMedia(before.foto);
  } else await insertAnggota(villageId, input);
}

export async function hapusAnggotaLembaga(id: number) {
  const villageId = await tenant("lembaga-desa", "delete");
  const member = await getAnggota(villageId, id);
  await deleteAnggota(villageId, id);
  if (member?.foto) await hapusMedia(member.foto);
}

export async function getWilayahPemerintahanData() {
  const villageId = await tenant("wilayah");
  const [rows, shapes, layers, officials, profil] = await Promise.all([
    listRegions(villageId),
    listArea(villageId),
    listPolygon(villageId),
    listPerangkatWilayah(villageId),
    getProfilDesa(villageId),
  ]);
  return { rows, shapes, layers, officials, profil };
}

export async function simpanAreaPeta(id: number | null, input: AreaValues) {
  const villageId = await tenant("wilayah", "update");
  if (!input.nama.trim()) throw new Error("Nama area GIS wajib diisi.");
  let fotoSebelumnya: string | null = null;
  if (id) {
    const existing = await getArea(villageId, id);
    if (!existing) throw new Error("Area GIS tidak ditemukan pada desa aktif.");
    fotoSebelumnya = existing.foto;
  }
  if (input.refPolygon && !(await getPolygon(villageId, input.refPolygon))) {
    throw new Error("Layer polygon tidak ditemukan pada desa aktif.");
  }
  if (input.path) {
    let geo: { type?: string; coordinates?: unknown };
    try {
      geo = JSON.parse(input.path) as { type?: string; coordinates?: unknown };
    } catch {
      throw new Error("Format GeoJSON tidak valid.");
    }
    if (
      !geo ||
      geo.type !== "Polygon" ||
      !Array.isArray(geo.coordinates) ||
      !geo.coordinates.length
    ) {
      throw new Error("Geometri harus berupa GeoJSON Polygon yang valid.");
    }
    const validRing = (ring: unknown): boolean => {
      if (!Array.isArray(ring) || ring.length < 4) return false;
      const validPoint = (point: unknown) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1])) &&
        Number(point[0]) >= -180 &&
        Number(point[0]) <= 180 &&
        Number(point[1]) >= -90 &&
        Number(point[1]) <= 90;
      if (!ring.every(validPoint)) return false;
      const first = ring[0] as unknown[];
      const last = ring[ring.length - 1] as unknown[];
      return Number(first[0]) === Number(last[0]) && Number(first[1]) === Number(last[1]);
    };
    if (!(geo.coordinates as unknown[]).every(validRing)) {
      throw new Error(
        "Setiap ring Polygon harus memiliki minimal empat titik, koordinat longitude/latitude valid, dan titik awal yang sama dengan titik akhir.",
      );
    }
  }
  if (id) {
    await updateArea(villageId, id, input);
    if (fotoSebelumnya && fotoSebelumnya !== input.foto) await hapusMedia(fotoSebelumnya);
  } else await insertArea(villageId, input);
}

export async function hapusAreaPeta(id: number) {
  const villageId = await tenant("wilayah", "delete");
  const area = await getArea(villageId, id);
  await deleteArea(villageId, id);
  if (area?.foto) await hapusMedia(area.foto);
}

export async function simpanJabatanPerangkat(id: number | null, nama: string, urut: number) {
  const villageId = await tenant("perangkat-desa", "update");
  if (!nama.trim()) throw new Error("Nama jabatan wajib diisi.");
  if (id && !(await getJabatan(villageId, id)))
    throw new Error("Jabatan tidak ditemukan pada desa aktif.");
  const slug = nama
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) throw new Error("Nama jabatan tidak valid.");
  const duplicate = await getJabatanBySlug(villageId, slug);
  if (duplicate && duplicate.id !== id)
    throw new Error("Jabatan dengan nama tersebut sudah terdaftar.");
  if (id) await updateJabatan(villageId, id, { nama, slug, urut });
  else await insertJabatan(villageId, { nama, slug, urut });
}

export async function hapusJabatanPerangkat(id: number) {
  const villageId = await tenant("perangkat-desa", "delete");
  if (await countPerangkatByJabatan(villageId, id)) {
    throw new Error(
      "Jabatan masih dipakai perangkat desa. Pindahkan jabatan perangkat terlebih dahulu.",
    );
  }
  await deleteJabatan(villageId, id);
}

export async function simpanRiwayatJabatan(id: number | null, input: RiwayatValues) {
  const villageId = await tenant("perangkat-desa", "update");
  if (!(await getPerangkat(villageId, input.perangkatId)))
    throw new Error("Perangkat tidak ditemukan pada desa aktif.");
  if (!input.jabatan.trim()) throw new Error("Nama jabatan pada riwayat wajib diisi.");
  if (input.mulai && input.selesai && input.selesai < input.mulai)
    throw new Error("Tanggal akhir riwayat tidak boleh sebelum tanggal mulai.");
  if (id) {
    if (!(await getRiwayat(villageId, id)))
      throw new Error("Riwayat jabatan tidak ditemukan pada desa aktif.");
    await updateRiwayat(villageId, id, input);
  } else await insertRiwayat(villageId, input);
}

export async function hapusRiwayatJabatan(id: number) {
  const villageId = await tenant("perangkat-desa", "delete");
  await deleteRiwayat(villageId, id);
}

export async function unggahDokumenPemerintahan(input: DokumenValues) {
  if (Boolean(input.perangkatId) === Boolean(input.lembagaId)) {
    throw new Error("Dokumen harus terhubung ke tepat satu perangkat atau lembaga.");
  }
  if (!input.judul.trim() || !input.berkas.trim()) {
    throw new Error("Judul dan berkas dokumen wajib diisi.");
  }
  const villageId = await tenant(input.perangkatId ? "perangkat-desa" : "lembaga-desa", "update");
  if (input.perangkatId && !(await getPerangkat(villageId, input.perangkatId))) {
    throw new Error("Perangkat tidak ditemukan pada desa aktif.");
  }
  if (input.lembagaId && !(await getLembaga(villageId, input.lembagaId))) {
    throw new Error("Lembaga tidak ditemukan pada desa aktif.");
  }
  await insertDokumen(villageId, input);
}

export async function hapusDokumenPemerintahan(id: number) {
  const user = await requireUser();
  const villageId = await resolveVillageId(user);
  const document = await getDokumen(villageId, id);
  if (!document) return;
  await requirePermission(document.perangkatId ? "perangkat-desa" : "lembaga-desa", "delete");
  await deleteDokumen(villageId, id);
  await hapusMedia(document.berkas);
}

export async function simpanLayerPeta(id: number | null, input: PolygonValues) {
  const villageId = await tenant("wilayah", "update");
  if (!input.nama.trim()) throw new Error("Nama layer wajib diisi.");
  if (!input.color || !/^#[0-9a-fA-F]{6}$/.test(input.color))
    throw new Error("Warna layer harus berupa kode HEX.");
  if (id && !(await getPolygon(villageId, id)))
    throw new Error("Layer peta tidak ditemukan pada desa aktif.");
  const values = {
    nama: input.nama,
    color: input.color,
    enabled: input.enabled,
    sortOrder: input.sortOrder,
  };
  if (id) await updatePolygon(villageId, id, values);
  else await insertPolygon(villageId, { ...values, tipe: 0, parrent: 0 });
}

export async function hapusLayerPeta(id: number) {
  const villageId = await tenant("wilayah", "delete");
  if (await countAreaByLayer(villageId, id)) {
    throw new Error(
      "Layer masih dipakai area peta. Pindahkan atau hapus area terkait terlebih dahulu.",
    );
  }
  await deletePolygon(villageId, id);
}

export async function ubahMetadataDokumenPemerintahan(
  id: number,
  input: { judul: string; nomor: string | null; tanggal: string | null; tampilPublik: boolean },
) {
  const user = await requireUser();
  const villageId = await resolveVillageId(user);
  const document = await getDokumen(villageId, id);
  if (!document) throw new Error("Dokumen tidak ditemukan.");
  await requirePermission(document.perangkatId ? "perangkat-desa" : "lembaga-desa", "update");
  await updateDokumen(villageId, id, { ...input, berkas: document.berkas });
}

/**
 * Ambil isi dokumen pemerintahan dengan kontrol akses yang sama seperti route
 * unduhan: dokumen publik hanya terbuka bila pemiliknya masih tampil, dokumen
 * privat wajib melewati permission dan desa sesi yang sama.
 *
 * Mengembalikan `null` untuk semua kegagalan agar route tidak membocorkan
 * keberadaan dokumen tenant lain.
 */
export async function unduhDokumenPemerintahanData(
  villageId: number,
  documentId: number,
): Promise<{ id: number; isi: Buffer; ekstensi: string } | null> {
  const document = await getDokumen(villageId, documentId);
  if (!document) return null;

  // Dokumen publik tetap harus mengikuti status publik pemiliknya. Flag
  // dokumen saja tidak boleh membuka berkas milik perangkat/lembaga tersembunyi.
  if (Boolean(document.perangkatId) === Boolean(document.lembagaId)) return null;
  if (document.tampilPublik) {
    if (document.perangkatId) {
      const owner = await getPerangkatStatus(villageId, document.perangkatId);
      if (owner?.status !== "aktif") return null;
    } else if (document.lembagaId) {
      const owner = await getLembagaStatusPublik(villageId, document.lembagaId);
      if (owner?.status !== "aktif" || !owner.tampilPublik) return null;
    }
  } else {
    const resource = document.perangkatId ? "perangkat-desa" : "lembaga-desa";
    const user = await requirePermission(resource, "read");
    const sesiVillageId = await resolveVillageId(user);
    if (sesiVillageId !== villageId) return null;
  }

  try {
    const isi = await bacaMedia(document.berkas);
    const ekstensi = document.berkas.split(".").pop()?.toLowerCase() ?? "bin";
    return { id: document.id, isi, ekstensi };
  } catch {
    return null;
  }
}

export async function simpanProfilWilayah(input: {
  luasWilayah: string | null;
  batasUtara: string | null;
  batasSelatan: string | null;
  batasTimur: string | null;
  batasBarat: string | null;
  ketinggian: string | null;
  suhuRataRata: string | null;
  curahHujan: string | null;
  topografi: string | null;
}) {
  const villageId = await tenant("wilayah", "update");
  if (
    input.luasWilayah &&
    (!Number.isFinite(Number(input.luasWilayah)) || Number(input.luasWilayah) < 0)
  ) {
    throw new Error("Luas wilayah harus berupa angka positif.");
  }
  await upsertProfilWilayah(villageId, input);
}
