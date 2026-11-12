/**
 * Klasifikasi alamat IP untuk kebijakan SSRF adapter TTE.
 *
 * Modul ini murni: tanpa jaringan dan tanpa I/O, sehingga dapat diuji langsung.
 * Dipakai `tte-jaringan.ts` agar alamat yang dilarang tidak pernah dihubungi.
 *
 * Kebijakan: hanya unicast publik yang boleh dipakai. Loopback, private,
 * link-local, CGNAT, multicast, dokumentasi, benchmark, dan reserved ditolak —
 * termasuk alamat IPv6 yang menyematkan IPv4 privat (IPv4-mapped dan NAT64).
 */

/** Rentang IPv4 yang tidak boleh dihubungi (dasar, panjang prefix). */
const RENTANG_V4_TERLARANG: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, termasuk metadata 169.254.169.254
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay (deprecated)
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmark
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

/**
 * Rentang IPv6 di dalam `2000::/3` (global unicast) yang tetap ditolak.
 * Alamat di luar `2000::/3` (loopback, ULA, link-local, multicast, NAT64,
 * Teredo, IPv4-mapped) ditolak oleh pemeriksaan rentang global.
 */
const RENTANG_V6_TERLARANG: ReadonlyArray<readonly [string, number]> = [
  ["2001::", 32], // Teredo
  ["2001:2::", 48], // benchmarking
  ["2001:10::", 28], // ORCHIDv1
  ["2001:20::", 28], // ORCHIDv2
  ["2001:db8::", 32], // dokumentasi
  ["2002::", 16], // 6to4 (menyematkan IPv4)
  ["3fff::", 20], // dokumentasi (RFC 9637)
];

/** Host yang tidak pernah sah sebagai provider TTE. */
const HOST_TERLARANG_PERSIS = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "instance-data.ec2.internal",
]);

/** Akhiran host yang menandakan jaringan lokal/internal. */
const AKHIRAN_HOST_TERLARANG = [".localhost", ".local", ".internal", ".home.arpa", ".lan"];

function v4KeAngka(alamat: string): number | null {
  const oktaf = alamat.split(".");
  if (oktaf.length !== 4) return null;

  let nilai = 0;
  for (const bagian of oktaf) {
    if (!/^\d{1,3}$/.test(bagian)) return null;
    const angka = Number(bagian);
    if (angka > 255) return null;
    nilai = nilai * 256 + angka;
  }
  return nilai;
}

function dalamRentangV4(nilai: number, dasar: number, panjang: number): boolean {
  const mask = panjang === 0 ? 0 : (0xffffffff << (32 - panjang)) >>> 0;
  return (nilai & mask) === (dasar & mask);
}

function v4Terlarang(nilai: number): boolean {
  for (const [dasar, panjang] of RENTANG_V4_TERLARANG) {
    const angkaDasar = v4KeAngka(dasar);
    if (angkaDasar === null) continue;
    if (dalamRentangV4(nilai, angkaDasar, panjang)) return true;
  }
  return false;
}

