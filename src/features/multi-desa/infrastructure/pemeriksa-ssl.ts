import "server-only";

import tls from "node:tls";

import { klasifikasiSsl, type DataSsl } from "../domain/status-ssl";
import { resolusiHostPublik, type AlamatHost } from "./pemeriksa-host";

/**
 * Pemeriksa sertifikat TLS nyata untuk domain tenant.
 *
 * Verifikasi sertifikat TIDAK pernah dimatikan. Koneksi menuju alamat hasil
 * resolusi yang sudah divalidasi publik, dengan SNI hostname asli, sehingga
 * tidak ada resolusi DNS kedua yang dapat dibalik ke jaringan internal.
 */

const BATAS_WAKTU_MS = 8000;
const MAKS_ALAMAT_DICOBA = 3;

function keTanggal(nilai: string | undefined): Date | null {
  if (!nilai) return null;
  const tanggal = new Date(nilai);
  return Number.isNaN(tanggal.getTime()) ? null : tanggal;
}

function teksSertifikat(nilai: string | string[] | undefined): string | null {
  const teks = Array.isArray(nilai) ? nilai[0] : nilai;
  return teks?.trim() || null;
}

function pesanKesalahan(error: NodeJS.ErrnoException): string {
  switch (error.code) {
    case "CERT_HAS_EXPIRED":
      return "Sertifikat sudah kedaluwarsa.";
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "SELF_SIGNED_CERT_IN_CHAIN":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
      return "Sertifikat tidak dapat diverifikasi.";
    case "ERR_TLS_CERT_ALTNAME_INVALID":
      return "Nama domain tidak cocok dengan sertifikat.";
    case "ENOTFOUND":
      return "Domain tidak dapat diresolusi.";
    case "ECONNREFUSED":
      return "Koneksi TLS ditolak.";
    case "ETIMEDOUT":
      return "Koneksi TLS melewati batas waktu.";
    default:
      return "Pemeriksaan TLS gagal.";
  }
}

function hasilBermasalah(error: string, checkedAt: Date): DataSsl {
  return {
    status: "bermasalah",
    validFrom: null,
    validTo: null,
    issuer: null,
    error,
    checkedAt,
  };
}

function periksaSatuAlamat(host: string, tujuan: AlamatHost): Promise<DataSsl> {
  return new Promise((selesai) => {
    const checkedAt = new Date();
    let socket: tls.TLSSocket | null = null;
    let sudahSelesai = false;

    const selesaikan = (hasil: DataSsl) => {
      if (sudahSelesai) return;
      sudahSelesai = true;
      socket?.destroy();
      selesai(hasil);
    };

    try {
      const opsi: tls.ConnectionOptions = {
        host: tujuan.alamat,
        port: 443,
        servername: host,
        // Verifikasi sertifikat tetap aktif (default Node) dan tidak pernah
        // dimatikan lewat opsi apa pun.
        minVersion: "TLSv1.2",
        lookup: (_hostname, _opsi, panggil) => {
          panggil(null, tujuan.alamat, tujuan.family);
        },
      };

      socket = tls.connect(opsi, () => {
        if (!socket) return;
        const cert = socket.getPeerCertificate();
        const validTo = keTanggal(cert.valid_to);
        const validFrom = keTanggal(cert.valid_from);
        const issuer = teksSertifikat(cert.issuer?.O) ?? teksSertifikat(cert.issuer?.CN);

        if (!socket.authorized || !validTo) {
          selesaikan(hasilBermasalah("Sertifikat tidak dapat diverifikasi.", checkedAt));
          return;
        }

        selesaikan({
          status: klasifikasiSsl({
            authorized: socket.authorized,
            validTo,
            sekarang: checkedAt,
          }),
          validFrom,
          validTo,
          issuer,
          error: null,
          checkedAt,
        });
      });
    } catch {
      selesaikan(hasilBermasalah("Pemeriksaan TLS gagal.", checkedAt));
      return;
    }

    socket.setTimeout(BATAS_WAKTU_MS, () => {
      selesaikan(hasilBermasalah("Koneksi TLS melewati batas waktu.", checkedAt));
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      selesaikan(hasilBermasalah(pesanKesalahan(error), checkedAt));
    });
  });
}

/** Periksa satu domain; selalu mengembalikan hasil, tidak melempar error jaringan. */
export async function periksaSslDomain(domain: string): Promise<DataSsl> {
  const checkedAt = new Date();
  const resolusi = await resolusiHostPublik(domain);

  if (!resolusi.ok) return hasilBermasalah(resolusi.error, checkedAt);

  let terakhir: DataSsl | null = null;
  for (const alamat of resolusi.alamat.slice(0, MAKS_ALAMAT_DICOBA)) {
    const hasil = await periksaSatuAlamat(domain.trim().toLowerCase().replace(/\.$/, ""), alamat);
    if (hasil.status !== "bermasalah") return hasil;
    terakhir = hasil;
  }

  return terakhir ?? hasilBermasalah("Pemeriksaan TLS gagal.", checkedAt);
}
