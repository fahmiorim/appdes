import {
  insertKomentar,
  listKomentarPublik,
  type FilterKomentar,
} from "@/features/kontak/infrastructure/komentar-repository";

/**
 * Use case untuk komentar publik.
 */

export interface DaftarKomentarParams {
  villageId: number;
  filter?: FilterKomentar;
}

export interface KirimKomentarParams {
  villageId: number;
  namaPenulis: string;
  isi: string;
}

/**
 * Ambil daftar komentar publik aktif untuk halaman tertentu.
 */
export async function daftarKomentarPublik(params: DaftarKomentarParams) {
  const defaultFilter: FilterKomentar = {
    halaman: "kontak",
    page: 1,
    pageSize: 10,
  };
  const filter = { ...defaultFilter, ...params.filter };

  return listKomentarPublik(params.villageId, filter);
}

/**
 * Simpan komentar baru dari warga.
 */
export async function kirimKomentarPublik(params: KirimKomentarParams): Promise<number> {
  return insertKomentar(params.villageId, {
    namaPenulis: params.namaPenulis,
    isi: params.isi,
  });
}
