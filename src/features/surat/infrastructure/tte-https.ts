import { lookup as lookupDns } from "node:dns/promises";
import type { ClientRequest, IncomingMessage } from "node:http";
import https from "node:https";
import { isIP } from "node:net";

import { buatKlienBsre, type KlienTte } from "../domain/tte";
import type {
  AlamatDns,
  PermintaanHttpTte,
  ResolverDns,
  ResponsTte,
  TransportTte,
} from "../domain/tte-jaringan";

/**
 * Implementasi jaringan adapter TTE di atas modul `node:https`.
 *
 * Mengapa bukan `fetch`: pinning DNS memerlukan kontrol atas alamat yang
 * dipakai saat koneksi. `fetch` (undici) tidak menyediakan jalur yang aman
 * untuk itu tanpa mengganti dependency, sedangkan `https.request` mendukung
 * `lookup` kustom. Dengan `autoSelectFamily: false`, `lookup` dihormati
 * sehingga koneksi selalu menuju alamat hasil validasi.
 *
 * SNI tetap dikirim sebagai hostname asli (`servername`) dan verifikasi
 * sertifikat tetap aktif: tidak ada opsi untuk mematikannya di sini.
 */
/**
 * Opsi `https.request` + `autoSelectFamily`.
 *
 * Opsi ini ada di Node sejak v20 (dipakai agar `lookup` kustom dihormati),
 * tetapi belum dideklarasikan pada `@types/node` yang dipakai proyek.
 */
interface OpsiHttpsTte extends https.RequestOptions {
  autoSelectFamily?: boolean;
}

export interface OpsiTransportTte {
  /**
   * CA tambahan untuk pengujian dengan sertifikat lokal. Tidak pernah diisi
   * dari konfigurasi tenant maupun environment; hanya dipakai test.
   */
  ca?: string | string[];
}

function keBuffer(bagian: unknown): Buffer {
  if (Buffer.isBuffer(bagian)) return bagian;
  return Buffer.from(bagian as Uint8Array);
}

function bungkusRespons(res: IncomingMessage, req: ClientRequest): ResponsTte {
  return {
    status: res.statusCode ?? 0,
    header: (nama) => {
      const nilai = res.headers[nama.toLowerCase()];
      return Array.isArray(nilai) ? nilai.join(", ") : (nilai ?? null);
    },
    baca: async (maksByte) => {
      const potongan: Buffer[] = [];
      let total = 0;

      for await (const bagian of res) {
        const buf = keBuffer(bagian);
        total += buf.byteLength;
        if (total > maksByte) {
          res.destroy();
          req.destroy();
          throw new Error("Respons provider TTE melebihi batas ukuran.");
        }
        potongan.push(buf);
      }

      return new Uint8Array(Buffer.concat(potongan));
    },
  };
}

/** Transport HTTPS yang menyambung ke satu alamat IP hasil validasi. */
export function buatTransportTte(opsiTransport: OpsiTransportTte = {}): TransportTte {
  return (url, permintaan: PermintaanHttpTte, alamat: string) =>
    new Promise<ResponsTte>((selesai, gagal) => {
      const keluarga = isIP(alamat);
      if (keluarga !== 4 && keluarga !== 6) {
        gagal(new Error("Alamat tujuan TTE tidak valid."));
        return;
      }
      if (permintaan.signal.aborted) {
        gagal(new Error("Permintaan TTE melewati batas waktu."));
        return;
      }

      const opsi: OpsiHttpsTte = {
        host: url.hostname,
        // SNI memakai hostname asli agar sertifikat tetap diverifikasi
        // terhadap nama provider, bukan terhadap alamat IP.
        servername: url.hostname,
        port: url.port === "" ? 443 : Number(url.port),
        path: `${url.pathname}${url.search}`,
        method: permintaan.method,
        headers: permintaan.headers,
        ca: opsiTransport.ca,
        // `lookup` hanya dihormati bila pemilihan keluarga otomatis dimatikan.
        autoSelectFamily: false,
        lookup: (hostname, opsiLookup, panggil) => {
          panggil(null, alamat, keluarga);
        },
        signal: permintaan.signal,
      };

      const req = https.request(opsi, (res) => selesai(bungkusRespons(res, req)));

      req.on("error", gagal);
      if (permintaan.body && permintaan.body.byteLength > 0) {
        req.write(Buffer.from(permintaan.body));
      }
      req.end();
    });
}

/** Resolver produksi: seluruh alamat A/AAAA untuk satu hostname. */
export function buatResolverDns(): ResolverDns {
  return async (hostname) => {
    const hasil = await lookupDns(hostname, { all: true, verbatim: true });
    return hasil.map(({ address, family }): AlamatDns => ({ alamat: address, family }));
  };
}

/** Klien BSrE siap pakai untuk use case (transport + resolver Node). */
export function buatKlienBsreNode(opsi: OpsiTransportTte = {}): KlienTte {
  return buatKlienBsre({
    transport: buatTransportTte(opsi),
    resolver: buatResolverDns(),
  });
}
