import { describe, expect, it } from "vitest";

import { wilayahAdministratif } from "./data-wilayah";

describe("wilayahAdministratif", () => {
  it("mengembalikan provinsi tanpa induk", () => {
    const hasil = wilayahAdministratif("provinsi", null);

    expect(hasil.status).toBe("ok");
    if (hasil.status !== "ok") return;
    expect(hasil.data).toHaveLength(38);
    expect(hasil.data[0]).toEqual({ kode: "11", nama: "Aceh" });
  });

  it("menyaring kabupaten dan desa berdasarkan induk", () => {
    const kabupaten = wilayahAdministratif("kabupaten", "11");
    expect(kabupaten.status).toBe("ok");
    if (kabupaten.status === "ok") {
      expect(kabupaten.data[0]).toEqual({ kode: "11.01", nama: "Kabupaten Aceh Selatan" });
    }

    const desa = wilayahAdministratif("desa", "11.01.01");
    expect(desa.status).toBe("ok");
    if (desa.status === "ok") {
      expect(desa.data[0]).toEqual({ kode: "1101012001", nama: "Keude Bakongan" });
    }
  });

  it("menolak tingkat yang tidak dikenal", () => {
    expect(wilayahAdministratif("tersier", null).status).toBe("tingkat-tidak-valid");
    expect(wilayahAdministratif(null, null).status).toBe("tingkat-tidak-valid");
  });

  it("menolak induk yang hilang atau salah format", () => {
    expect(wilayahAdministratif("kabupaten", null).status).toBe("induk-tidak-valid");
    expect(wilayahAdministratif("kecamatan", "11").status).toBe("induk-tidak-valid");
    expect(wilayahAdministratif("desa", "11.01.01.01").status).toBe("induk-tidak-valid");
  });
});
