import { describe, expect, it } from "vitest";

import {
  bukuResmiCsv,
  formatTanggalIndonesia,
  kopDesaAlamat,
  kopDesaLines,
  namaBerkasBuku,
  tabelAgenda,
  tabelAparat,
  tabelItemBuku,
  tabelKader,
  tabelMutasiPenduduk,
  tabelMutasiTanahKas,
  tabelPembangunan,
  tabelPeraturan,
  tabelTanahKas,
  type KopDesa,
} from "./buku-resmi";

const desaLengkap: KopDesa = {
  namaDesa: "Sukamaju",
  namaKecamatan: "Cibadak",
  namaKabupaten: "Sukabumi",
  namaPropinsi: "Jawa Barat",
  alamatKantor: "Jl. Raya No. 1",
  telepon: "0266-123456",
  emailDesa: "desa@sukamaju.id",
};

describe("kopDesaLines", () => {
  it("menyusun baris kop dari atas ke bawah dengan huruf kapital", () => {
    expect(kopDesaLines(desaLengkap)).toEqual([
      "PEMERINTAH PROVINSI JAWA BARAT",
      "KABUPATEN SUKABUMI",
      "KECAMATAN CIBADAK",
      "DESA SUKAMAJU",
    ]);
  });

  it("membuang baris yang identitasnya kosong dan menjaga baris desa", () => {
    expect(
      kopDesaLines({
        namaDesa: null,
        namaKecamatan: null,
        namaKabupaten: null,
        namaPropinsi: null,
        alamatKantor: null,
        telepon: null,
        emailDesa: null,
      }),
    ).toEqual(["PEMERINTAH DESA"]);
  });
});

describe("kopDesaAlamat", () => {
  it("menggabungkan alamat, telepon, dan email", () => {
    expect(kopDesaAlamat(desaLengkap)).toBe(
      "Jl. Raya No. 1 | Telp. 0266-123456 | desa@sukamaju.id",
    );
  });

  it("mengembalikan kosong bila tidak ada alamat/telepon/email", () => {
    expect(
      kopDesaAlamat({ ...desaLengkap, alamatKantor: null, telepon: null, emailDesa: null }),
    ).toBe("");
  });
});

describe("tabelItemBuku & bukuResmiCsv", () => {
  it("menyusun tabel item dengan kolom standar dan mengganti null jadi kosong", () => {
    const tabel = tabelItemBuku("A1", "Buku Peraturan Desa", [
      { nomorUrut: 1, tanggal: "2026-01-02", uraian: "Perdes 1/2026", keterangan: null },
      { nomorUrut: 2, tanggal: null, uraian: "Perdes 2/2026", keterangan: "Disahkan BPD" },
    ]);

    expect(tabel.kolom).toEqual(["No. Urut", "Tanggal", "Uraian", "Keterangan"]);
    expect(tabel.baris).toEqual([
      [1, "2026-01-02", "Perdes 1/2026", ""],
      [2, "", "Perdes 2/2026", "Disahkan BPD"],
    ]);
  });

  it("membuat CSV ber-BOM, CRLF, dan meng-escape sel yang memuat koma/kutip", () => {
    const csv = bukuResmiCsv({
      kodeBuku: "A1",
      namaBuku: "Buku Peraturan Desa",
      kolom: ["No. Urut", "Uraian"],
      baris: [[1, 'Perdes, "APBDes"']],
    });

    expect(csv).toBe('\uFEFFNo. Urut,Uraian\r\n1,"Perdes, ""APBDes"""\r\n');
  });
});

describe("namaBerkasBuku", () => {
  it("membangun nama berkas dari kode buku, nama desa, dan tanggal", () => {
    const nama = namaBerkasBuku("A1", "Suka Maju!", new Date("2026-11-04T00:00:00Z"));
    expect(nama).toBe("buku-a1-suka-maju-2026-11-04.csv");
  });

  it("memakai fallback 'desa' bila nama kosong", () => {
    expect(namaBerkasBuku("B3", null, new Date("2026-11-04T00:00:00Z"))).toBe(
      "buku-b3-desa-2026-11-04.csv",
    );
  });
});

describe("formatTanggalIndonesia", () => {
  it("memformat tanggal ISO menjadi 'D Bulan YYYY'", () => {
    expect(formatTanggalIndonesia("2026-11-04")).toBe("4 November 2026");
    expect(formatTanggalIndonesia("2026-01-31T10:00:00")).toBe("31 Januari 2026");
  });

  it("mengembalikan kosong untuk nilai kosong", () => {
    expect(formatTanggalIndonesia(null)).toBe("");
    expect(formatTanggalIndonesia("")).toBe("");
  });
});

