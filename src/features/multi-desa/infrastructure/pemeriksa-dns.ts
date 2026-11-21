import "server-only";

import { klasifikasiDns, type DataDns } from "../domain/status-dns";
import { resolusiHostPublik } from "./pemeriksa-host";

/** Periksa DNS nyata untuk satu domain dan kembalikan hasil siap disimpan. */
export async function periksaDnsDomain(domain: string): Promise<DataDns> {
  const checkedAt = new Date();
  const hasil = await resolusiHostPublik(domain);

  if (!hasil.ok) {
    return {
      status: "bermasalah",
      addresses: [],
      error: hasil.error,
      checkedAt,
    };
  }

  const addresses = hasil.alamat.map((item) => item.alamat);
  return {
    status: klasifikasiDns({ addresses, semuaPublik: true }),
    addresses,
    error: null,
    checkedAt,
  };
}
