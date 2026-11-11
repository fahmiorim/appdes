/**
 * Terbilang & aritmetika isian surat.
 *
 * Semua fungsi di sini murni (tanpa I/O) sehingga dapat diuji tanpa basis
 * data. Template surat dapat menyebut "Rp [terbilang:jumlah]" atau
 * "[hitung:jumlah * tarif]", dan nilai isian angka otomatis mendapat padanan
 * kata `<kode>_terbilang`.
 */

const SATUAN = [
  "nol",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
] as const;

/** Nama skala per kelompok tiga digit, dari triliun turun. */
const SKALA = ["", "ribu", "juta", "miliar", "triliun"] as const;

/** Batas maksimum input: 999 triliun (kebutuhan surat desa jauh di bawah ini). */
export const BATAS_TERBILANG = 999_999_999_999_999n;

/** Kata satuan aman terhadap indeks di luar tabel (fallback "nol"). */
function kata(i: number): string {
  return SATUAN[i] ?? "nol";
}

/** Nama skala aman terhadap indeks (kelompok ≥ 5 jadi tanpa skala). */
function namaSkala(i: number): string {
  return SKALA[i] ?? "";
}

/** Kata untuk kelompok 0-999. */
function kataKelompok(n: number): string {
  const ratus = Math.floor(n / 100);
  const sisa = n % 100;
  const bagian: string[] = [];

  if (ratus === 1) bagian.push("seratus");
  else if (ratus > 1) bagian.push(`${kata(ratus)} ratus`);

  if (sisa >= 20) {
    bagian.push(`${kata(Math.floor(sisa / 10))} puluh`);
    if (sisa % 10 > 0) bagian.push(kata(sisa % 10));
  } else if (sisa === 10) bagian.push("sepuluh");
  else if (sisa === 11) bagian.push("sebelas");
  else if (sisa >= 12) bagian.push(`${kata(sisa - 10)} belas`);
  else if (sisa > 0) bagian.push(kata(sisa));

  return bagian.join(" ");
}

/**
 * Ubah bilangan (boleh negatif dan pecahan; bagian pecahan dibaca per digit
 * setelah "koma") menjadi kata Indonesia.
 *
 * @example terbilang(1250) === "seribu dua ratus lima puluh"
 * @example terbilang("15") === "lima belas"
 */
export function terbilang(input: number | string): string {
  const teks = String(input).trim().replace(/\s/g, "").replace(",", ".");
  if (teks === "" || !/^-?\d+(?:\.\d+)?$/.test(teks)) return "nol";

  const negatif = teks.startsWith("-");
  const [bagianBulat, bagianPecahan] = (negatif ? teks.slice(1) : teks).split(".");

  let sisa = BigInt(bagianBulat ?? "0");
  if (sisa > BATAS_TERBILANG) return "nol";

  const kelompok: number[] = [];
  while (sisa > 0n) {
    kelompok.push(Number(sisa % 1000n));
    sisa /= 1000n;
  }

  const utama: string[] = [];
  for (let i = kelompok.length - 1; i >= 0; i -= 1) {
    const nilai = kelompok[i];
    if (nilai === undefined || nilai === 0) continue;

    // Konvensi Indonesia: 1 ribu -> "seribu", tetapi 1 juta -> "satu juta".
    const skala = namaSkala(i);
    utama.push(
      nilai === 1 && i === 1
        ? "seribu"
        : `${kataKelompok(nilai)}${skala === "" ? "" : ` ${skala}`}`,
    );
  }

  let hasil = (negatif ? "minus " : "") + (utama.join(" ") || "nol");

  if (bagianPecahan !== undefined && bagianPecahan.length > 0) {
    const kataPecahan = bagianPecahan
      .split("")
      .map((digit) => kata(Number(digit)))
      .join(" ");
    hasil += ` koma ${kataPecahan}`;
  }

  return hasil;
}

/** Terbilang dengan satuan rupiah, mis. "dua puluh lima ribu rupiah". */
export function terbilangRupiah(input: number | string): string {
  return `${terbilang(input)} rupiah`;
}

// ── Aritmetika isian ────────────────────────────────────────────────────────

/** Format angka hasil ekspresi: maksimal 2 desimal, tanpa nol ikutan. */
export function formatAngkaEkspresi(n: number): string {
  const hasil = Math.round((n + Number.EPSILON) * 100) / 100;
  return Number.isInteger(hasil) ? String(hasil) : String(hasil).replace(".", ",");
}

type Token = { jenis: "angka" | "ident" | "op"; nilai: string };

