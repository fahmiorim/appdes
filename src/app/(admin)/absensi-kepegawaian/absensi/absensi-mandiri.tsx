"use client";

import { useState } from "react";
import { absensiMandiriAction } from "../actions";
import styles from "../absensi-kepegawaian.module.css";

export function AbsensiMandiri() {
  const [coords,setCoords]=useState<{latitude:number;longitude:number}|null>(null);
  const [status,setStatus]=useState("Lokasi belum diambil.");
  const [loading,setLoading]=useState(false);
  function ambilLokasi() {
    if(!navigator.geolocation) { setStatus("Browser tidak mendukung GPS."); return; }
    setLoading(true);
    setStatus("Mengambil koordinat GPS…");
    navigator.geolocation.getCurrentPosition(
      (position)=>{
        setCoords({latitude:position.coords.latitude,longitude:position.coords.longitude});
        setStatus(`Lokasi berhasil diambil (akurasi ±${Math.round(position.coords.accuracy)} meter).`);
        setLoading(false);
      },
      (error)=>{
        setStatus(error.code===1?"Izin lokasi ditolak. Aktifkan izin lokasi pada browser.":"Lokasi tidak berhasil diperoleh. Coba lagi di area terbuka.");
        setLoading(false);
      },
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
  }
  return <section className={styles["ak-card"]} style={{marginTop:16}}>
    <h2>Absensi Mandiri</h2>
    <p>Check-in dan check-out menggunakan lokasi GPS. Foto selfie digunakan sebagai bukti saat check-in.</p>
    <form action={absensiMandiriAction} className={styles["ak-form"]}>
      <input type="hidden" name="latitude" value={coords?.latitude??""}/>
      <input type="hidden" name="longitude" value={coords?.longitude??""}/>
      <div className={styles.wide}>
        <button type="button" className={styles["ak-button"]} onClick={ambilLokasi} disabled={loading}>
          {loading?"Mengambil lokasi…":"◎ Ambil Lokasi GPS"}
        </button>
        <p aria-live="polite">{status}</p>
      </div>
      <label className={styles.wide}>Foto Selfie
        <input type="file" name="foto" accept="image/jpeg,image/png,image/webp" capture="user"/>
        <small>JPG, PNG, atau WEBP. Maksimal 5 MB.</small>
      </label>
      <button className={styles["ak-button"]} type="submit" disabled={!coords}>Kirim Absensi</button>
    </form>
  </section>;
}
