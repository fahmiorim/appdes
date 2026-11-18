"use client";

import { useEffect, useRef, useState } from "react";

import type { TingkatWilayah, Wilayah } from "../domain/data-wilayah";

/**
 * Picker wilayah administratif untuk formulir desa.
 *
 * Data diambil per tingkat dari `/api/wilayah` (dataset Kepmendagri di server)
 * sehingga bundle browser tidak memuat daftar seluruh desa. Nama dan kode
 * wilayah terpilih dikirim sebagai input tersembunyi; desa yang dipilih
 * dilaporkan lewat `onPilihDesa` agar formulir mengisi nama dan kode desa.
 */

type KodeWilayah = Record<TingkatWilayah, string>;

const KODE_AWAL: KodeWilayah = { provinsi: "", kabupaten: "", kecamatan: "", desa: "" };

async function muatWilayah(
  tingkat: TingkatWilayah,
  induk: string | undefined,
  signal: AbortSignal,
): Promise<Wilayah[]> {
  const parameter = new URLSearchParams({ tingkat });
  if (induk) parameter.set("induk", induk);

  const res = await fetch(`/api/wilayah?${parameter.toString()}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const body = (await res.json()) as { data?: Wilayah[] };
  return body.data ?? [];
}

export function PickerWilayah({ onPilihDesa }: { onPilihDesa?: (desa: Wilayah | null) => void }) {
  const [kode, setKode] = useState<KodeWilayah>(KODE_AWAL);
  const [provinsi, setProvinsi] = useState<Wilayah[]>([]);
  const [kabupaten, setKabupaten] = useState<Wilayah[]>([]);
  const [kecamatan, setKecamatan] = useState<Wilayah[]>([]);
  const [desa, setDesa] = useState<Wilayah[]>([]);
  const [memuat, setMemuat] = useState<TingkatWilayah | null>("provinsi");
  const [galat, setGalat] = useState(false);
  const pembatal = useRef<AbortController | null>(null);

  useEffect(() => {
    const kontrol = new AbortController();
    pembatal.current = kontrol;

    muatWilayah("provinsi", undefined, kontrol.signal)
      .then(setProvinsi)
      .catch(() => {
        if (!kontrol.signal.aborted) setGalat(true);
      })
      .finally(() => {
        if (!kontrol.signal.aborted) setMemuat(null);
      });

    return () => kontrol.abort();
  }, []);

  /** Muat satu tingkat; permintaan lama dibatalkan agar pilihan tidak tertukar. */
  async function isi(
    tingkat: TingkatWilayah,
    induk: string,
    terapkan: (daftar: Wilayah[]) => void,
  ) {
    pembatal.current?.abort();
    const kontrol = new AbortController();
    pembatal.current = kontrol;

    setMemuat(tingkat);
    setGalat(false);

    try {
      terapkan(await muatWilayah(tingkat, induk, kontrol.signal));
    } catch {
      if (kontrol.signal.aborted) return;
      terapkan([]);
      setGalat(true);
    } finally {
      if (!kontrol.signal.aborted) setMemuat(null);
    }
  }

  function pilihProvinsi(nilai: string) {
    setKode({ ...KODE_AWAL, provinsi: nilai });
    setKabupaten([]);
    setKecamatan([]);
    setDesa([]);
    onPilihDesa?.(null);

    if (nilai) void isi("kabupaten", nilai, setKabupaten);
  }

  function pilihKabupaten(nilai: string) {
    setKode((lama) => ({ ...lama, kabupaten: nilai, kecamatan: "", desa: "" }));
    setKecamatan([]);
    setDesa([]);
    onPilihDesa?.(null);

    if (nilai) void isi("kecamatan", nilai, setKecamatan);
  }

  function pilihKecamatan(nilai: string) {
    setKode((lama) => ({ ...lama, kecamatan: nilai, desa: "" }));
    setDesa([]);
    onPilihDesa?.(null);

    if (nilai) void isi("desa", nilai, setDesa);
  }

  function pilihDesa(nilai: string) {
    setKode((lama) => ({ ...lama, desa: nilai }));

    const dipilih = desa.find((item) => item.kode === nilai) ?? null;
    onPilihDesa?.(dipilih);
  }

  const provinsiTerpilih = provinsi.find((item) => item.kode === kode.provinsi);
  const kabupatenTerpilih = kabupaten.find((item) => item.kode === kode.kabupaten);
  const kecamatanTerpilih = kecamatan.find((item) => item.kode === kode.kecamatan);

  return (
    <>
      <label className="form-field">
        <span className="form-label">Provinsi</span>
        <select
          className="form-input"
          value={kode.provinsi}
          disabled={memuat === "provinsi"}
          onChange={(event) => pilihProvinsi(event.target.value)}
        >
          <option value="">{memuat === "provinsi" ? "Memuat…" : "Pilih provinsi"}</option>
          {provinsi.map((item) => (
            <option key={item.kode} value={item.kode}>
              {item.nama}
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span className="form-label">Kabupaten/Kota</span>
        <select
          className="form-input"
          value={kode.kabupaten}
          disabled={!kode.provinsi || memuat === "kabupaten"}
          onChange={(event) => pilihKabupaten(event.target.value)}
        >
          <option value="">{memuat === "kabupaten" ? "Memuat…" : "Pilih kabupaten/kota"}</option>
          {kabupaten.map((item) => (
            <option key={item.kode} value={item.kode}>
              {item.nama}
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span className="form-label">Kecamatan</span>
        <select
          className="form-input"
          value={kode.kecamatan}
          disabled={!kode.kabupaten || memuat === "kecamatan"}
          onChange={(event) => pilihKecamatan(event.target.value)}
        >
          <option value="">{memuat === "kecamatan" ? "Memuat…" : "Pilih kecamatan"}</option>
          {kecamatan.map((item) => (
            <option key={item.kode} value={item.kode}>
              {item.nama}
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span className="form-label">Desa/Kelurahan</span>
        <select
          className="form-input"
          value={kode.desa}
          disabled={!kode.kecamatan || memuat === "desa"}
          onChange={(event) => pilihDesa(event.target.value)}
        >
          <option value="">{memuat === "desa" ? "Memuat…" : "Pilih desa/kelurahan"}</option>
          {desa.map((item) => (
            <option key={item.kode} value={item.kode}>
              {item.nama}
            </option>
          ))}
        </select>
      </label>

      <input type="hidden" name="province" value={provinsiTerpilih?.nama ?? ""} />
      <input type="hidden" name="provinceCode" value={provinsiTerpilih?.kode ?? ""} />
      <input type="hidden" name="regency" value={kabupatenTerpilih?.nama ?? ""} />
      <input type="hidden" name="regencyCode" value={kabupatenTerpilih?.kode ?? ""} />
      <input type="hidden" name="district" value={kecamatanTerpilih?.nama ?? ""} />
      <input type="hidden" name="districtCode" value={kecamatanTerpilih?.kode ?? ""} />

      {galat ? (
        <p className="form-help" role="alert">
          Data wilayah gagal dimuat. Periksa koneksi lalu pilih ulang.
        </p>
      ) : (
        <p className="form-help">Pilih desa/kelurahan untuk mengisi otomatis nama dan kode desa.</p>
      )}
    </>
  );
}