/** Tokenisasi ekspresi: angka (boleh desimal), identifikator, atau operator. */
function lex(ekspresi: string): Token[] | null {
  const pola = /\s*(?:(\d+(?:[.,]\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|([+\-*/%()])|(\S))/g;
  const token: Token[] = [];
  let hasil: RegExpExecArray | null;

  while ((hasil = pola.exec(ekspresi)) !== null) {
    if (hasil[4] !== undefined) return null; // karakter tidak dikenal
    if (hasil[1] !== undefined) token.push({ jenis: "angka", nilai: hasil[1] });
    else if (hasil[2] !== undefined) token.push({ jenis: "ident", nilai: hasil[2] });
    else if (hasil[3] !== undefined) token.push({ jenis: "op", nilai: hasil[3] });
  }

  return token;
}

/**
 * Parser recursive-descent: ekspresi -> term (dengan `+ -`) -> faktor
 * (`* / %`) -> unari. Mengembalikan null bila ekspresi tidak sah, termasuk
 * identifikator yang nilainya bukan angka atau pembagian dengan nol.
 */
function bacaEkspresi(
  token: readonly Token[],
  angka: (ident: string) => number | null,
): number | null {
  let pos = 0;

  function makan(op: string): boolean {
    const t = token[pos];
    if (pos < token.length && t?.jenis === "op" && t.nilai === op) {
      pos += 1;
      return true;
    }
    return false;
  }

  // ekspresi -> term (('+' | '-') term)*
  function ekspresi(): number | null {
    let kiri = term();
    if (kiri === null) return null;

    for (;;) {
      if (makan("+")) {
        const kanan = term();
        if (kanan === null) return null;
        kiri += kanan;
      } else if (makan("-")) {
        const kanan = term();
        if (kanan === null) return null;
        kiri -= kanan;
      } else {
        return kiri;
      }
    }
  }

  // term -> faktor (('*' | '/' | '%') faktor)*
  function term(): number | null {
    let kiri = faktor();
    if (kiri === null) return null;

    for (;;) {
      if (makan("*")) {
        const kanan = faktor();
        if (kanan === null) return null;
        kiri *= kanan;
      } else if (makan("/")) {
        const kanan = faktor();
        if (kanan === null || kanan === 0) return null;
        kiri /= kanan;
      } else if (makan("%")) {
        const kanan = faktor();
        if (kanan === null || kanan === 0) return null;
        kiri %= kanan;
      } else {
        return kiri;
      }
    }
  }

  // faktor -> '(' ekspresi ')' | '-' faktor | angka | identifikator
  function faktor(): number | null {
    if (makan("(")) {
      const dalam = ekspresi();
      if (dalam === null || !makan(")")) return null;
      return dalam;
    }

    if (makan("-")) {
      const dalam = faktor();
      return dalam === null ? null : -dalam;
    }

    if (pos >= token.length) return null;
    const t = token[pos];
    if (t === undefined) return null;

    if (t.jenis === "angka") {
      pos += 1;
      return Number(t.nilai.replace(",", "."));
    }

    if (t.jenis === "ident") {
      pos += 1;
      return angka(t.nilai); // null -> ekspresi dianggap tidak sah
    }

    return null;
  }

  const nilai = ekspresi();
  return pos === token.length ? nilai : null;
}

/**
 * Hitung ekspresi isian dengan pemetaan identifikator -> angka (dari nilai
 * isian surat).
 *
 * Mengembalikan `null` bila ekspresi tidak sah: identifikator tanpa nilai
 * angka, pembagian/modulo nol, atau sintaks yang salah.
 */
export function evaluasiEkspresiIsian(
  ekspresi: string,
  values: Readonly<Record<string, string>>,
): number | null {
  const token = lex(ekspresi);
  if (token === null || token.length === 0) return null;

  return bacaEkspresi(token, (ident) => {
    const raw = values[ident];
    if (raw === undefined || raw.trim() === "") return null;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  });
}

const UJI_ANGKA = /^-?\d+(?:[.,]\d+)?$/;

/**
 * Sisipkan hasil terbilang & aritmetika ke template.
 *
 * Token yang didukung (dipanggil setelah placeholder biasa terisi):
 * - `[terbilang:KODE]`        -> kata angka nilai isian `KODE`
 * - `[terbilang_rupiah:KODE]` -> kata angka + " rupiah"
 * - `[hitung:EKSPRESI]`       -> hasil aritmetika; identifikator = kode isian
 *
 * Token yang tidak dapat dihitung dibiarkan utuh agar operator melihat
 * kekurangan nilai — data tidak pernah digantikan dengan angka keliru.
 */
export function isiTerbilangDanHitung(
  template: string,
  values: Readonly<Record<string, string>>,
): string {
  let hasil = template.replace(
    /\[terbilang(?:_([A-Za-z0-9_]+))?:\s*([A-Za-z0-9_]+)\s*\]/gi,
    (match, unit?: string, kode = "") => {
      const nilai = values[kode] ?? "";
      if (!UJI_ANGKA.test(nilai.replace(/\s/g, ""))) return match;
      return (unit ?? "").toLowerCase() === "rupiah" ? terbilangRupiah(nilai) : terbilang(nilai);
    },
  );

  hasil = hasil.replace(/\[hitung:\s*([^\][]+?)\s*\]/gi, (match, ekspresi: string) => {
    const hasilEkspresi = evaluasiEkspresiIsian(ekspresi, values);
    return hasilEkspresi === null ? match : formatAngkaEkspresi(hasilEkspresi);
  });

  return hasil;
}

/**
 * Padanan kata untuk seluruh nilai isian angka: kode `jumlah` mendapat
 * `jumlah_terbilang`. Dipakai otomatis oleh `buildValues` sehingga penulis
 * template dapat langsung memakai `[jumlah_terbilang]`.
 */
export function terbilangIsi(values: Readonly<Record<string, string>>): Record<string, string> {
  const hasil: Record<string, string> = {};

  for (const [kode, nilai] of Object.entries(values)) {
    if (kode.endsWith("_terbilang")) continue;
    if (UJI_ANGKA.test(nilai.replace(/\s/g, ""))) {
      hasil[`${kode}_terbilang`] = terbilang(nilai);
    }
  }

  return hasil;
}
