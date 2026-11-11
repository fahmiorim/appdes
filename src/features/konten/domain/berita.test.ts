import { describe, expect, it } from "vitest";

import {
  beritaFormSchema,
  kategoriBeritaFormSchema,
  slugBerita,
  slugKategoriBerita,
  tanggalTerbitEfektif,
} from "./berita";

const BERITA_VALID = {
  judul: "Musyawarah Desa Penetapan APBDes 2027",
  kategoriId: "none",
  ringkasan: "Ringkasan singkat.",
  isi: "<p>Isi berita.</p>",
  status: "published",
  terbitPada: "",
  headline: false,
  slider: false,
  bolehKomentar: true,
} as const;

describe("beritaFormSchema", () => {
  it("menerima berita valid dan menerjemahkan pilihan kosong menjadi null", () => {
    const hasil = beritaFormSchema.safeParse(BERITA_VALID);

    expect(hasil.success).toBe(true);
    if (!hasil.success) return;

    expect(hasil.data.kategoriId).toBeNull();
    expect(hasil.data.terbitPada).toBeNull();
    expect(hasil.data.status).toBe("published");
  });

  it("menolak judul dan isi yang kosong", () => {
    const tanpaJudul = beritaFormSchema.safeParse({ ...BERITA_VALID, judul: "   " });
    const tanpaIsi = beritaFormSchema.safeParse({ ...BERITA_VALID, isi: "  " });

    expect(tanpaJudul.success).toBe(false);
    expect(tanpaIsi.success).toBe(false);
  });

  it("menolak status dan tanggal yang tidak dikenal", () => {
    expect(beritaFormSchema.safeParse({ ...BERITA_VALID, status: "arsip" }).success).toBe(false);
    expect(beritaFormSchema.safeParse({ ...BERITA_VALID, terbitPada: "2026-13-40" }).success).toBe(
      false,
    );
  });

  it("menerima jadwal terbit ISO", () => {
    const hasil = beritaFormSchema.safeParse({ ...BERITA_VALID, terbitPada: "2027-01-02" });

    expect(hasil.success).toBe(true);
    if (hasil.success) expect(hasil.data.terbitPada).toBe("2027-01-02");
  });
});

describe("slugBerita", () => {
  it("membentuk slug dari judul dan melucuti diakritik", () => {
    expect(slugBerita("Musyawarah Desa — APBDes 2027")).toBe("musyawarah-desa-apbdes-2027");
    expect(slugBerita("Café & Réunion")).toBe("cafe-reunion");
  });

  it("memakai awalan berita bila judul tidak menyisakan karakter sah", () => {
    expect(slugBerita("!!!")).toBe("berita");
    expect(slugKategoriBerita("—")).toBe("kategori");
  });

  it("menyisakan ruang akhiran unik agar slug kategori tetap muat kolom 100", () => {
    const dasar = slugKategoriBerita("a".repeat(200));

    expect(dasar.length).toBeLessThanOrEqual(96);
    expect(`${dasar}-200`.length).toBeLessThanOrEqual(100);
  });
});

describe("kategoriBeritaFormSchema", () => {
  it("menerima kategori valid dan mengubah teks urutan menjadi angka", () => {
    const hasil = kategoriBeritaFormSchema.safeParse({
      nama: "Kegiatan Desa",
      urut: "3",
      aktif: true,
    });

    expect(hasil.success).toBe(true);
    if (hasil.success) expect(hasil.data.urut).toBe(3);
  });

  it("menolak nama kosong dan urutan di luar batas", () => {
    expect(kategoriBeritaFormSchema.safeParse({ nama: "", urut: "0", aktif: true }).success).toBe(
      false,
    );
    expect(
      kategoriBeritaFormSchema.safeParse({ nama: "A", urut: "1000", aktif: true }).success,
    ).toBe(false);
  });
});

describe("tanggalTerbitEfektif", () => {
  const sekarang = new Date("2026-10-23T09:00:00");

  it("memakai jadwal bila diisi", () => {
    const hasil = tanggalTerbitEfektif("published", "2026-11-01", sekarang);

    expect(hasil?.getFullYear()).toBe(2026);
    expect(hasil?.getMonth()).toBe(10);
    expect(hasil?.getDate()).toBe(1);
  });

  it("menerbitkan sekarang bila status terbit tanpa jadwal", () => {
    expect(tanggalTerbitEfektif("published", null, sekarang)?.getTime()).toBe(sekarang.getTime());
  });

  it("membuang milidetik agar jadwal tidak dibulatkan ke detik berikutnya", () => {
    const berMilidetik = new Date("2026-10-23T09:00:00.750");
    const hasil = tanggalTerbitEfektif("published", null, berMilidetik);

    expect(hasil?.getMilliseconds()).toBe(0);
    expect(hasil?.getTime()).toBe(new Date("2026-10-23T09:00:00").getTime());
  });

  it("draf tanpa jadwal tidak dianggap terbit", () => {
    expect(tanggalTerbitEfektif("draft", null, sekarang)).toBeNull();
  });
});