describe("format buku resmi khusus", () => {
  it("menyusun tabel mutasi penduduk (B3) dengan format resmi", () => {
    const tabel = tabelMutasiPenduduk("B3", "Buku Data Mutasi Penduduk", [
      { nomorUrut: 1, tanggal: "2026-01-05", jenisMutasi: "Lahir", keterangan: "Anak" },
      { nomorUrut: 2, tanggal: null, jenisMutasi: "Pindah", keterangan: null },
    ]);
    expect(tabel.kolom).toEqual(["No. Urut", "Tanggal", "Jenis Mutasi", "Uraian / Keterangan"]);
    expect(tabel.baris[0]).toEqual([1, "2026-01-05", "Lahir", "Anak"]);
    expect(tabel.baris[1]?.[1]).toBe("");
    expect(tabel.baris[1]?.[3]).toBe("");
  });

  it("menyusun tabel tanah kas (E1) dengan kolom resmi", () => {
    const tabel = tabelTanahKas("E1", "Buku Tanah Kas Desa", [
      {
        nomorUrut: 1,
        nomorPersil: "001/2026",
        asal: "Hibah",
        luas: "100.00",
        lokasi: "Dusun A",
        status: "Bebas",
        nilai: "0.00",
        keterangan: null,
      },
    ]);
    expect(tabel.kolom).toContain("Nomor Persil");
    expect(tabel.kolom).toContain("Luas (m²)");
    expect(tabel.baris[0]?.[1]).toBe("001/2026");
  });

  it("menyusun tabel mutasi tanah kas", () => {
    const tabel = tabelMutasiTanahKas("E1", "Buku Tanah Kas Desa", [
      {
        nomorUrut: 1,
        tanggal: "2026-02-01",
        jenis: "Pinjam Pakai",
        uraian: "Dipinjamkan",
        luasPerubahan: null,
        nilaiPerubahan: null,
        keterangan: "SK",
      },
    ]);
    expect(tabel.kolom).toEqual([
      "No. Urut",
      "Tanggal",
      "Jenis Mutasi",
      "Uraian",
      "Perubahan Luas (m²)",
      "Perubahan Nilai (Rp)",
      "Keterangan",
    ]);
  });

  it("menyusun tabel pembangunan", () => {
    const tabel = tabelPembangunan("P1", "Buku Pembangunan", [
      {
        nomorUrut: 1,
        tahun: 2026,
        namaKegiatan: "Jalan Desa",
        lokasi: "Dusun B",
        volume: "100 m",
        sumberDana: "DD",
        biaya: "10000000",
        pelaksana: "Kades",
        status: "selesai",
        tanggalMulai: "2026-01-01",
        tanggalSelesai: "2026-03-01",
        hasil: "Tersedia",
        keterangan: null,
      },
    ]);
    expect(tabel.kolom).toContain("Nama Kegiatan");
    expect(tabel.baris[0]?.[2]).toBe("Jalan Desa");
  });

  it("menyusun tabel kader pembangunan", () => {
    const tabel = tabelKader("K1", "Buku Kader Pembangunan", [
      {
        nomorUrut: 1,
        nama: "Budi",
        jabatan: "Ketua",
        bidang: "Infrastruktur",
        alamat: null,
        noHp: null,
        keterangan: null,
      },
    ]);
    expect(tabel.kolom).toEqual([
      "No. Urut",
      "Nama",
      "Jabatan",
      "Bidang",
      "Alamat",
      "No. HP",
      "Keterangan",
    ]);
  });

  it("menyusun tabel peraturan desa/keputusan kades", () => {
    const tabel = tabelPeraturan("A1", "Buku Peraturan Desa", [
      {
        nomorUrut: 1,
        jenis: "peraturan_desa",
        nomor: "01/2026",
        tahun: 2026,
        tentang: "APBDes",
        tanggalDitetapkan: "2026-01-10",
        tanggalDiundangkan: "2026-01-15",
        keterangan: null,
      },
    ]);
    expect(tabel.kolom).toContain("Tanggal Ditetapkan");
  });

  it("menyusun tabel aparat", () => {
    const tabel = tabelAparat("A4", "Buku Aparat Pemerintah Desa", [
      {
        nomorUrut: 1,
        nama: "Siti",
        nip: null,
        jabatan: "Sekretaris Desa",
        tempatLahir: "Bandung",
        tanggalLahir: "1980-01-01",
        pendidikan: "SMA",
        nomorSkPengangkatan: "SK/01/2020",
        tanggalPengangkatan: "2020-01-01",
        nomorSkPemberhentian: null,
        tanggalPemberhentian: null,
        keterangan: null,
      },
    ]);
    expect(tabel.kolom).toContain("Tempat/Tgl Lahir");
    expect(tabel.baris[0]?.[4]).toContain("Bandung");
    expect(tabel.baris[0]?.[5]).toBe("SMA");
  });

  it("menyusun tabel agenda/ekspedisi", () => {
    const tabel = tabelAgenda("A6", "Buku Agenda", [
      {
        nomorUrut: 1,
        jenis: "masuk",
        tanggal: "2026-03-01",
        nomorSurat: "123/XX/2026",
        asalTujuan: "Kecamatan",
        perihal: "Undangan",
        keterangan: null,
      },
    ]);
    expect(tabel.kolom).toEqual([
      "No. Urut",
      "Jenis",
      "Tanggal",
      "Nomor Surat",
      "Asal / Tujuan",
      "Perihal",
      "Keterangan",
    ]);
  });
});
