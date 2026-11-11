import {
  hasilBatasPermintaan,
  type HasilBatasPermintaan,
  type OpsiBatasPermintaan,
} from "../domain/rate-limit";
import { catatPermintaanRateLimit } from "../infrastructure/rate-limit-repository";

/** Record a request and enforce a shared sliding-window quota across instances. */
export async function batasiPermintaan(
  key: string,
  opsi: OpsiBatasPermintaan = {},
): Promise<HasilBatasPermintaan> {
  const batas = opsi.batas ?? 60;
  const jendelaMs = opsi.jendelaMs ?? 60_000;
  const sekarang = opsi.sekarang ?? Date.now();

  if (!Number.isSafeInteger(batas) || batas < 1) {
    throw new RangeError("batas harus berupa bilangan bulat positif");
  }
  if (!Number.isSafeInteger(jendelaMs) || jendelaMs < 1) {
    throw new RangeError("jendelaMs harus berupa bilangan bulat positif");
  }
  if (!Number.isSafeInteger(sekarang) || sekarang < 0) {
    throw new RangeError("sekarang harus berupa bilangan bulat non-negatif");
  }

  const catatan = await catatPermintaanRateLimit(key, batas, jendelaMs, sekarang);
  return hasilBatasPermintaan(catatan.jumlah, batas, catatan.resetMs);
}
