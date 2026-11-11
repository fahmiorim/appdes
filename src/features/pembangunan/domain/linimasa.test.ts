import { describe, expect, it } from "vitest";

import { susunLinimasa } from "./linimasa";

const DOK = {
  id: 1,
  gambar: "pembangunan/1.jpg",
  judul: "Pengecoran jalan",
  keterangan: "Progres 50%",
  createdAt: new Date("2025-06-10T08:00:00Z"),
};

describe("susunLinimasa", () => {
  it("menggabungkan mulai, dokumentasi, dan selesai secara kronologis", () => {
    const events = susunLinimasa({
      mulai: "2025-05-01",
      selesai: "2025-08-01",
      status: "selesai",
      progres: 100,
      dokumentasi: [{ ...DOK, id: 2, createdAt: new Date("2025-07-01T00:00:00Z") }, DOK],
    });

    expect(events.map((event) => event.jenis)).toEqual([
      "mulai",
      "dokumentasi",
      "dokumentasi",
      "selesai",
    ]);
    expect(events[1]?.tanggal).toBe("2025-06-10");
    expect(events[3]?.keterangan).toBe("Progres fisik 100%.");
  });

  it("menampilkan event selesai tanpa tanggal saat status selesai", () => {
    const events = susunLinimasa({
      mulai: null,
      selesai: null,
      status: "selesai",
      progres: 130,
      dokumentasi: [],
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.tanggal).toBeNull();
    expect(events[0]?.keterangan).toBe("Progres fisik 100%.");
  });

  it("tidak menambah event selesai untuk proyek berjalan", () => {
    const events = susunLinimasa({
      mulai: "2025-01-01",
      selesai: null,
      status: "berjalan",
      progres: 40,
      dokumentasi: [],
    });
    expect(events.map((event) => event.jenis)).toEqual(["mulai"]);
  });

  it("memakai judul bawaan dan meletakkan dokumentasi tanpa tanggal di akhir", () => {
    const events = susunLinimasa({
      mulai: null,
      selesai: null,
      status: "berjalan",
      progres: 10,
      dokumentasi: [{ ...DOK, judul: "  ", createdAt: null }],
    });
    expect(events[0]?.judul).toBe("Dokumentasi proyek");
    expect(events[0]?.tanggal).toBeNull();
  });
});
