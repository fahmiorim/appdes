import { describe, expect, it } from "vitest";

import {
  buildLaporanPendudukCsv,
  csvCell,
  hitungJenisKelamin,
  hitungKelompokUmur,
  hitungLaporanPenduduk,
  hitungSebaran,
  isLaporanPendudukJenis,
  KELOMPOK_UMUR,
  kelompokUmurUntuk,
  laporanPendudukFilename,
  laporanPendudukKategori,
  laporanPendudukLabel,
  toCsv,
  type PendudukStatistik,
} from "./laporan-penduduk";

function orang(partial: Partial<PendudukStatistik>): PendudukStatistik {
  return {
    gender: "male",
    umur: 30,
    agama: "Islam",
    pendidikan: "SLTA/SEDERAJAT",
    pekerjaan: "Petani",
    statusKawin: "Kawin",
    wilayah: "Dusun Satu",
    ...partial,
  };
}

describe("laporanPendudukLabel & isLaporanPendudukJenis", () => {
  it("memberi label Indonesia untuk jenis yang dikenal", () => {
    expect(laporanPendudukLabel("kelompok-umur")).toBe("Kelompok Umur (Rentan)");
    expect(laporanPendudukLabel("agama")).toBe("Menurut Agama");
  });

  it("mengembalikan nilai apa adanya bila tidak dikenal", () => {
    expect(laporanPendudukLabel("entah")).toBe("entah");
  });

  it("hanya menerima jenis yang terdaftar", () => {
    expect(isLaporanPendudukJenis("umur")).toBe(true);
    expect(isLaporanPendudukJenis("kelompok-umur")).toBe(true);
    expect(isLaporanPendudukJenis("entah")).toBe(false);
  });
});

describe("laporanPendudukKategori", () => {
  it("melepas awalan 'Menurut' agar tidak berulang di kalimat", () => {
    expect(laporanPendudukKategori("agama")).toBe("Agama");
    expect(laporanPendudukKategori("jenis-kelamin")).toBe("Jenis Kelamin");
    expect(laporanPendudukKategori("status-kawin")).toBe("Status Kawin");
  });

  it("melepas awalan pada semua label yang memakainya", () => {
    expect(laporanPendudukKategori("umur")).toBe("Umur");
    expect(laporanPendudukKategori("kelompok-umur")).toBe("Kelompok Umur (Rentan)");
  });
});

describe("kelompokUmurUntuk", () => {
  it("menempatkan umur pada rentang yang tepat", () => {
    expect(kelompokUmurUntuk(0)?.label).toBe("Di bawah 1 Tahun");
    expect(kelompokUmurUntuk(5)?.label).toBe("1–5 Tahun");
    expect(kelompokUmurUntuk(6)?.label).toBe("6–12 Tahun");
    expect(kelompokUmurUntuk(18)?.label).toBe("16–18 Tahun");
    expect(kelompokUmurUntuk(60)?.label).toBe("Di atas 60 Tahun");
    expect(kelompokUmurUntuk(120)?.label).toBe("Di atas 60 Tahun");
  });

  it("mengembalikan null bila umur tidak diketahui", () => {
    expect(kelompokUmurUntuk(null)).toBeNull();
    expect(kelompokUmurUntuk(-1)).toBeNull();
  });

  it("setiap usia 0-100 masuk tepat satu kelompok", () => {
    for (let umur = 0; umur <= 100; umur += 1) {
      const cocok = KELOMPOK_UMUR.filter(
        (kelompok) => umur >= kelompok.min && (kelompok.max === null || umur <= kelompok.max),
      );
      expect(cocok).toHaveLength(1);
    }
  });
});

describe("hitungSebaran", () => {
  it("menghitung jumlah per kategori dan total keseluruhan", () => {
    const penduduk = [
      orang({ gender: "male", agama: "Islam" }),
      orang({ gender: "female", agama: "Islam" }),
      orang({ gender: "female", agama: "Kristen" }),
    ];

    const statistik = hitungSebaran(penduduk, (row) => row.agama);
    expect(statistik.baris).toEqual([
      { label: "Islam", lakiLaki: 1, perempuan: 1, jumlah: 2 },
      { label: "Kristen", lakiLaki: 0, perempuan: 1, jumlah: 1 },
    ]);
    expect(statistik.total).toEqual({ lakiLaki: 1, perempuan: 2, jumlah: 3, tanpaKategori: 0 });
  });

  it("menghitung kategori kosong sebagai 'tanpa kategori'", () => {
    const penduduk = [orang({ agama: null }), orang({ gender: "female", agama: "   " })];

    const statistik = hitungSebaran(penduduk, (row) => row.agama);
    expect(statistik.baris.map((row) => row.label)).toEqual(["Belum Diisi"]);
    expect(statistik.total.tanpaKategori).toBe(2);
    expect(statistik.total.jumlah).toBe(2);
  });

  it("mengurutkan baris menurun berdasarkan jumlah", () => {
    const penduduk = [
      orang({ pekerjaan: "Petani" }),
      orang({ pekerjaan: "Guru" }),
      orang({ pekerjaan: "Petani" }),
    ];

    const statistik = hitungSebaran(penduduk, (row) => row.pekerjaan);
    expect(statistik.baris[0]?.label).toBe("Petani");
  });

  it("mengembalikan baris kosong bila tidak ada penduduk", () => {
    const statistik = hitungSebaran([], (row) => row.agama);
    expect(statistik.baris).toEqual([]);
    expect(statistik.total).toEqual({ lakiLaki: 0, perempuan: 0, jumlah: 0, tanpaKategori: 0 });
  });
});

