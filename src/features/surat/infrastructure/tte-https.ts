import { Resolver } from "node:dns/promises";
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

/** Batas resolusi DNS bersamaan agar query yang menggantung tidak menumpuk. */
const MAKS_RESOLUSI_BERSAMAAN = 8;

/**
 * Penjaga konkurensi: permintaan baru ditolak saat batas tercapai (fail fast)
 * alih-alih menumpuk antrean tanpa batas. Slot selalu dilepas di `finally`,
 * termasuk saat timeout, sehingga query yang menggantung tidak menghabiskan
 * resource. Diekspor agar dapat diuji tanpa jaringan.
 */
export function buatPenjagaKonkurensi(maks: number): <T>(kerja: () => Promise<T>) => Promise<T> {
  if (!Number.isInteger(maks) || maks < 1) {
    throw new Error("Batas konkurensi TTE tidak valid.");
  }

  let aktif = 0;
  return async <T>(kerja: () => Promise<T>): Promise<T> => {
    if (aktif >= maks) throw new Error("Terlalu banyak resolusi DNS TTE bersamaan.");
    aktif += 1;
    try {
      return await kerja();
    } finally {
      aktif -= 1;
    }
  };
}

const PESAN_BATAS_WAKTU = "Permintaan TTE melewati batas waktu.";

/**
 * Resolver produksi: seluruh alamat A/AAAA untuk satu hostname.
 *
 * Memakai `dns.Resolver` (c-ares) karena menyediakan `cancel()` sehingga query
 * benar-benar dihentikan saat batas waktu operasi habis — `dns.lookup` tidak
 * dapat dibatalkan. Konsekuensi: resolver sistem dan entri hosts file tidak
 * dipakai; hostname provider harus ada di DNS publik, sejalan dengan aturan
 * "alamat hasil resolusi wajib publik" di domain.
 *
 * Setiap panggilan memakai instance `Resolver` baru agar `cancel()` tidak
 * memengaruhi resolusi lain; listener abort dilepas dan query dibatalkan di
 * `finally` untuk semua jalur (sukses, gagal, timeout).
 */
export function buatResolverDns(opsi: { maksBersamaan?: number } = {}): ResolverDns {
  const jalankan = buatPenjagaKonkurensi(opsi.maksBersamaan ?? MAKS_RESOLUSI_BERSAMAAN);

  return (hostname, signal) =>
    jalankan(async () => {
      const resolver = new Resolver({ timeout: 5000, tries: 1 });

      let tolakBatal: ((error: Error) => void) | undefined;
      const dibatalkan = new Promise<never>((_, gagal) => {
        tolakBatal = gagal;
      });
      // Abort dapat terjadi sebelum `Promise.race` dipasang (mis. tepat saat
      // listener dipasang). Rejection tetap dianggap tertangani sehingga tidak
      // menjadi unhandled rejection pada jalur tersebut.
      dibatalkan.catch(() => {});

      // `Resolver.cancel()` idempoten; aman dipanggil lebih dari sekali.
      const padaAbort = () => {
        resolver.cancel();
        tolakBatal?.(new Error(PESAN_BATAS_WAKTU));
      };

      // Listener dipasang SEBELUM query dimulai agar abort yang terjadi tepat
      // setelah pemeriksaan awal tidak terlewat (menutup race R-13).
      signal?.addEventListener("abort", padaAbort, { once: true });
      try {
        // Periksa ulang setelah listener terpasang: bila abort sudah terjadi,
        // jangan pernah memulai query DNS.
        if (signal?.aborted) {
          resolver.cancel();
          throw new Error(PESAN_BATAS_WAKTU);
        }

        const kerja = Promise.allSettled([
          resolver.resolve4(hostname),
          resolver.resolve6(hostname),
        ]);
        const hasil = await Promise.race([kerja, dibatalkan]);
        const alamat: AlamatDns[] = [];
        hasil.forEach((bagian, indeks) => {
          if (bagian.status !== "fulfilled") return;
          const family = indeks === 0 ? 4 : 6;
          for (const address of bagian.value) alamat.push({ alamat: address, family });
        });
        if (alamat.length === 0) throw new Error("Host provider TTE tidak dapat diresolusi.");
        return alamat;
      } finally {
        signal?.removeEventListener("abort", padaAbort);
        resolver.cancel();
      }
    });
}

/** Klien BSrE siap pakai untuk use case (transport + resolver Node). */
export function buatKlienBsreNode(
  opsi: OpsiTransportTte & { allowedHosts: readonly string[] },
): KlienTte {
  return buatKlienBsre({
    transport: buatTransportTte(opsi),
    resolver: buatResolverDns(),
    allowedHosts: opsi.allowedHosts,
  });
}
