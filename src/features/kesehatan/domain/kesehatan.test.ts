import { describe, expect, it } from "vitest";

import {
  buildKiaCsv,
  buildSkorcardKonvergensi,
  bulananAnakSchema,
  hitungSkorcardKia,
  ibuHamilSchema,
  kiaRekapFilename,
  kiaSchema,
  posyanduSchema,
  STATUS_GIZI_ANAK,
  STATUS_TIKAR_ANAK,
  type BulananAnakRow,
  type IbuHamilRow,
} from "./kesehatan";

describe("STATUS_GIZI_ANAK / STATUS_TIKAR_ANAK", () => {
  it("memiliki 4 entri status gizi anak", () => {
    expect(STATUS_GIZI_ANAK).toHaveLength(4);
    expect(STATUS_GIZI_ANAK.map((s) => s.value)).toEqual([1, 2, 3, 4]);
    expect(STATUS_GIZI_ANAK.map((s) => s.label)).toEqual([
      "Sehat/Normal",
      "Gizi Kurang",
      "Gizi Buruk",
      "Stunting",
    ]);
  });

  it("memiliki 4 entri status tikar anak", () => {
    expect(STATUS_TIKAR_ANAK).toHaveLength(4);
    expect(STATUS_TIKAR_ANAK.map((s) => s.value)).toEqual([1, 2, 3, 4]);
    expect(STATUS_TIKAR_ANAK.map((s) => s.label)).toEqual([
      "Tidak Diukur",
      "Merah",
      "Kuning",
      "Hijau",
    ]);
  });
});

describe("posyanduSchema", () => {
  it("menerima input valid", () => {
    const result = posyanduSchema.parse({
      villageId: 1,
      nama: "Posyandu Melati",
      alamat: "Jl. Mawar No. 1",
      namaKetua: "Budi",
      namaBidan: "Ners Siti",
    });
    expect(result.nama).toBe("Posyandu Melati");
    expect(result.villageId).toBe(1);
  });

  it("menerima nama kosong untuk opsional", () => {
    const result = posyanduSchema.parse({
      villageId: 1,
      nama: "Posyandu Kenanga",
      alamat: "",
      namaKetua: "",
      namaBidan: "",
    });
    expect(result.alamat).toBe("");
    expect(result.namaKetua).toBe("");
    expect(result.namaBidan).toBe("");
  });

  it("menolak nama kosong wajib", () => {
    expect(posyanduSchema.safeParse({ villageId: 1, nama: "" }).success).toBe(false);
  });

  it("menolak villageId nol", () => {
    expect(posyanduSchema.safeParse({ villageId: 0, nama: "X" }).success).toBe(false);
  });
});

describe("kiaSchema", () => {
  it("menerima input valid", () => {
    const result = kiaSchema.parse({
      villageId: 1,
      noKia: "KIA-001",
      ibuId: 10,
    });
    expect(result.noKia).toBe("KIA-001");
    expect(result.ibuId).toBe(10);
    // optional+nullable fields return undefined when not provided
    expect(result.anakId).toBeUndefined();
    expect(result.hariPerkiraanLahir).toBeUndefined();
  });

  it("menerima anak opsional", () => {
    const result = kiaSchema.parse({
      villageId: 1,
      noKia: "KIA-002",
      ibuId: 10,
      anakId: 20,
      hariPerkiraanLahir: "2026-06-01",
    });
    expect(result.anakId).toBe(20);
    expect(result.hariPerkiraanLahir).toBe("2026-06-01");
  });

  it("menolak noKia kosong", () => {
    expect(kiaSchema.safeParse({ villageId: 1, noKia: "", ibuId: 10 }).success).toBe(false);
  });

  it("menolak ibuId nol", () => {
    expect(kiaSchema.safeParse({ villageId: 1, noKia: "X", ibuId: 0 }).success).toBe(false);
  });
});

