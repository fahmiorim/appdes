import { hostCandidates, normalizeBaseDomain, normalizeHost } from "./host";

/**
 * Pemetaan tenant (desa) dari host permintaan.
 *
 * Fungsi di sini murni: tidak menyentuh database, `next/headers`, atau sesi.
 * Tujuannya agar aturan isolasi tenant — host desa A tidak boleh menghasilkan
 * desa B, dan host tak dikenal tidak boleh diam-diam memakai desa lain — dapat
 * diuji tanpa basis data.
 */
export interface PetaDesa {
  /** Domain ternormalisasi → id desa. */
  domain: ReadonlyMap<string, number>;
  /** Label subdomain ternormalisasi → id desa (wildcard `*.base`). */
  subdomain: ReadonlyMap<string, number>;
  /** Domain induk wildcard ternormalisasi, mis. `desa.id`. */
  baseDomain: string;
  /** Jumlah desa unik pada instalasi. */
  jumlahDesa: number;
  /** Id desa pertama (fallback **hanya** bila instalasi berisi satu desa). */
  desaPertamaId: number | null;
}

/** Satu baris desa yang dibutuhkan resolver host. */
export interface BarisDesa {
  id: number;
  /** Satu baris per domain/alias; `null` bila desa belum punya domain. */
  domain: string | null;
  /** Label subdomain untuk wildcard (opsional). */
  slug?: string | null;
}

/**
 * Susun peta domain dari daftar desa.
 *
 * `daftar` harus terurut menaik berdasarkan id agar `desaPertamaId` konsisten
 * dengan `getFirstVillageId()`. Domain disimpan ternormalisasi; baris tanpa
 * domain dilewati. Bila ada domain duplikat (seharusnya dicegah indeks unik),
 * desa dengan id lebih kecil yang dipakai.
 */
export function susunPetaDesa(daftar: readonly BarisDesa[], baseDomain?: string | null): PetaDesa {
  const domain = new Map<string, number>();
  const subdomain = new Map<string, number>();
  const desaUnik = new Set<number>();

  for (const desa of daftar) {
    desaUnik.add(desa.id);

    const slug = desa.slug ? normalizeHost(desa.slug) : "";
    if (slug && !subdomain.has(slug)) subdomain.set(slug, desa.id);

    if (!desa.domain) continue;

    const kunci = normalizeHost(desa.domain);
    if (!kunci || domain.has(kunci)) continue;

    domain.set(kunci, desa.id);
  }

  return {
    domain,
    subdomain,
    baseDomain: normalizeBaseDomain(baseDomain),
    jumlahDesa: desaUnik.size,
    desaPertamaId: daftar[0]?.id ?? null,
  };
}

/**
 * Tentukan id desa dari host permintaan.
 *
 * Urutan: domain persis → alias `www` → fallback satu-desa. Fallback hanya
 * berlaku bila instalasi benar-benar berisi satu desa; pada instalasi
 * multi-desa, host tak dikenal menghasilkan `null` (pemanggil menerjemahkannya
 * menjadi 404) sehingga tenant tidak bocor.
 */
export function villageIdDariHost(host: string | null | undefined, peta: PetaDesa): number | null {
  const kandidat = hostCandidates(host);

  // 1. Domain/alias terdaftar selalu menang.
  for (const kunci of kandidat) {
    const id = peta.domain.get(kunci);
    if (id !== undefined) return id;
  }

  // 2. Wildcard `<slug>.<baseDomain>`; label tidak boleh berisi titik agar
  //    `a.b.desa.id` tidak diam-diam memakai desa `a`.
  if (peta.baseDomain) {
    for (const kunci of kandidat) {
      if (!kunci.endsWith(`.${peta.baseDomain}`)) continue;

      const label = kunci.slice(0, -(peta.baseDomain.length + 1));
      if (!label || label.includes(".")) continue;

      const id = peta.subdomain.get(label);
      if (id !== undefined) return id;
    }
  }

  return peta.jumlahDesa === 1 ? peta.desaPertamaId : null;
}