describe("hitungKelompokUmur", () => {
  it("selalu memuat seluruh kelompok umur walau kosong", () => {
    const statistik = hitungKelompokUmur([orang({ umur: 7 })]);
    expect(statistik.baris).toHaveLength(KELOMPOK_UMUR.length);
    expect(statistik.baris.find((row) => row.label === "6–12 Tahun")?.jumlah).toBe(1);
    expect(statistik.baris.find((row) => row.label === "1–5 Tahun")?.jumlah).toBe(0);
  });

  it("memisahkan penduduk tanpa tanggal lahir", () => {
    const statistik = hitungKelompokUmur([orang({ umur: null })]);
    expect(statistik.total.tanpaKategori).toBe(1);
    expect(statistik.baris.every((row) => row.jumlah === 0)).toBe(true);
  });
});

describe("hitungJenisKelamin", () => {
  it("menghasilkan dua baris tetap", () => {
    const statistik = hitungJenisKelamin([
      orang({ gender: "male" }),
      orang({ gender: "female" }),
      orang({ gender: "female" }),
    ]);

    expect(statistik.baris).toEqual([
      { label: "Laki-laki", lakiLaki: 1, perempuan: 0, jumlah: 1 },
      { label: "Perempuan", lakiLaki: 0, perempuan: 2, jumlah: 2 },
    ]);
    expect(statistik.total.jumlah).toBe(3);
  });
});

describe("hitungLaporanPenduduk", () => {
  const penduduk = [
    orang({ gender: "male", pekerjaan: "Petani" }),
    orang({ gender: "female", pekerjaan: "Petani" }),
  ];

  it("memilih perhitungan sesuai jenis", () => {
    expect(hitungLaporanPenduduk("jenis-kelamin", penduduk).baris).toHaveLength(2);
    expect(hitungLaporanPenduduk("pekerjaan", penduduk).baris[0]?.label).toBe("Petani");
    expect(hitungLaporanPenduduk("umur", penduduk).baris[0]?.label).toBe("30 tahun");
  });

  it("menangani daftar kosong untuk setiap jenis", () => {
    const jenis = [
      "umur",
      "jenis-kelamin",
      "agama",
      "pendidikan",
      "pekerjaan",
      "status-kawin",
      "wilayah",
      "kelompok-umur",
    ] as const;

    for (const item of jenis) {
      const statistik = hitungLaporanPenduduk(item, []);
      expect(statistik.total.jumlah).toBe(0);
    }
  });
});

describe("csvCell & toCsv", () => {
  it("mengutip sel yang memuat pemisah", () => {
    expect(csvCell("Petani;Nelayan")).toBe('"Petani;Nelayan"');
  });

  it("menggandakan kutip di dalam sel", () => {
    expect(csvCell('Desa "Contoh"')).toBe('"Desa ""Contoh"""');
  });

  it("membiarkan sel biasa tanpa kutip", () => {
    expect(csvCell("Petani")).toBe("Petani");
  });

  it("menyambung baris dengan CRLF", () => {
    expect(
      toCsv([
        ["a", "b"],
        ["c", "d"],
      ]),
    ).toBe("a;b\r\nc;d");
  });
});

describe("buildLaporanPendudukCsv", () => {
  it("memuat BOM, judul, dan total", () => {
    const csv = buildLaporanPendudukCsv({
      namaDesa: "Desa Contoh",
      kecamatan: "Kecamatan Contoh",
      jenis: "agama",
      statistik: hitungSebaran([orang({ agama: "Islam" })], (row) => row.agama),
    });

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Laporan Kependudukan — Menurut Agama");
    expect(csv).toContain("Desa Contoh");
    expect(csv).toContain("Kategori;Laki-laki;Perempuan;Jumlah");
    expect(csv).toContain("Islam;1;0;1");
  });

  it("menambahkan baris tanpa kategori hanya bila ada", () => {
    const denganKosong = buildLaporanPendudukCsv({
      namaDesa: null,
      kecamatan: null,
      jenis: "agama",
      statistik: hitungSebaran([orang({ agama: null })], (row) => row.agama),
    });
    expect(denganKosong).toContain("Tanpa kategori;1");

    const tanpaKosong = buildLaporanPendudukCsv({
      namaDesa: null,
      kecamatan: null,
      jenis: "agama",
      statistik: hitungSebaran([orang({ agama: "Islam" })], (row) => row.agama),
    });
    expect(tanpaKosong).not.toContain("Tanpa kategori");
  });
});

describe("laporanPendudukFilename", () => {
  it("membuat nama berkas aman", () => {
    expect(laporanPendudukFilename("Desa Contoh", "kelompok-umur")).toBe(
      "laporan-penduduk-kelompok-umur-desa-contoh.csv",
    );
  });

  it("memakai 'desa' bila nama kosong", () => {
    expect(laporanPendudukFilename(null, "agama")).toBe("laporan-penduduk-agama-desa.csv");
  });
});
