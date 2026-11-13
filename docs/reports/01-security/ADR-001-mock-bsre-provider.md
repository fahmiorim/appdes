# ADR-001 — Dokumentasi keputusan Mock BSrE Provider

- **Task:** Mendokumentasikan keputusan penggunaan mock provider BSrE untuk pengujian modul TTE sebelum akses resmi tersedia.
- **Tanggal:** 12 November 2026
- **Branch:** `docs/adr-mock-bsre-provider`
- **Base commit:** `d6f2a615d6a471b427ad35393250ba87f2aa3e05`
- **Commit terakhir saat laporan dibuat:** `35589f700a1722e417f15a5d274e98f8ff52686e`
- **Status:** Dokumentasi selesai untuk review; implementasi mock belum dimulai.

## Analisis

Dokumentasi sebelumnya membahas TTE sebagai integrasi pihak ketiga yang ditunda sampai SSRF/TLS ditangani dan provider diuji. Belum ada keputusan terdokumentasi tentang cara menguji adapter sebelum akses resmi BSrE tersedia.

## Keputusan

Mock BSrE disetujui sebagai standalone service di repository yang sama, pada `tools/mock-bsre/`, tetapi terpisah dari runtime Appdes. Mock hanya untuk development/test, bind ke loopback, memakai fixture dan credential dummy, tidak melakukan proxy ke internet, dan tidak boleh aktif pada production.

Mock hanya mensimulasikan kontrak API dan skenario error. Output-nya bukan tanda tangan elektronik tersertifikasi dan bukan bukti integrasi resmi BSrE.

Pengujian SSRF tidak boleh bergantung pada mock saja. Pengujian harus menggunakan resolver/transport terisolasi atau kontrol egress yang memastikan alamat koneksi tetap sesuai hasil validasi, termasuk perlindungan DNS rebinding.

## File diperiksa

- `AGENTS.md`
- `docs/MASTER_ROADMAP.md`
- `docs/TECHNICAL_AUDIT.md`
- `docs/SID_FEATURE_MAP.md`
- `src/features/surat/domain/tte.ts`
- `src/features/surat/domain/tte.test.ts`

## File berubah

- `docs/decisions/ADR-001-mock-bsre-provider.md` — keputusan, batasan arsitektur, kontrak simulasi, guardrail, pengujian, dan kriteria penerimaan.
- `docs/MASTER_ROADMAP.md` — memasukkan mock provider sebagai alat uji TTE di Fase 1 tanpa menggeser prioritas hardening.
- `docs/SID_FEATURE_MAP.md` — memperjelas status TTE dan membedakan mock dari integrasi resmi.
- `docs/reports/01-security/ADR-001-mock-bsre-provider.md` — laporan task ini.

Tidak ada source code, dependency, schema, migration, atau konfigurasi runtime yang diubah.

## Validasi

- **PASS:** Perubahan dokumentasi dibuat pada branch task terpisah dari `main`.
- **PASS:** Titik perubahan roadmap dan feature map diverifikasi sebelum diperbarui.
- **SKIPPED:** Typecheck, lint, unit test, integration test, dan build — task ini hanya mengubah Markdown.
- **SKIPPED:** Uji provider BSrE resmi — akses/credential resmi belum tersedia.
- **SKIPPED:** Implementasi dan pengujian runtime mock — berada pada task lanjutan setelah ADR direview.

## Risiko dan batasan

- Mock belum dibuat; dokumen ini hanya menetapkan keputusan dan acceptance criteria.
- Kontrak simulasi awal mengikuti endpoint dan payload yang saat ini dipakai adapter Appdes; kompatibilitas dengan BSrE resmi belum diverifikasi.
- Mitigasi SSRF belum selesai hanya dengan dokumentasi ini. Task AUD-019/AUD-020 tetap belum siap merge/produksi sampai validasi tujuan IP/DNS dan perlindungan DNS rebinding dibuktikan.
- Tidak ada PR, merge, atau deploy yang dilakukan.

## Kesimpulan

Keputusan teknis mock provider telah didokumentasikan dan diselaraskan dengan roadmap serta feature map. Langkah berikutnya adalah review ADR, kemudian implementasi mock sebagai task terpisah dan penyelesaian hardening SSRF TTE. Persetujuan merge tetap menunggu maintainer.