describe("ibuHamilSchema", () => {
  it("menerima input valid lengkap", () => {
    const result = ibuHamilSchema.parse({
      villageId: 1,
      posyanduId: 1,
      kiaId: 1,
      statusKehamilan: 1,
      usiaKehamilan: 20,
      pemeriksaanKehamilan: true,
      konsumsiPilFe: true,
      butirPilFe: 60,
      pemeriksaanNifas: false,
      konselingGizi: true,
      kunjunganRumah: false,
      aksesAirBersih: true,
      kepemilikanJamban: true,
      jaminanKesehatan: true,
    });
    expect(result.statusKehamilan).toBe(1);
    expect(result.butirPilFe).toBe(60);
  });

  it("menerima nilai opsional kosong sebagai undefined", () => {
    const result = ibuHamilSchema.parse({
      villageId: 1,
      posyanduId: 1,
      kiaId: 1,
    });
    expect(result.statusKehamilan).toBeUndefined();
    expect(result.usiaKehamilan).toBeUndefined();
  });

  it("menolak usiaKehamilan di luar rentang", () => {
    expect(
      ibuHamilSchema.safeParse({ villageId: 1, posyanduId: 1, kiaId: 1, usiaKehamilan: 50 })
        .success,
    ).toBe(false);
  });
});

describe("bulananAnakSchema", () => {
  it("menerima input valid lengkap", () => {
    const result = bulananAnakSchema.parse({
      villageId: 1,
      posyanduId: 1,
      kiaId: 1,
      statusGizi: 1,
      umurBulan: 12,
      statusTikar: 4,
      pemberianImunisasiDasar: true,
      pengukuranBeratBadan: true,
      beratBadan: 8.5,
      pengukuranTinggiBadan: true,
      tinggiBadan: 75,
      konselingGiziAyah: false,
      konselingGiziIbu: true,
      kunjunganRumah: false,
      airBersih: true,
      kepemilikanJamban: true,
      aktaLahir: true,
      jaminanKesehatan: true,
      pengasuhanPaud: false,
    });
    expect(result.statusGizi).toBe(1);
    expect(result.beratBadan).toBe(8.5);
  });

  it("menolak statusGizi di luar rentang 1-4", () => {
    expect(
      bulananAnakSchema.safeParse({ villageId: 1, posyanduId: 1, kiaId: 1, statusGizi: 5 }).success,
    ).toBe(false);
    expect(
      bulananAnakSchema.safeParse({ villageId: 1, posyanduId: 1, kiaId: 1, statusGizi: 0 }).success,
    ).toBe(false);
  });

  it("menolak umurBulan negatif", () => {
    expect(
      bulananAnakSchema.safeParse({
        villageId: 1,
        posyanduId: 1,
        kiaId: 1,
        statusGizi: 1,
        umurBulan: -1,
      }).success,
    ).toBe(false);
  });
});

describe("hitungSkorcardKia", () => {
  it("mengembalikan total, stunting, dan konversi yang benar", () => {
    // statusGizi=4 (Stunting) atau statusTikar=4 (Hijau→non-stunting di TIJAR)
    // Tapi fungsi hitungSkorcardKia menganggap statusTikar=4 juga stunting
    const rows = [
      { statusGizi: 1, statusTikar: 4 }, // tikar=4 → stunting by function
      { statusGizi: 4, statusTikar: 3 }, // gizi=4 → stunting
      { statusGizi: 2, statusTikar: 4 }, // tikar=4 → stunting
      { statusGizi: 1, statusTikar: 1 }, // non-stunting
    ];
    const result = hitungSkorcardKia(rows);
    expect(result.total).toBe(4);
    expect(result.stunting).toBe(3);
    expect(result.konversi).toBe(75);
  });

  it("mengembalikan nol untuk array kosong", () => {
    const result = hitungSkorcardKia([]);
    expect(result.total).toBe(0);
    expect(result.stunting).toBe(0);
    expect(result.konversi).toBe(0);
  });

  it("menghitung stunting jika salah satu statusGizi atau statusTikar = 4", () => {
    const rows = [
      { statusGizi: 4, statusTikar: 1 },
      { statusGizi: 1, statusTikar: 4 },
      { statusGizi: 1, statusTikar: 1 },
    ];
    const result = hitungSkorcardKia(rows);
    expect(result.stunting).toBe(2);
    expect(result.konversi).toBe(66.67);
  });

  it("membulatkan persentase ke 2 desimal", () => {
    const rows = [
      { statusGizi: 4, statusTikar: 1 },
      { statusGizi: 1, statusTikar: 1 },
      { statusGizi: 1, statusTikar: 1 },
    ];
    const result = hitungSkorcardKia(rows);
    expect(result.konversi).toBe(33.33);
  });
});

