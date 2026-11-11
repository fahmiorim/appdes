import { describe, expect, it } from "vitest";

import { formatWilayahLabel, wilayahFormSchema } from "@/features/wilayah/domain/wilayah";

describe("wilayahFormSchema", () => {
  it("menerima input valid dan memangkas spasi", () => {
    const result = wilayahFormSchema.parse({
      dusun: "  Sukamaju ",
      rw: " 01 ",
      rt: "02",
      urut: "5",
    });

    expect(result).toEqual({ dusun: "Sukamaju", rw: "01", rt: "02", urut: 5 });
  });

  it("mengubah urut dari teks menjadi angka", () => {
    const result = wilayahFormSchema.parse({ dusun: "A", rw: "", rt: "", urut: "12" });

    expect(result.urut).toBe(12);
  });

  it("menolak dusun kosong", () => {
    const result = wilayahFormSchema.safeParse({ dusun: "   ", rw: "", rt: "", urut: 0 });

    expect(result.success).toBe(false);
  });

  it("menolak urut di luar rentang", () => {
    const negative = wilayahFormSchema.safeParse({ dusun: "A", rw: "", rt: "", urut: -1 });
    const tooBig = wilayahFormSchema.safeParse({ dusun: "A", rw: "", rt: "", urut: 10000 });

    expect(negative.success).toBe(false);
    expect(tooBig.success).toBe(false);
  });

  it("menolak urut bukan bilangan bulat", () => {
    const result = wilayahFormSchema.safeParse({ dusun: "A", rw: "", rt: "", urut: 1.5 });

    expect(result.success).toBe(false);
  });

  it("menolak rw/rt yang terlalu panjang", () => {
    const result = wilayahFormSchema.safeParse({
      dusun: "A",
      rw: "12345678901",
      rt: "",
      urut: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe("formatWilayahLabel", () => {
  it("menggabungkan dusun, RT, dan RW", () => {
    expect(formatWilayahLabel({ dusun: "Sukamaju", rw: "01", rt: "02" })).toBe(
      "Dusun Sukamaju · RT 02 · RW 01",
    );
  });

  it("melewati bagian yang kosong", () => {
    expect(formatWilayahLabel({ dusun: "Sukamaju", rw: "", rt: "" })).toBe("Dusun Sukamaju");
    expect(formatWilayahLabel({ dusun: "", rw: "01", rt: "02" })).toBe("RT 02 · RW 01");
  });

  it("memberi label fallback bila semuanya kosong", () => {
    expect(formatWilayahLabel({ dusun: "", rw: "", rt: "" })).toBe("Wilayah tanpa nama");
  });
});

describe("validasi wilayah - rekap", () => {
  it("memastikan kombinasi dusun rw rt divalidasi", () => {
    const parsed = wilayahFormSchema.parse({ dusun: "Dusun A", rw: "001", rt: "001", urut: 1 });
    expect(parsed.dusun).toBe("Dusun A");
    expect(parsed.rw).toBe("001");
    expect(parsed.rt).toBe("001");
  });
});
