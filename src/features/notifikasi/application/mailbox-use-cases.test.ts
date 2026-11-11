import { beforeEach, describe, expect, it, vi } from "vitest";

import * as audit from "@/features/audit/application/audit-use-cases";
import * as dal from "@/lib/dal";

import * as repo from "../infrastructure/mailbox-repository";
import * as email from "./kirim-notifikasi";
import {
  balasPesanMailbox,
  daftarPesanMailbox,
  tandaiPesanMailboxDibaca,
  terimaPesanEmailWebhook,
} from "./mailbox-use-cases";

vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn() }));
vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: vi.fn(async () => 7),
}));
vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("../infrastructure/mailbox-repository", () => ({
  getPesanMasukMailbox: vi.fn(),
  listMailboxPesan: vi.fn(async () => []),
  simpanMailboxPesan: vi.fn(async () => 41),
  tandaiMailboxDibaca: vi.fn(),
}));
vi.mock("./kirim-notifikasi", () => ({ kirimNotifikasi: vi.fn() }));

const pesanMasuk = {
  id: 41,
  arah: "masuk" as const,
  alamat: "warga@example.test",
  subjek: "Pertanyaan",
  isi: "Mohon informasi layanan desa.",
  dibaca: false,
  createdAt: new Date("2026-11-01T00:00:00Z"),
};

describe("terimaPesanEmailWebhook", () => {
  it("normalizes the sender and persists the host-resolved village", async () => {
    await terimaPesanEmailWebhook({
      villageId: 17,
      alamat: " WARGA@Example.Test ",
      subjek: " Pertanyaan ",
      isi: " Mohon informasi layanan desa. ",
    });

    expect(repo.simpanMailboxPesan).toHaveBeenCalledWith({
      villageId: 17,
      arah: "masuk",
      alamat: "warga@example.test",
      subjek: "Pertanyaan",
      isi: "Mohon informasi layanan desa.",
      dibaca: false,
    });
  });
});

describe("mailbox admin use cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requirePermission).mockResolvedValue({ id: "operator-1" } as never);
  });

  it("lists only the session village and requires read permission", async () => {
    await daftarPesanMailbox();

    expect(dal.requirePermission).toHaveBeenCalledWith("notifikasi", "read");
    expect(repo.listMailboxPesan).toHaveBeenCalledWith(7);
  });

  it("does not reply to a message outside the session village", async () => {
    vi.mocked(repo.getPesanMasukMailbox).mockResolvedValueOnce(null);

    await expect(balasPesanMailbox({ id: 41, isi: "Balasan yang cukup panjang." })).rejects.toThrow(
      "Pesan email tidak ditemukan.",
    );

    expect(repo.getPesanMasukMailbox).toHaveBeenCalledWith(7, 41);
    expect(email.kirimNotifikasi).not.toHaveBeenCalled();
  });

  it("sends and records a reply only after the email provider succeeds", async () => {
    vi.mocked(repo.getPesanMasukMailbox).mockResolvedValueOnce(pesanMasuk);
    vi.mocked(email.kirimNotifikasi).mockResolvedValueOnce({ sukses: true, dilewati: false });

    const hasil = await balasPesanMailbox({ id: 41, isi: "Informasi sudah kami kirim." });

    expect(hasil.sukses).toBe(true);
    expect(email.kirimNotifikasi).toHaveBeenCalledWith(
      expect.objectContaining({
        villageId: 7,
        kanal: "email",
        target: "warga@example.test",
        subjek: "Re: Pertanyaan",
      }),
    );
    expect(repo.simpanMailboxPesan).toHaveBeenCalledWith(
      expect.objectContaining({
        villageId: 7,
        arah: "keluar",
        alamat: "warga@example.test",
        isi: "Informasi sudah kami kirim.",
      }),
    );
    expect(repo.tandaiMailboxDibaca).toHaveBeenCalledWith(7, 41);
    expect(audit.recordAuditEvent).toHaveBeenCalled();
  });

  it("requires update permission before marking an inbound message read", async () => {
    vi.mocked(repo.getPesanMasukMailbox).mockResolvedValueOnce(pesanMasuk);

    await tandaiPesanMailboxDibaca(41);

    expect(dal.requirePermission).toHaveBeenCalledWith("notifikasi", "update");
    expect(repo.tandaiMailboxDibaca).toHaveBeenCalledWith(7, 41);
  });
});
