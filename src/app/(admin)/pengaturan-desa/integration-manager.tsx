"use client";

import { useEffect, useState } from "react";

import styles from "./pengaturan-desa.module.css";

type TteData = {
  tersimpan: {
    mode: "nonaktif" | "manual" | "bsre";
    api: string;
    username: string;
    nik: string;
    aktif: boolean;
  };
  masalah: string[];
  passwordTersedia: boolean;
  canManage: boolean;
};
type ApiKey = {
  id: number;
  name: string;
  prefix: string;
  rateLimit: number;
  active: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};
type NewKey = {
  id: number;
  key: string;
  prefix: string;
  name: string;
  rateLimit: number;
  expiresAt: string | null;
};
export function IntegrationManager() {
  const [tte, setTte] = useState<TteData | null>(null),
    [mode, setMode] = useState<"nonaktif" | "manual" | "bsre">("nonaktif"),
    [api, setApi] = useState(""),
    [username, setUsername] = useState(""),
    [nik, setNik] = useState(""),
    [active, setActive] = useState(false);
  const [keys, setKeys] = useState<ApiKey[]>([]),
    [keyName, setKeyName] = useState(""),
    [rateLimit, setRateLimit] = useState(100),
    [expiresAt, setExpiresAt] = useState(""),
    [newKey, setNewKey] = useState<NewKey | null>(null);
  const [busy, setBusy] = useState(true),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function muatIntegrasi() {
    const [tr, kr] = await Promise.all([
      fetch("/api/pengaturan-desa/tte", { cache: "no-store" }),
      fetch("/api/pengaturan/api-key", { cache: "no-store" }),
    ]);
    const td = await tr.json(),
      kd = await kr.json();
    if (!tr.ok) throw new Error(td.error || "Tidak dapat memuat konfigurasi TTE.");
    if (!kr.ok) throw new Error(kd.error || "Tidak dapat memuat kunci API.");
    return { td, kd };
  }
  function terapkanIntegrasi(td: TteData, kd: { data?: ApiKey[] }) {
    setTte(td);
    setMode(td.tersimpan.mode);
    setApi(td.tersimpan.api);
    setUsername(td.tersimpan.username);
    setNik(td.tersimpan.nik);
    setActive(td.tersimpan.aktif);
    setKeys(kd.data ?? []);
  }
  async function load() {
    setBusy(true);
    try {
      const { td, kd } = await muatIntegrasi();
      terapkanIntegrasi(td, kd);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat integrasi.");
    } finally {
      setBusy(false);
    }
  }
  // Pemuatan pertama memakai rantai promise agar setState terjadi setelah await,
  // bukan sinkron di dalam effect (react-hooks/set-state-in-effect).
  useEffect(() => {
    let aktif = true;
    muatIntegrasi()
      .then(({ td, kd }) => {
        if (aktif) terapkanIntegrasi(td, kd);
      })
      .catch((e: unknown) => {
        if (aktif) setError(e instanceof Error ? e.message : "Gagal memuat integrasi.");
      })
      .finally(() => {
        if (aktif) setBusy(false);
      });
    return () => {
      aktif = false;
    };
  }, []);
  async function saveTte() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/pengaturan-desa/tte", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, api, username, nik, aktif: active }),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan TTE.");
      setMessage(d.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan TTE.");
    } finally {
      setBusy(false);
    }
  }
  async function createKey() {
    setBusy(true);
    setError("");
    setMessage("");
    setNewKey(null);
    try {
      const r = await fetch("/api/pengaturan/api-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: keyName,
            rateLimit,
            expiresAt: expiresAt ? new Date(expiresAt + "T23:59:59").toISOString() : null,
          }),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal membuat kunci API.");
      setNewKey(d.data);
      setKeyName("");
      setMessage("Kunci API dibuat. Salin sekarang karena secret hanya ditampilkan sekali.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat kunci API.");
    } finally {
      setBusy(false);
    }
  }
  async function revokeKey(item: ApiKey) {
    if (!window.confirm("Nonaktifkan kunci " + item.name + "?")) return;
    setBusy(true);
    try {
      const r = await fetch("/api/pengaturan/api-key?id=" + item.id, { method: "DELETE" }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menonaktifkan kunci.");
      setMessage("Kunci API berhasil dinonaktifkan.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menonaktifkan kunci.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.integrationStack}>
      {message && (
        <div className={styles.success} role="status">
          {message}
        </div>
      )}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      <section className={styles.panel}>
        <header>
          <h2>▣　Tanda Tangan Elektronik (BSrE)</h2>
          <p>
            Konfigurasi koneksi TTE desa. Passphrase tidak disimpan atau ditampilkan; dikelola Super
            Admin melalui environment server.
          </p>
        </header>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            Mode TTE
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="nonaktif">Nonaktif</option>
              <option value="manual">Manual (tanda tangan basah)</option>
              <option value="bsre">BSrE (elektronik)</option>
            </select>
          </label>
          <label className={styles.field}>
            URL Provider BSrE
            <input
              value={api}
              onChange={(e) => setApi(e.target.value)}
              placeholder="https://tte.example.go.id"
            />
          </label>
          <label className={styles.field}>
            Username BSrE
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className={styles.field}>
            NIK Penanda Tangan
            <input
              inputMode="numeric"
              maxLength={16}
              value={nik}
              onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
            />
          </label>
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />{" "}
          Aktifkan konfigurasi TTE untuk desa
        </label>
        {tte?.masalah?.length ? (
          <div className={styles.notice}>
            <strong>Catatan validasi:</strong>
            <ul>
              {tte.masalah.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className={styles.muted}>
            Konfigurasi saat ini memenuhi validasi lokal. Ketersediaan provider tetap bergantung
            pada kredensial dan allowlist platform.
          </p>
        )}
        <div className={styles.actions}>
          <button
            className={styles.primary}
            disabled={busy || !tte?.canManage}
            onClick={() => void saveTte()}
          >
            Simpan Konfigurasi TTE
          </button>
          <span>
            {tte?.passwordTersedia
              ? "Passphrase server tersedia."
              : "Passphrase TTE belum disetel oleh Super Admin."}
          </span>
        </div>
      </section>
      <section className={styles.panel}>
        <header>
          <h2>⌘　Kunci API Eksternal</h2>
          <p>
            Buat dan cabut kunci API untuk integrasi eksternal. Secret hanya terlihat sekali saat
            dibuat.
          </p>
        </header>
        <div className={styles.keyForm}>
          <label className={styles.field}>
            Nama Kunci
            <input
              value={keyName}
              maxLength={100}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Contoh: Integrasi Kabupaten"
            />
          </label>
          <label className={styles.field}>
            Rate limit / menit
            <input
              type="number"
              min="1"
              max="10000"
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value))}
            />
          </label>
          <label className={styles.field}>
            Kedaluwarsa (opsional)
            <input
              type="date"
              value={expiresAt}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </label>
          <button
            className={styles.primary}
            disabled={busy || !keyName.trim()}
            onClick={() => void createKey()}
          >
            Buat Kunci API
          </button>
        </div>
        {newKey && (
          <div className={styles.newKey}>
            <strong>Secret baru — salin sekarang</strong>
            <code>{newKey.key}</code>
            <button
              className={styles.secondary}
              onClick={() => void navigator.clipboard.writeText(newKey.key)}
            >
              Salin Kunci
            </button>
          </div>
        )}
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Prefix</th>
                <th>Limit</th>
                <th>Status</th>
                <th>Terakhir Dipakai</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td>
                    <code>{k.prefix}</code>
                  </td>
                  <td>{k.rateLimit}/menit</td>
                  <td>
                    <span className={k.active ? styles.statusOn : styles.statusOff}>
                      {k.active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("id-ID") : "Belum pernah"}
                  </td>
                  <td>
                    {k.active ? (
                      <button
                        className={styles.textDanger}
                        disabled={busy}
                        onClick={() => void revokeKey(k)}
                      >
                        Cabut
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={6}>Belum ada kunci API.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
