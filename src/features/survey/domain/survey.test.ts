import { describe, expect, it } from "vitest";

import {
  normalizeTipeSoal,
  parsePilihanForm,
  parsePilihanSoal,
  rekapSoal,
  respondenFormSchema,
  serializePilihan,
  soalFormSchema,
  surveyFormSchema,
  validasiJawaban,
  type SoalRow,
} from "./survey";

const soalDasar = {
  surveyId: "7",
  pertanyaan: "  Bagaimana pelayanan desa?  ",
  tipe: "text",
  pilihan: "",
  urutan: "1",
};

describe("normalizeTipeSoal", () => {
  it("menerima tipe yang dikenal dan mengganti sisanya ke text", () => {
    expect(normalizeTipeSoal("choice")).toBe("choice");
    expect(normalizeTipeSoal("number")).toBe("number");
    expect(normalizeTipeSoal("radio")).toBe("text");
    expect(normalizeTipeSoal(null)).toBe("text");
  });
});

describe("pilihan soal", () => {
  it("membaca JSON valid dan mengabaikan data rusak", () => {
    expect(parsePilihanSoal('["Baik","Cukup"]')).toEqual(["Baik", "Cukup"]);
    expect(parsePilihanSoal('[1,"Baik"]')).toEqual(["Baik"]);
    expect(parsePilihanSoal("{rusak")).toEqual([]);
    expect(parsePilihanSoal("")).toEqual([]);
  });

  it("mengurai textarea satu pilihan per baris tanpa duplikat", () => {
    expect(parsePilihanForm("Baik\n\n  Cukup \nBaik\nKurang")).toEqual(["Baik", "Cukup", "Kurang"]);
  });

  it("menyimpan daftar kosong sebagai NULL", () => {
    expect(serializePilihan([])).toBeNull();
    expect(serializePilihan(["A", "B"])).toBe('["A","B"]');
  });
});

describe("surveyFormSchema", () => {
  const valid = { judul: "  Survei Layanan  ", deskripsi: "  Tujuan  ", aktif: "on" };

  it("memangkas teks dan menandai aktif dari checkbox", () => {
    const result = surveyFormSchema.parse(valid);

    expect(result.judul).toBe("Survei Layanan");
    expect(result.deskripsi).toBe("Tujuan");
    expect(result.aktif).toBe(true);
  });

  it("menganggap checkbox tak terkirim sebagai nonaktif", () => {
    expect(surveyFormSchema.parse({ ...valid, aktif: undefined }).aktif).toBe(false);
  });

  it("menolak judul kosong", () => {
    expect(surveyFormSchema.safeParse({ ...valid, judul: "   " }).success).toBe(false);
  });
});

describe("soalFormSchema", () => {
  it("menerima soal isian tanpa pilihan", () => {
    const result = soalFormSchema.parse(soalDasar);

    expect(result.pertanyaan).toBe("Bagaimana pelayanan desa?");
    expect(result.tipe).toBe("text");
    expect(result.urutan).toBe(1);
  });

  it("mewajibkan minimal dua pilihan untuk pilihan ganda", () => {
    const satu = soalFormSchema.safeParse({ ...soalDasar, tipe: "choice", pilihan: "Baik" });
    const dua = soalFormSchema.safeParse({ ...soalDasar, tipe: "choice", pilihan: "Baik\nCukup" });

    expect(satu.success).toBe(false);
    if (!satu.success) {
      expect(satu.error.issues[0]?.path).toEqual(["pilihan"]);
    }
    expect(dua.success).toBe(true);
  });

  it("menolak pilihan lebih dari sepuluh", () => {
    const pilihan = Array.from({ length: 11 }, (_, index) => `Pilihan ${index + 1}`).join("\n");
    const result = soalFormSchema.safeParse({ ...soalDasar, tipe: "choice", pilihan });

    expect(result.success).toBe(false);
  });

  it("menolak tipe yang tidak dikenal", () => {
    const result = soalFormSchema.safeParse({ ...soalDasar, tipe: "radio" });

    expect(result.success).toBe(false);
  });
});

