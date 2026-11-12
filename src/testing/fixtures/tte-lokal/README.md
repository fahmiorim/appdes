# Sertifikat uji TTE lokal

Sertifikat dan kunci di folder ini **bukan rahasia** dan tidak dipakai untuk
apa pun selain pengujian unit transport TTE di `127.0.0.1`:

- self-signed, berlaku 10 tahun, hanya untuk hostname `provider.test` dan
  alamat `127.0.0.1` (SAN);
- dianggap tepercaya **hanya** lewat opsi `ca` pada test
  (`buatTransportTte({ ca })`), sehingga verifikasi sertifikat tetap aktif dan
  tidak ada pengaturan TLS global yang dimatikan;
- kunci ini tidak memberi akses ke sistem, layanan, atau akun mana pun.

Regenerasi bila kedaluwarsa:

```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout key.pem -out cert.pem -days 3650 \
  -subj "//CN=provider.test" \
  -addext "subjectAltName=DNS:provider.test,IP:127.0.0.1"
```