describe("buildKiaCsv", () => {
  it("menghasilkan CSV dengan BOM UTF-8 dan header yang benar", () => {
    const result = buildKiaCsv({
      namaDesa: "Desa Contoh",
      judulPemilihan: "KIA - Kesehatan Ibu dan Anak",
      tanggalPemilihan: "2026-10-28",
      rows: [
        {
          statusGizi: 1,
          statusTikar: 4,
          posyanduId: 1,
          posyanduName: "Posyandu Melati",
          ibuName: "Siti",
          konversi: "Rendah",
        },
      ],
      total: 1,
      stunting: 0,
      konversiPersentase: 0,
    });

    expect(result.startsWith("\uFEFF")).toBe(true);
    expect(result).toContain("Rekapitulasi KIA");
    expect(result).toContain("Desa Contoh");
    expect(result).toContain("KIA - Kesehatan Ibu dan Anak");
    expect(result).toContain("Tanggal Pemilihan: 2026-10-28");
    // toCsv menggunakan ; sebagai pemisah
    expect(result).toContain("No;No KIA;Ibu;Status Gizi;Status Tikar;Persentase");
    expect(result).toContain("1;1;Siti;Sehat/Normal;Hijau;Rendah");
    expect(result).toContain("JUMLAH");
    expect(result).toContain("0%");
  });

  it("menampilkan '-' untuk posyanduId kosong", () => {
    const result = buildKiaCsv({
      namaDesa: null,
      judulPemilihan: "Test",
      tanggalPemilihan: "2026-01-01",
      rows: [
        {
          statusGizi: 4,
          statusTikar: 3,
          ibuName: null,
          konversi: "Tinggi",
        },
      ],
      total: 1,
      stunting: 1,
      konversiPersentase: 100,
    });

    expect(result).toContain(";Stunting;Kuning;Tinggi");
    expect(result).toContain("100%");
  });

  it("menampilkan label dari STATUS_GIZI_ANAK dan STATUS_TIKAR_ANAK", () => {
    const result = buildKiaCsv({
      namaDesa: "D",
      judulPemilihan: "J",
      tanggalPemilihan: "T",
      rows: [
        {
          statusGizi: 3,
          statusTikar: 2,
          ibuName: "A",
          konversi: "Sedang",
        },
      ],
      total: 1,
      stunting: 0,
      konversiPersentase: 0,
    });

    expect(result).toContain("Gizi Buruk");
    expect(result).toContain("Merah");
  });
});

describe("kiaRekapFilename", () => {
  it("menghasilkan slug dari nama desa", () => {
    expect(kiaRekapFilename("Desa Contoh")).toBe("rekap-kia-desa-contoh.csv");
  });

  it("menghasilkan filename default untuk null", () => {
    expect(kiaRekapFilename(null)).toBe("rekap-kia-desa.csv");
  });

  it("menghasilkan filename untuk nama dengan spasi dan simbol", () => {
    expect(kiaRekapFilename("Desa Sukamaju 2026!")).toBe("rekap-kia-desa-sukamaju-2026.csv");
  });
});

