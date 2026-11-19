import { describe, expect, it } from "vitest";

import { labelAktivitas, toneAktivitas } from "./aktivitas";

describe("labelAktivitas", () => {
  it("memakai label manusia untuk event yang dikenal", () => {
    expect(labelAktivitas("pengguna.create")).toBe("Tambah pengguna");
    expect(labelAktivitas("grup-akses.permission")).toBe("Ubah izin grup akses");
  });

  it("memberi fallback netral untuk event tak dikenal", () => {
    expect(labelAktivitas("sesuatu.baru")).toBe("Aktivitas sistem");
  });
});

describe("toneAktivitas", () => {
  it("membedakan aksi pengguna, autentikasi, dan modul lain", () => {
    expect(toneAktivitas("pengguna.update")).toBe("accent");
    expect(toneAktivitas("grup-akses.create")).toBe("accent");
    expect(toneAktivitas("auth.login.success")).toBe("info");
    expect(toneAktivitas("penduduk.create")).toBe("netral");
  });
});
