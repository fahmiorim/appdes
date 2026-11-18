# Dataset wilayah administratif

Berkas JSON di folder ini dipakai picker wilayah pada formulir pendaftaran desa
(`src/features/wilayah/presentation/picker-wilayah.tsx`) dan disajikan oleh
`/api/wilayah`.

- **Sumber:** dump `db/wilayah.sql` dari <https://github.com/cahyadsn/wilayah>
  (lisensi MIT), berisi Kode dan Data Wilayah Administrasi Pemerintahan sesuai
  Kepmendagri No. 300.2.2-2138 Tahun 2025.
- **Cakupan:** 38 provinsi, 514 kabupaten/kota, 7.285 kecamatan, dan 83.762
  desa/kelurahan. Kode desa disimpan sebagai 10 digit tanpa titik.
- **Bentuk:**
  - `provinsi.json` — `[["11","Aceh"], ...]`
  - `kabupaten.json` — `{ "11": [["11.01","Kabupaten Aceh Selatan"], ...] }`
  - `kecamatan.json` — `{ "11.01": [["11.01.01","Bakongan"], ...] }`
  - `desa.json` — `{ "11.01.01": [["1101012001","Keude Bakongan"], ...] }`

Regenerasi setelah ada Kepmendagri baru:

```bash
node scripts/wilayah/generate-wilayah.mjs
```

Skrip menolak menulis bila jumlah wilayah jauh di bawah cakupan normal,
sehingga unduhan yang terpotong tidak diam-diam merusak dataset.
