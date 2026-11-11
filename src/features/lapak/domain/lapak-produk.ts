import { z } from "zod";

/** Schema validasi form produk lapak. */
export const lapakProdukFormSchema = z.object({
  nama: z.string().trim().min(1, "Nama produk wajib diisi").max(200),
  deskripsi: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  harga: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(
      z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, "Harga harus angka valid")
        .nullable(),
    )
    .optional(),
  stok: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().regex(/^\d+$/, "Stok harus angka bulat").nullable())
    .optional(),
  gambar: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  aktif: z.boolean().default(true),
  latitude: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  longitude: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export type LapakProdukFormInput = z.input<typeof lapakProdukFormSchema>;
export type LapakProdukFormValues = z.infer<typeof lapakProdukFormSchema>;

/** DTO untuk produk lapak. */
export interface LapakProdukDTO {
  id: number;
  villageId: number;
  lapakId: number;
  nama: string;
  deskripsi: string | null;
  harga: string;
  stok: number | null;
  gambar: string | null;
  aktif: boolean;
  latitude: string | null;
  longitude: string | null;
}

/** DTO untuk item keranjang belanja. */
export interface KeranjangItemDTO {
  id: number;
  lapakId: number;
  produkId: number;
  jumlah: number;
  produkNama: string;
  produkHarga: string;
  produkGambar: string | null;
}