describe("respondenFormSchema", () => {
  const valid = { surveyId: "4", nama: "  Siti  ", nik: "3201012001120001" };

  it("memangkas nama dan menerima NIK 16 angka", () => {
    const result = respondenFormSchema.parse(valid);

    expect(result.surveyId).toBe(4);
    expect(result.nama).toBe("Siti");
    expect(result.nik).toBe("3201012001120001");
  });

  it("mengubah NIK kosong menjadi null", () => {
    expect(respondenFormSchema.parse({ ...valid, nik: "" }).nik).toBeNull();
  });

  it("menolak NIK yang bukan 16 angka dan nama kosong", () => {
    expect(respondenFormSchema.safeParse({ ...valid, nik: "123" }).success).toBe(false);
    expect(respondenFormSchema.safeParse({ ...valid, nama: "  " }).success).toBe(false);
  });
});

describe("validasiJawaban", () => {
  const soal: Pick<SoalRow, "id" | "tipe" | "pilihan">[] = [
    { id: 1, tipe: "text", pilihan: [] },
    { id: 2, tipe: "number", pilihan: [] },
    { id: 3, tipe: "choice", pilihan: ["Baik", "Kurang"] },
  ];

  it("lolos bila semua soal dijawab dengan benar", () => {
    const errors = validasiJawaban(soal, { "1": "Mantap", "2": "8", "3": "Baik" });

    expect(errors).toEqual({});
  });

  it("menandai jawaban kosong, bukan angka, dan pilihan asing", () => {
    const errors = validasiJawaban(soal, { "1": "  ", "2": "delapan", "3": "Sedang" });

    expect(errors["1"]).toBe("Jawaban wajib diisi.");
    expect(errors["2"]).toBe("Jawaban harus berupa angka.");
    expect(errors["3"]).toBe("Pilih salah satu pilihan yang tersedia.");
  });
});

describe("rekapSoal", () => {
  it("menghitung distribusi pilihan termasuk opsi yang belum dipilih", () => {
    const rekap = rekapSoal(
      { id: 1, pertanyaan: "Pelayanan?", tipe: "choice", pilihan: ["Baik", "Cukup", "Kurang"] },
      ["Baik", "Baik", "Cukup", "Tidak valid"],
    );

    expect(rekap.dijawab).toBe(4);
    expect(rekap.distribusi).toEqual([
      { label: "Baik", jumlah: 2, persentase: 50 },
      { label: "Cukup", jumlah: 1, persentase: 25 },
      { label: "Kurang", jumlah: 0, persentase: 0 },
    ]);
  });

  it("menghitung rata-rata, nilai terkecil, dan terbesar", () => {
    const rekap = rekapSoal({ id: 2, pertanyaan: "Skor?", tipe: "number", pilihan: [] }, [
      "7",
      "9",
      "8",
      "bukan angka",
    ]);

    expect(rekap.dijawab).toBe(4);
    expect(rekap.rataRata).toBe(8);
    expect(rekap.terkecil).toBe(7);
    expect(rekap.terbesar).toBe(9);
  });

  it("membatasi contoh jawaban teks dan melewati jawaban kosong", () => {
    const jawaban = Array.from({ length: 25 }, (_, index) => `Jawaban ${index + 1}`);
    const rekap = rekapSoal({ id: 3, pertanyaan: "Masukan?", tipe: "text", pilihan: [] }, [
      ...jawaban,
      "   ",
    ]);

    expect(rekap.dijawab).toBe(25);
    expect(rekap.jawabanTeks).toHaveLength(20);
    expect(rekap.jawabanTeks[0]).toBe("Jawaban 1");
  });

  it("aman saat belum ada jawaban", () => {
    const rekap = rekapSoal(
      { id: 4, pertanyaan: "Pelayanan?", tipe: "choice", pilihan: ["Baik", "Kurang"] },
      [],
    );

    expect(rekap.dijawab).toBe(0);
    expect(rekap.distribusi.map((item) => item.persentase)).toEqual([0, 0]);
  });
});