/** Ubah alamat IPv6 menjadi BigInt 128-bit, atau `null` bila bentuknya tidak sah. */
function v6KeBigInt(alamat: string): bigint | null {
  let teks = alamat;
  const persen = teks.indexOf("%");
  if (persen !== -1) teks = teks.slice(0, persen); // zone id (link-local) → tolak nanti
  if (!teks.includes(":")) return null;

  // Ekor IPv4 (mis. ::ffff:192.168.1.1) diubah menjadi dua grup heksadesimal.
  const titikDuaTerakhir = teks.lastIndexOf(":");
  const ekor = teks.slice(titikDuaTerakhir + 1);
  if (ekor.includes(".")) {
    const nilaiV4 = v4KeAngka(ekor);
    if (nilaiV4 === null) return null;
    const tinggi = (nilaiV4 >>> 16).toString(16);
    const rendah = (nilaiV4 & 0xffff).toString(16);
    teks = `${teks.slice(0, titikDuaTerakhir + 1)}${tinggi}:${rendah}`;
  }

  const bagianGanda = teks.split("::");
  if (bagianGanda.length > 2) return null;

  let grup: string[];
  if (bagianGanda.length === 2) {
    const teksKiri = bagianGanda[0] ?? "";
    const teksKanan = bagianGanda[1] ?? "";
    const kiri = teksKiri === "" ? [] : teksKiri.split(":");
    const kanan = teksKanan === "" ? [] : teksKanan.split(":");
    const kosong = 8 - kiri.length - kanan.length;
    if (kosong < 1) return null;
    grup = [...kiri, ...Array.from({ length: kosong }, () => "0"), ...kanan];
  } else {
    grup = teks.split(":");
    if (grup.length !== 8) return null;
  }

  let nilai = 0n;
  for (const bagian of grup) {
    if (!/^[0-9a-f]{1,4}$/i.test(bagian)) return null;
    nilai = (nilai << 16n) | BigInt(Number.parseInt(bagian, 16));
  }
  return nilai;
}

function dalamRentangV6(nilai: bigint, awalan: string, panjang: number): boolean {
  const dasar = v6KeBigInt(awalan);
  if (dasar === null) return false;
  const mask = panjang === 0 ? 0n : ((1n << BigInt(panjang)) - 1n) << BigInt(128 - panjang);
  return (nilai & mask) === (dasar & mask);
}

function v6Publik(nilai: bigint): boolean {
  // IPv4-mapped (::ffff:0:0/96) dan NAT64 (64:ff9b::/96) dinilai dari IPv4-nya.
  if (dalamRentangV6(nilai, "::ffff:0:0", 96) || dalamRentangV6(nilai, "64:ff9b::", 96)) {
    return !v4Terlarang(Number(nilai & 0xffffffffn));
  }

  // Selain global unicast 2000::/3 (ULA, link-local, loopback, multicast, dst).
  if (!dalamRentangV6(nilai, "2000::", 3)) return false;

  for (const [awalan, panjang] of RENTANG_V6_TERLARANG) {
    if (dalamRentangV6(nilai, awalan, panjang)) return false;
  }
  return true;
}

export interface KlasifikasiAlamat {
  /** `true` bila masukan berbentuk alamat IP (v4/v6). */
  adalahIp: boolean;
  /** `true` bila alamat boleh dihubungi (unicast publik). */
  publik: boolean;
}

/**
 * Klasifikasikan alamat IP. Untuk masukan yang bukan IP, `adalahIp` bernilai
 * `false` dan keputusan harus diambil lewat resolusi DNS.
 */
export function klasifikasiAlamat(mentah: string): KlasifikasiAlamat {
  const alamat = mentah.trim().toLowerCase();
  if (alamat === "") return { adalahIp: false, publik: false };

  const tanpaKurung = alamat.startsWith("[") && alamat.endsWith("]") ? alamat.slice(1, -1) : alamat;

  const nilaiV4 = v4KeAngka(tanpaKurung);
  if (nilaiV4 !== null) return { adalahIp: true, publik: !v4Terlarang(nilaiV4) };

  if (tanpaKurung.includes(":")) {
    const nilaiV6 = v6KeBigInt(tanpaKurung);
    // Bentuk menyerupai IPv6 tetapi tidak sah → anggap IP dan tolak.
    return { adalahIp: true, publik: nilaiV6 === null ? false : v6Publik(nilaiV6) };
  }

  return { adalahIp: false, publik: false };
}

/** Apakah hostname (bukan IP) menandakan jaringan lokal/internal. */
export function hostTerlarang(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (host === "") return true;
  if (HOST_TERLARANG_PERSIS.has(host)) return true;
  return AKHIRAN_HOST_TERLARANG.some((akhiran) => host.endsWith(akhiran));
}
