import { describe, expect, it } from "vitest";

import {
  filterKeSearchParams,
  filterPendudukKosong,
  hitungFilterPenduduk,
  parseFilterPenduduk,
} from "./penduduk";

describe("parseFilterPenduduk", () => {
  it("mengembalikan filter kosong untuk query kosong", () => {
    expect(parseFilterPenduduk({})).toEqual(filterPendudukKosong());
  });

  it("memetakan seluruh filter yang dikenal", () => {
    const filter = parseFilterPenduduk({
      q: "  ani ",
      status: "alive",
      gender: "female",
      religionId: "2",
      educationId: "7",
      occupationId: "3",
      maritalStatusId: "1",
      dusun: " Sukamaju ",
      rw: "01",
      rt: "02",
      umurMin: "17",
      umurMax: "60",
    });

    expect(filter).toEqual({
      search: "ani",
      lifeStatus: "alive",
      gender: "female",
      religionId: 2,
      educationId: 7,
      occupationId: 3,
      maritalStatusId: 1,
      dusun: "Sukamaju",
      rw: "01",
      rt: "02",
      umurMin: 17,
      umurMax: 60,
    });
  });

  it("mengabaikan nilai yang tidak valid alih-alih menggagalkan halaman", () => {
    const filter = parseFilterPenduduk({
      status: "hidup",
      gender: "pria",
      religionId: "abc",
      educationId: "-3",
      umurMin: "x",
      umurMax: "-1",
    });

    expect(filter.lifeStatus).toBeNull();
    expect(filter.gender).toBeNull();
    expect(filter.religionId).toBeNull();
    expect(filter.educationId).toBeNull();
    expect(filter.umurMin).toBeNull();
    expect(filter.umurMax).toBeNull();
  });

  it("menerima umur 0 dan mengambil nilai pertama dari array param", () => {
    const filter = parseFilterPenduduk({ umurMin: ["0", "5"], status: ["deceased", "alive"] });

    expect(filter.umurMin).toBe(0);
    expect(filter.lifeStatus).toBe("deceased");
  });
});

describe("filterKeSearchParams", () => {
  it("hanya menuliskan filter yang terisi", () => {
    const query = filterKeSearchParams({ ...filterPendudukKosong(), search: "ani", umurMax: 5 });

    expect(query.toString()).toBe("q=ani&umurMax=5");
    expect(query.has("status")).toBe(false);
  });

  it("bolak-balik query string tetap sama", () => {
    const asli = parseFilterPenduduk({
      q: "budi",
      gender: "male",
      dusun: "Sukamaju",
      rw: "02",
      rt: "03",
      umurMin: "25",
    });

    expect(parseFilterPenduduk(Object.fromEntries(filterKeSearchParams(asli)))).toEqual(asli);
  });
});

describe("hitungFilterPenduduk", () => {
  it("menghitung filter aktif tanpa pencarian", () => {
    expect(hitungFilterPenduduk(filterPendudukKosong())).toBe(0);
    expect(
      hitungFilterPenduduk({
        ...filterPendudukKosong(),
        search: "ani",
        gender: "female",
        umurMin: 17,
      }),
    ).toBe(2);
  });
});
