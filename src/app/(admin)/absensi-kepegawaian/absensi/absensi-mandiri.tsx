"use client";

import { useState } from "react";

import styles from "../absensi-kepegawaian.module.css";
import { absensiMandiriAction } from "../actions";

export function AbsensiMandiri({
  wajibGps = true,
  attendance,
}: {
  wajibGps?: boolean;
  attendance: { nama: string; jamMasuk: string | null; jamKeluar: string | null };
}) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("Lokasi belum diambil.");
  const [loading, setLoading] = useState(false);
  function ambilLokasi() {
    if (!navigator.geolocation) {
      setLocationStatus("Browser tidak mendukung GPS.");
      return;
    }
    setLoading(true);
    setLocationStatus("Mengambil koordinat GPS…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationStatus(
          `Lokasi berhasil diambil (akurasi ±${Math.round(position.coords.accuracy)} meter).`,
        );
        setLoading(false);
      },
      (error) => {
        setLocationStatus(
          error.code === 1
            ? "Izin lokasi ditolak. Aktifkan izin lokasi pada browser."
            : "Lokasi tidak berhasil diperoleh. Coba lagi di area terbuka.",
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  return (
    <section className={styles["ak-card"]} style={{ marginTop: 16 }}>
      <h2>Absensi Mandiri</h2>
      <p>
        {attendance.nama} ·{" "}
        {attendance.jamMasuk ? `Check-in ${attendance.jamMasuk}` : "Belum check-in"}
        {attendance.jamKeluar ? ` · Check-out ${attendance.jamKeluar}` : ""}
      </p>
      <p>
        Check-in dan check-out menggunakan lokasi GPS. Foto selfie digunakan sebagai bukti saat
        check-in.
      </p>
      <form action={absensiMandiriAction} className={styles["ak-form"]}>
        <input type="hidden" name="latitude" value={coords?.latitude ?? ""} />
        <input type="hidden" name="longitude" value={coords?.longitude ?? ""} />
        <div className={styles.wide}>
          <button
            type="button"
            className={styles["ak-button"]}
            onClick={ambilLokasi}
            disabled={loading}
          >
            {loading ? "Mengambil lokasi…" : "◎ Ambil Lokasi GPS"}
          </button>
          <p aria-live="polite">{locationStatus}</p>
          {!wajibGps ? (
            <small>
              Validasi GPS dinonaktifkan oleh administrator; koordinat tetap dapat dilampirkan jika
              tersedia.
            </small>
          ) : null}
        </div>
        <label className={styles.wide}>
          Foto Selfie
          <input type="file" name="foto" accept="image/jpeg,image/png,image/webp" capture="user" />
          <small>JPG, PNG, atau WEBP. Maksimal 5 MB.</small>
        </label>
        <button
          className={styles["ak-button"]}
          type="submit"
          disabled={Boolean(attendance.jamKeluar) || (wajibGps && !coords)}
        >
          {attendance.jamKeluar
            ? "Absensi Hari Ini Selesai"
            : attendance.jamMasuk
              ? "Check-out"
              : "Check-in"}
        </button>
      </form>
    </section>
  );
}
