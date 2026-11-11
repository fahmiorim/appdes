import { beforeEach, describe, expect, it, vi } from "vitest";

import * as repo from "../infrastructure/suplemen-publik-repository";
import {
  daftarSuplemenPublik,
  detailSuplemenPublik,
  labelSasaranPublik,
} from "./suplemen-publik-use-cases";

vi.mock("../infrastructure/suplemen-publik-repository", () => ({
  listSuplemenPublik: vi.fn(),
  getSuplemenPublikBySlug: vi.fn(),
}));

const ringkas = {
  id: 1,
  nama: "Penerima Bantuan",
  slug: "penerima-bantuan",
  sasaran: 1,
  keterangan: null,
  jumlahTerdata: 12,
};

describe("suplemen publik", () => {
  beforeEach(() => vi.clearAllMocks());

  it("meneruskan villageId ke repository", async () => {
    vi.mocked(repo.listSuplemenPublik).mockResolvedValueOnce([ringkas]);

    const hasil = await daftarSuplemenPublik(7);

    expect(repo.listSuplemenPublik).toHaveBeenCalledWith(7);
    expect(hasil[0]?.jumlahTerdata).toBe(12);
  });

  it("mengembalikan null bila slug tidak ada", async () => {
    vi.mocked(repo.getSuplemenPublikBySlug).mockResolvedValueOnce(null);

    await expect(detailSuplemenPublik(7, "tidak-ada")).resolves.toBeNull();
    expect(repo.getSuplemenPublikBySlug).toHaveBeenCalledWith(7, "tidak-ada");
  });

  it("memberi label sasaran yang benar", () => {
    expect(labelSasaranPublik(1)).toBe("Penduduk");
    expect(labelSasaranPublik(2)).toBe("Keluarga (KK)");
  });
});