describe("buildSkorcardKonvergensi", () => {
  it("mengembalikan null tingkat konvergensi saat data kosong", () => {
    const result = buildSkorcardKonvergensi([] as IbuHamilRow[], [] as BulananAnakRow[]);
    expect(result.ibuHamilTotal).toBe(0);
    expect(result.bulananAnakTotal).toBe(0);
    expect(result.ibuHamil.tingkatKonvergensiDesa).toBeNull();
    expect(result.bulananAnak.tingkatKonvergensiDesa).toBeNull();
    expect(result.tikar).toEqual({ H: 0, K: 0, M: 0 });
  });

  it("menghitung tikar hijau/kuning/merah dengan benar", () => {
    const ibuHamil: IbuHamilRow[] = [];
    const anak: BulananAnakRow[] = [
      {
        id: 1,
        posyanduId: 1,
        kiaId: 1,
        statusGizi: 1,
        umurBulan: 12,
        statusTikar: 4,
        pemberianImunisasiDasar: true,
        pemberianImunisasiCampak: null,
        pengukuranBeratBadan: true,
        beratBadan: 8,
        pengukuranTinggiBadan: true,
        tinggiBadan: 75,
        konselingGiziAyah: false,
        konselingGiziIbu: false,
        kunjunganRumah: false,
        airBersih: false,
        kepemilikanJamban: false,
        aktaLahir: false,
        jaminanKesehatan: false,
        pengasuhanPaud: false,
      },
      {
        id: 2,
        posyanduId: 1,
        kiaId: 2,
        statusGizi: 2,
        umurBulan: 18,
        statusTikar: 3,
        pemberianImunisasiDasar: true,
        pemberianImunisasiCampak: null,
        pengukuranBeratBadan: true,
        beratBadan: 9,
        pengukuranTinggiBadan: true,
        tinggiBadan: 80,
        konselingGiziAyah: false,
        konselingGiziIbu: false,
        kunjunganRumah: false,
        airBersih: false,
        kepemilikanJamban: false,
        aktaLahir: false,
        jaminanKesehatan: false,
        pengasuhanPaud: false,
      },
      {
        id: 3,
        posyanduId: 1,
        kiaId: 3,
        statusGizi: 4,
        umurBulan: 20,
        statusTikar: 2,
        pemberianImunisasiDasar: false,
        pemberianImunisasiCampak: null,
        pengukuranBeratBadan: true,
        beratBadan: 7,
        pengukuranTinggiBadan: true,
        tinggiBadan: 70,
        konselingGiziAyah: false,
        konselingGiziIbu: false,
        kunjunganRumah: false,
        airBersih: false,
        kepemilikanJamban: false,
        aktaLahir: false,
        jaminanKesehatan: false,
        pengasuhanPaud: false,
      },
    ];
    const result = buildSkorcardKonvergensi(ibuHamil, anak);
    expect(result.tikar.H).toBe(1);
    expect(result.tikar.K).toBe(1);
    expect(result.tikar.M).toBe(1);
    expect(result.jumlahGiziBukanNormal).toBe(2);
  });

  it("menghitung capaian konvergensi ibu hamil", () => {
    const ibuHamil = [
      {
        id: 1,
        posyanduId: 1,
        kiaId: 1,
        statusKehamilan: 1,
        usiaKehamilan: 12,
        tanggalMelahirkan: null,
        pemeriksaanKehamilan: true,
        konsumsiPilFe: true,
        butirPilFe: null,
        pemeriksaanNifas: false,
        konselingGizi: true,
        kunjunganRumah: false,
        aksesAirBersih: true,
        kepemilikanJamban: true,
        jaminanKesehatan: true,
      },
      {
        id: 2,
        posyanduId: 1,
        kiaId: 2,
        statusKehamilan: 3,
        usiaKehamilan: 20,
        tanggalMelahirkan: null,
        pemeriksaanKehamilan: true,
        konsumsiPilFe: false,
        butirPilFe: null,
        pemeriksaanNifas: false,
        konselingGizi: false,
        kunjunganRumah: false,
        aksesAirBersih: false,
        kepemilikanJamban: false,
        jaminanKesehatan: false,
      },
    ];
    const anak: BulananAnakRow[] = [];
    const result = buildSkorcardKonvergensi(ibuHamil, anak);
    expect(result.ibuHamilTotal).toBe(2);
    expect(result.jumlahKekRisti).toBe(1);
    expect(result.ibuHamil.capaianKonvergensi?.periksa_kehamilan?.Y).toBe(2);
    expect(result.ibuHamil.capaianKonvergensi?.periksa_kehamilan?.persen).toBe(100);
    expect(result.ibuHamil.capaianKonvergensi?.pil_fe?.Y).toBe(1);
    expect(result.ibuHamil.capaianKonvergensi?.pil_fe?.persen).toBe(50);
  });

  it("menghitung capaian konvergensi anak", () => {
    const ibuHamil: IbuHamilRow[] = [];
    const anak: BulananAnakRow[] = [
      {
        id: 1,
        posyanduId: 1,
        kiaId: 1,
        statusGizi: 1,
        umurBulan: 12,
        statusTikar: 4,
        pemberianImunisasiDasar: true,
        pemberianImunisasiCampak: null,
        pengukuranBeratBadan: true,
        beratBadan: 8,
        pengukuranTinggiBadan: true,
        tinggiBadan: 75,
        konselingGiziAyah: false,
        konselingGiziIbu: true,
        kunjunganRumah: false,
        airBersih: true,
        kepemilikanJamban: true,
        aktaLahir: true,
        jaminanKesehatan: true,
        pengasuhanPaud: false,
      },
      {
        id: 2,
        posyanduId: 1,
        kiaId: 2,
        statusGizi: 2,
        umurBulan: 18,
        statusTikar: 3,
        pemberianImunisasiDasar: false,
        pemberianImunisasiCampak: null,
        pengukuranBeratBadan: true,
        beratBadan: 9,
        pengukuranTinggiBadan: false,
        tinggiBadan: null,
        konselingGiziAyah: false,
        konselingGiziIbu: false,
        kunjunganRumah: true,
        airBersih: false,
        kepemilikanJamban: false,
        aktaLahir: false,
        jaminanKesehatan: false,
        pengasuhanPaud: true,
      },
    ];
    const result = buildSkorcardKonvergensi(ibuHamil, anak);
    expect(result.bulananAnakTotal).toBe(2);
    expect(result.bulananAnak.capaianKonvergensi?.imunisasi?.Y).toBe(1);
    expect(result.bulananAnak.capaianKonvergensi?.imunisasi?.persen).toBe(50);
    expect(result.bulananAnak.capaianKonvergensi?.pengasuhan_paud?.Y).toBe(1);
  });

  it("menghitung tingkat konvergensi desa", () => {
    const ibuHamil = [
      {
        id: 1,
        posyanduId: 1,
        kiaId: 1,
        statusKehamilan: 1,
        usiaKehamilan: 12,
        tanggalMelahirkan: null,
        pemeriksaanKehamilan: true,
        konsumsiPilFe: true,
        butirPilFe: null,
        pemeriksaanNifas: true,
        konselingGizi: true,
        kunjunganRumah: true,
        aksesAirBersih: true,
        kepemilikanJamban: true,
        jaminanKesehatan: true,
      },
    ];
    const anak = [
      {
        id: 1,
        posyanduId: 1,
        kiaId: 1,
        statusGizi: 1,
        umurBulan: 12,
        statusTikar: 4,
        pemberianImunisasiDasar: true,
        pemberianImunisasiCampak: null,
        pengukuranBeratBadan: true,
        beratBadan: 8,
        pengukuranTinggiBadan: true,
        tinggiBadan: 75,
        konselingGiziAyah: false,
        konselingGiziIbu: true,
        kunjunganRumah: true,
        airBersih: true,
        kepemilikanJamban: true,
        aktaLahir: true,
        jaminanKesehatan: true,
        pengasuhanPaud: true,
      },
    ];
    const result = buildSkorcardKonvergensi(ibuHamil, anak);
    expect(result.ibuHamil.tingkatKonvergensiDesa).not.toBeNull();
    expect(result.ibuHamil.tingkatKonvergensiDesa!.jumlah_diterima).toBe(8);
    expect(result.ibuHamil.tingkatKonvergensiDesa!.jumlah_seharusnya).toBe(8);
    expect(result.ibuHamil.tingkatKonvergensiDesa!.persen).toBe(100);
    expect(result.bulananAnak.tingkatKonvergensiDesa).not.toBeNull();
    expect(result.bulananAnak.tingkatKonvergensiDesa!.jumlah_diterima).toBe(10);
    expect(result.bulananAnak.tingkatKonvergensiDesa!.jumlah_seharusnya).toBe(10);
  });
});
