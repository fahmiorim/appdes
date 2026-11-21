"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { normalisasiDomain, POLA_DOMAIN } from "@/features/multi-desa/domain/desa-baru";
import { susunSubdomainPlatform } from "@/features/multi-desa/domain/jenis-domain";
import {
  LABEL_STATUS_DNS,
  type DataDns,
  type StatusDns,
} from "@/features/multi-desa/domain/status-dns";
import {
  LABEL_STATUS_SSL,
  type DataSsl,
  type StatusSsl,
} from "@/features/multi-desa/domain/status-ssl";
import { createIdleActionState, type ActionState } from "@/lib/action-state";

import { PlatformCard } from "./platform-ui";

/**
 * Wizard pendaftaran domain platform.
 *
 * Domain disimpan lebih dulu (langkah 2) sebelum DNS/TLS diperiksa, sehingga
 * pemeriksaan jaringan hanya berjalan untuk host yang benar-benar terdaftar.
 * Aplikasi tidak menerbitkan sertifikat SSL; langkah Aktivasi SSL hanya
 * memeriksa sertifikat yang sudah terpasang pada server/reverse proxy.
 */

export interface DesaPilihanDomain {
  id: number;
  name: string | null;
  slug: string | null;
  district: string | null;
  regency: string | null;
  active: boolean;
  domain: string | null;
}

type JenisPendaftaran = "subdomain" | "custom";

const LANGKAH = [
  {
    nomor: 1,
    judul: "Pilih Tenant & Jenis",
    keterangan: "Tentukan desa dan tipe domain",
  },
  {
    nomor: 2,
    judul: "Konfigurasi Domain",
    keterangan: "Isi nama domain dan pengaturan",
  },
  {
    nomor: 3,
    judul: "Verifikasi & DNS",
    keterangan: "Cek arah DNS domain",
  },
  {
    nomor: 4,
    judul: "Aktivasi SSL",
    keterangan: "Pasang sertifikat SSL",
  },
  {
    nomor: 5,
    judul: "Selesai",
    keterangan: "Pendaftaran selesai",
  },
] as const;

const formatWaktu = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function labelDesa(desa: DesaPilihanDomain | null): string {
  return desa?.name?.trim() || (desa ? `Desa #${desa.id}` : "Belum dipilih");
}

function lokasiDesa(desa: DesaPilihanDomain | null): string {
  if (!desa) return "Pilih desa untuk melihat lokasi";
  const bagian = [
    desa.district ? `Kec. ${desa.district}` : null,
    desa.regency ? `Kab. ${desa.regency}` : null,
  ].filter(Boolean);

  return bagian.length > 0 ? bagian.join(", ") : "Kecamatan dan kabupaten belum diisi";
}

function kelasStatusDns(status: StatusDns): string {
  if (status === "normal") return "is-ok";
  if (status === "bermasalah") return "is-bad";
  return "is-unchecked";
}

function kelasStatusSsl(status: StatusSsl): string {
  if (status === "aktif") return "is-ok";
  if (status === "segera-expired") return "is-warn";
  if (status === "bermasalah") return "is-bad";
  return "is-unchecked";
}

function formatTanggal(nilai: Date | null): string {
  return nilai ? formatWaktu.format(new Date(nilai)) : "-";
}

export function TambahDomainWizard({
  desa,
  baseDomain,
  aksiTambah,
  aksiDns,
  aksiSsl,
}: {
  desa: readonly DesaPilihanDomain[];
  baseDomain: string | null;
  aksiTambah: (
    state: ActionState<{ id: number }>,
    formData: FormData,
  ) => Promise<ActionState<{ id: number }>>;
  aksiDns: (domainId: number) => Promise<ActionState<DataDns>>;
  aksiSsl: (domainId: number) => Promise<ActionState<DataSsl>>;
}) {
  const [langkah, setLangkah] = useState(1);
  const [villageId, setVillageId] = useState<number | "">("");
  const [jenis, setJenis] = useState<JenisPendaftaran>("subdomain");
  const [customInput, setCustomInput] = useState("");
  const [domainId, setDomainId] = useState<number | null>(null);
  const [domainTersimpan, setDomainTersimpan] = useState("");
  const [memeriksaDns, setMemeriksaDns] = useState(false);
  const [memeriksaSsl, setMemeriksaSsl] = useState(false);
  const [dnsState, setDnsState] = useState<ActionState<DataDns>>(createIdleActionState<DataDns>());
  const [sslState, setSslState] = useState<ActionState<DataSsl>>(createIdleActionState<DataSsl>());

  const [formState, formAction, pending] = useActionState(
    aksiTambah,
    createIdleActionState<{ id: number }>(),
  );
  const idFormTerpakai = useRef<number | null>(null);

  const desaTerpilih = useMemo(
    () => desa.find((item) => item.id === villageId) ?? null,
    [desa, villageId],
  );
  const hostSubdomain = useMemo(
    () => susunSubdomainPlatform(desaTerpilih?.slug, baseDomain),
    [baseDomain, desaTerpilih?.slug],
  );
  const customNormal = normalisasiDomain(customInput);
  const hostCustom = customNormal && POLA_DOMAIN.test(customNormal) ? customNormal : null;
  const hostTarget = jenis === "subdomain" ? hostSubdomain : hostCustom;
  const hostTampil = domainTersimpan || hostTarget || "";
  const fieldErrors = formState.status === "error" ? (formState.fieldErrors ?? {}) : {};
  const domainDibuat = domainId !== null;
  const dnsBerhasil = dnsState.status === "success";
  const sslBerhasil = sslState.status === "success";

  useEffect(() => {
    if (formState.status !== "success") return;
    if (idFormTerpakai.current === formState.data.id) return;
    idFormTerpakai.current = formState.data.id;
    setDomainId(formState.data.id);
    setDomainTersimpan(hostTarget ?? "");
    setLangkah(3);
  }, [formState, hostTarget]);

  function pilihVillage(nilai: string) {
    if (domainDibuat) return;
    setVillageId(nilai === "" ? "" : Number(nilai));
    setDnsState(createIdleActionState<DataDns>());
    setSslState(createIdleActionState<DataSsl>());
  }

  function pilihJenis(nilai: JenisPendaftaran) {
    if (domainDibuat) return;
    setJenis(nilai);
  }

  function kembali() {
    setLangkah((sebelumnya) => Math.max(1, sebelumnya - 1));
  }

  function lanjut() {
    if (langkah === 1 && villageId !== "" && hostSubdomain) {
      setLangkah(2);
      return;
    }
    if (langkah === 2 && hostTarget) {
      setLangkah(3);
      return;
    }
    if (langkah === 3 && dnsBerhasil) {
      setLangkah(4);
      return;
    }
    if (langkah === 4 && sslBerhasil) {
      setLangkah(5);
    }
  }

  async function periksaDnsSekarang() {
    if (domainId === null || memeriksaDns) return;
    setMemeriksaDns(true);
    try {
      setDnsState(await aksiDns(domainId));
    } catch {
      setDnsState({
        status: "error",
        message: "Pemeriksaan DNS gagal dijalankan. Coba lagi.",
      });
    } finally {
      setMemeriksaDns(false);
    }
  }

  async function periksaSslSekarang() {
    if (domainId === null || memeriksaSsl) return;
    setMemeriksaSsl(true);
    try {
      setSslState(await aksiSsl(domainId));
    } catch {
      setSslState({
        status: "error",
        message: "Pemeriksaan SSL gagal dijalankan. Coba lagi.",
      });
    } finally {
      setMemeriksaSsl(false);
    }
  }

  function mulaiLagi() {
    setLangkah(1);
    setVillageId("");
    setJenis("subdomain");
    setCustomInput("");
    setDomainId(null);
    setDomainTersimpan("");
    setDnsState(createIdleActionState<DataDns>());
    setSslState(createIdleActionState<DataSsl>());
  }

  const tombolLanjutNonaktif =
    (langkah === 1 && (villageId === "" || (jenis === "subdomain" && !hostSubdomain))) ||
    (langkah === 2 && (!hostTarget || pending)) ||
    (langkah === 3 && !dnsBerhasil) ||
    (langkah === 4 && !sslBerhasil);

  return (
    <div className="domain-wizard">
      <div className="domain-wizard-steps-wrap">
        <span aria-hidden="true" className="domain-wizard-track">
          <span
            className="domain-wizard-track-fill"
            style={{ width: `${((langkah - 1) / (LANGKAH.length - 1)) * 100}%` }}
          />
        </span>
        <ol aria-label="Langkah pendaftaran domain" className="domain-wizard-steps">
          {LANGKAH.map((item) => {
            const selesai = item.nomor < langkah;
            const aktif = item.nomor === langkah;
            return (
              <li
                aria-current={aktif ? "step" : undefined}
                className={aktif ? "is-active" : selesai ? "is-done" : undefined}
                key={item.nomor}
              >
                <span className="domain-wizard-step-number" aria-hidden="true">
                  {selesai ? "✓" : item.nomor}
                </span>
                <strong>{item.judul}</strong>
                <span>{item.keterangan}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="domain-wizard-layout">
        <div className="domain-wizard-main">
          {langkah === 1 ? (
            <PlatformCard>
              <div className="domain-wizard-card-head">
                <span className="domain-wizard-card-icon" aria-hidden="true">
                  <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <rect height="16" rx="3" width="16" x="4" y="4" />
                    <path d="M8 9h8M8 13h3M8 17h6" />
                  </svg>
                </span>
                <div>
                  <span className="domain-wizard-eyebrow">Langkah 1</span>
                  <h2>Pilih Tenant &amp; Jenis Domain</h2>
                  <p>
                    Tentukan desa/tenant yang akan didaftarkan domain, lalu pilih jenis domain yang
                    diinginkan.
                  </p>
                </div>
              </div>

              <fieldset className="domain-wizard-fieldset">
                <legend>
                  <span className="domain-wizard-section-icon" aria-hidden="true">
                    <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path d="M4 7h16l-1.5 12h-13Z" />
                      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" />
                      <path d="M8.5 12h7" />
                    </svg>
                  </span>
                  Pilih Tenant (Desa)
                </legend>
                <label className="form-field">
                  <span className="form-label">
                    Tenant Desa <span aria-hidden="true">*</span>
                  </span>
                  <span className="domain-wizard-tenant">
                    <span className="domain-wizard-tenant-mark" aria-hidden="true">
                      {labelDesa(desaTerpilih).charAt(0).toUpperCase()}
                    </span>
                    <span className="domain-wizard-tenant-text">
                      <strong>{labelDesa(desaTerpilih)}</strong>
                      <span>{lokasiDesa(desaTerpilih)}</span>
                    </span>
                    <select
                      aria-label="Tenant desa"
                      className="domain-wizard-tenant-select"
                      disabled={domainDibuat}
                      onChange={(event) => pilihVillage(event.target.value)}
                      required
                      value={villageId}
                    >
                      <option value="">Pilih desa / tenant</option>
                      {desa.map((item) => (
                        <option key={item.id} value={item.id}>
                          {labelDesa(item)}
                          {item.district ? ` — Kec. ${item.district}` : ""}
                          {item.regency ? `, ${item.regency}` : ""}
                          {item.active ? "" : " (nonaktif)"}
                        </option>
                      ))}
                    </select>
                    <svg
                      aria-hidden="true"
                      className="domain-wizard-tenant-chevron"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      viewBox="0 0 24 24"
                    >
                      <path d="m7 9.5 5 5 5-5" />
                    </svg>
                  </span>
                </label>
                {desa.length === 0 ? (
                  <p className="domain-wizard-note is-warning">
                    Belum ada desa terdaftar. Buat tenant terlebih dahulu dari konsol tenant.
                  </p>
                ) : null}
              </fieldset>

              <fieldset className="domain-wizard-fieldset">
                <legend>
                  <span className="domain-wizard-section-icon" aria-hidden="true">
                    <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path d="M10 13a4 4 0 0 0 5.7.1l2.1-2.1a4 4 0 0 0-5.7-5.7l-1.2 1.2" />
                      <path d="M14 11a4 4 0 0 0-5.7-.1l-2.1 2.1a4 4 0 0 0 5.7 5.7l1.2-1.2" />
                    </svg>
                  </span>
                  Pilih Jenis Domain
                </legend>
                <div className="domain-wizard-types">
                  <label
                    className={
                      jenis === "subdomain"
                        ? "domain-wizard-type is-selected"
                        : "domain-wizard-type"
                    }
                  >
                    <input
                      checked={jenis === "subdomain"}
                      className="sr-only"
                      disabled={domainDibuat || !hostSubdomain}
                      name="jenisDomain"
                      onChange={() => pilihJenis("subdomain")}
                      type="radio"
                      value="subdomain"
                    />
                    <span className="domain-wizard-type-top">
                      <span className="domain-wizard-type-icon" aria-hidden="true">
                        <svg
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          viewBox="0 0 24 24"
                        >
                          <path d="M10 13a4 4 0 0 0 5.7.1l2.1-2.1a4 4 0 0 0-5.7-5.7l-1.2 1.2" />
                          <path d="M14 11a4 4 0 0 0-5.7-.1l-2.1 2.1a4 4 0 0 0 5.7 5.7l1.2-1.2" />
                        </svg>
                      </span>
                      <span className="domain-wizard-radio" aria-hidden="true" />
                    </span>
                    <strong>Subdomain Platform</strong>
                    <p>Menggunakan domain utama platform FlexiDesa.</p>
                    <span className="domain-wizard-example">
                      {hostSubdomain
                        ? `Contoh: ${hostSubdomain}`
                        : "Pilih desa yang memiliki slug untuk memakai subdomain."}
                    </span>
                  </label>

                  <label
                    className={
                      jenis === "custom" ? "domain-wizard-type is-selected" : "domain-wizard-type"
                    }
                  >
                    <input
                      checked={jenis === "custom"}
                      className="sr-only"
                      disabled={domainDibuat}
                      name="jenisDomain"
                      onChange={() => pilihJenis("custom")}
                      type="radio"
                      value="custom"
                    />
                    <span className="domain-wizard-type-top">
                      <span className="domain-wizard-type-icon" aria-hidden="true">
                        <svg
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          viewBox="0 0 24 24"
                        >
                          <circle cx="12" cy="12" r="8.4" />
                          <path d="M3.6 12h16.8" />
                          <path d="M12 3.6c2.4 2.4 3.6 5.2 3.6 8.4s-1.2 6-3.6 8.4c-2.4-2.4-3.6-5.2-3.6-8.4s1.2-6 3.6-8.4" />
                        </svg>
                      </span>
                      <span className="domain-wizard-radio" aria-hidden="true" />
                    </span>
                    <strong>Custom Domain</strong>
                    <p>Menggunakan domain sendiri (mis. .go.id, .desa.id, .id).</p>
                    <span className="domain-wizard-example">
                      {hostCustom ? `Contoh: ${hostCustom}` : "Contoh: desatanjunggading.go.id"}
                    </span>
                  </label>
                </div>
              </fieldset>

              {desaTerpilih && jenis === "subdomain" && !hostSubdomain ? (
                <p className="domain-wizard-note is-warning">
                  Subdomain platform belum dapat dipakai untuk desa ini. Pilih Custom Domain atau
                  lengkapi slug/base domain terlebih dahulu.
                </p>
              ) : null}

              <div className="domain-wizard-info">
                <span aria-hidden="true" className="domain-wizard-info-icon">
                  i
                </span>
                <div>
                  <strong>Kapan menggunakan yang mana?</strong>
                  <ul>
                    <li>
                      <b>Subdomain Platform:</b> cepat, mudah, dan dikelola otomatis oleh sistem
                      (direkomendasikan).
                    </li>
                    <li>
                      <b>Custom Domain:</b> gunakan jika desa sudah memiliki domain sendiri (misal
                      .go.id atau .desa.id).
                    </li>
                  </ul>
                </div>
              </div>
            </PlatformCard>
          ) : null}

          {langkah === 2 ? (
            <PlatformCard>
              <div className="domain-wizard-card-head">
                <span className="domain-wizard-card-icon" aria-hidden="true">
                  <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path d="M10 13a4 4 0 0 0 5.7.1l2.1-2.1a4 4 0 0 0-5.7-5.7l-1.2 1.2" />
                    <path d="M14 11a4 4 0 0 0-5.7-.1l-2.1 2.1a4 4 0 0 0 5.7 5.7l1.2-1.2" />
                  </svg>
                </span>
                <div>
                  <span className="domain-wizard-eyebrow">Langkah 2</span>
                  <h2>Konfigurasi Domain</h2>
                  <p>
                    {jenis === "subdomain"
                      ? "Subdomain disusun otomatis dari slug desa dan domain induk platform."
                      : "Masukkan hostname yang sudah dimiliki desa, tanpa protokol atau path."}
                  </p>
                </div>
              </div>

              <form action={formAction} id="domain-wizard-form">
                <input name="villageId" type="hidden" value={villageId} />
                <input name="domain" type="hidden" value={hostTarget ?? ""} />

                <div className="domain-wizard-summary">
                  <div>
                    <span>Tenant desa</span>
                    <strong>{labelDesa(desaTerpilih)}</strong>
                  </div>
                  <div>
                    <span>Jenis domain</span>
                    <strong>
                      {jenis === "subdomain" ? "Subdomain Platform" : "Custom Domain"}
                    </strong>
                  </div>
                </div>

                {jenis === "subdomain" ? (
                  <div className="domain-wizard-domain-box">
                    <span>Subdomain yang akan didaftarkan</span>
                    <strong>{hostSubdomain ?? "Belum dapat disusun"}</strong>
                    {!hostSubdomain ? (
                      <p className="domain-wizard-note is-warning">
                        {!baseDomain
                          ? "DESA_BASE_DOMAIN belum dikonfigurasi, sehingga subdomain platform tidak tersedia. Pilih Custom Domain."
                          : "Desa ini belum memiliki slug. Lengkapi slug desa atau pilih Custom Domain."}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <label className="form-field">
                    <span className="form-label">Nama domain</span>
                    <input
                      autoComplete="off"
                      className="form-input"
                      disabled={domainDibuat}
                      maxLength={255}
                      onChange={(event) => setCustomInput(event.target.value)}
                      placeholder="desa-sukamaju.go.id"
                      required
                      value={customInput}
                    />
                    <span className="form-help">
                      Tanpa <code>https://</code> dan tanpa garis miring. Domain harus unik lintas
                      tenant.
                    </span>
                    {customInput.trim() && !hostCustom ? (
                      <span className="form-error" role="alert">
                        Format domain tidak valid (contoh: desa-sukamaju.id).
                      </span>
                    ) : null}
                  </label>
                )}

                {formState.status === "error" ? (
                  <p className="domain-wizard-note is-error" role="alert">
                    {formState.message}
                    {fieldErrors.villageId?.[0] ? ` ${fieldErrors.villageId[0]}` : ""}
                    {fieldErrors.domain?.[0] ? ` ${fieldErrors.domain[0]}` : ""}
                  </p>
                ) : null}

                <div className="domain-wizard-info">
                  <span aria-hidden="true" className="domain-wizard-info-icon">
                    i
                  </span>
                  <div>
                    <strong>Domain pertama menjadi domain utama</strong>
                    <p>
                      Bila desa belum memiliki domain, domain ini langsung menjadi domain utama.
                      Domain berikutnya tersimpan sebagai alias dan tetap unik lintas tenant.
                    </p>
                  </div>
                </div>
              </form>
            </PlatformCard>
          ) : null}

          {langkah === 3 ? (
            <PlatformCard>
              <div className="domain-wizard-card-head">
                <span className="domain-wizard-card-icon" aria-hidden="true">
                  <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8.4" />
                    <path d="M3.6 12h16.8" />
                    <path d="M12 3.6c2.4 2.4 3.6 5.2 3.6 8.4s-1.2 6-3.6 8.4c-2.4-2.4-3.6-5.2-3.6-8.4s1.2-6 3.6-8.4" />
                  </svg>
                </span>
                <div>
                  <span className="domain-wizard-eyebrow">Langkah 3</span>
                  <h2>Verifikasi &amp; DNS</h2>
                  <p>Periksa resolusi DNS nyata untuk domain yang baru didaftarkan.</p>
                </div>
              </div>

              <div className="domain-wizard-domain-box">
                <span>Domain terdaftar</span>
                <strong>{domainTersimpan}</strong>
                <p>
                  {jenis === "custom"
                    ? "Arahkan record A/CNAME domain ke server platform sebelum pemeriksaan. Nilai record harus berasal dari pengelola infrastruktur."
                    : "Subdomain platform memakai DNS wildcard platform. Pemeriksaan tetap dilakukan terhadap host ini."}
                </p>
              </div>

              <button
                className="button button-primary"
                disabled={memeriksaDns}
                onClick={periksaDnsSekarang}
                type="button"
              >
                {memeriksaDns
                  ? "Memeriksa DNS..."
                  : dnsBerhasil
                    ? "Periksa ulang DNS"
                    : "Periksa DNS sekarang"}
              </button>

              <div aria-live="polite" className="domain-wizard-result" role="status">
                {dnsState.status === "error" ? (
                  <p className="domain-wizard-note is-error">{dnsState.message}</p>
                ) : null}
                {dnsState.status === "success" ? (
                  <>
                    <div className="domain-wizard-result-head">
                      <span className={`domain-check ${kelasStatusDns(dnsState.data.status)}`}>
                        <span aria-hidden="true" />
                        {LABEL_STATUS_DNS[dnsState.data.status]}
                      </span>
                      <span>Diperiksa {formatTanggal(dnsState.data.checkedAt)}</span>
                    </div>
                    <p>{dnsState.message}</p>
                    {dnsState.data.addresses.length > 0 ? (
                      <p className="domain-wizard-addresses">
                        Alamat: <code>{dnsState.data.addresses.join(", ")}</code>
                      </p>
                    ) : null}
                    {dnsState.data.status !== "normal" ? (
                      <p className="domain-wizard-note is-warning">
                        Domain tetap tersimpan. Perbaiki DNS sebelum domain dapat diakses publik.
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            </PlatformCard>
          ) : null}

          {langkah === 4 ? (
            <PlatformCard>
              <div className="domain-wizard-card-head">
                <span className="domain-wizard-card-icon" aria-hidden="true">
                  <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path d="M12 3.2 19 6v5.2c0 4.4-2.8 7.6-7 9.6-4.2-2-7-5.2-7-9.6V6Z" />
                    <path d="m8.8 12 2.2 2.2 4.2-4.4" />
                  </svg>
                </span>
                <div>
                  <span className="domain-wizard-eyebrow">Langkah 4</span>
                  <h2>Aktivasi SSL</h2>
                  <p>Verifikasi sertifikat TLS yang terpasang pada server untuk domain ini.</p>
                </div>
              </div>

              <div className="domain-wizard-info">
                <span aria-hidden="true" className="domain-wizard-info-icon">
                  i
                </span>
                <div>
                  <strong>Penerbitan sertifikat bukan bagian aplikasi</strong>
                  <p>
                    Aplikasi tidak memasang atau menerbitkan sertifikat. Pemeriksaan di bawah
                    melakukan handshake TLS nyata dengan verifikasi sertifikat aktif; pemasangan
                    sertifikat tetap dilakukan di reverse proxy/server.
                  </p>
                </div>
              </div>

              <div className="domain-wizard-domain-box">
                <span>Domain</span>
                <strong>{domainTersimpan}</strong>
              </div>

              <button
                className="button button-primary"
                disabled={memeriksaSsl}
                onClick={periksaSslSekarang}
                type="button"
              >
                {memeriksaSsl
                  ? "Memeriksa SSL..."
                  : sslBerhasil
                    ? "Periksa ulang SSL"
                    : "Periksa sertifikat SSL"}
              </button>

              <div aria-live="polite" className="domain-wizard-result" role="status">
                {sslState.status === "error" ? (
                  <p className="domain-wizard-note is-error">{sslState.message}</p>
                ) : null}
                {sslState.status === "success" ? (
                  <>
                    <div className="domain-wizard-result-head">
                      <span className={`domain-check ${kelasStatusSsl(sslState.data.status)}`}>
                        <span aria-hidden="true" />
                        {LABEL_STATUS_SSL[sslState.data.status]}
                      </span>
                      <span>Diperiksa {formatTanggal(sslState.data.checkedAt)}</span>
                    </div>
                    <p>{sslState.message}</p>
                    {sslState.data.validTo ? (
                      <p>Berlaku sampai {formatTanggal(sslState.data.validTo)}.</p>
                    ) : null}
                    {sslState.data.status !== "aktif" ? (
                      <p className="domain-wizard-note is-warning">
                        SSL belum aktif. Domain tetap tersimpan, tetapi pemasangan sertifikat harus
                        diselesaikan di infrastruktur sebelum domain dipakai publik.
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            </PlatformCard>
          ) : null}

          {langkah === 5 ? (
            <PlatformCard>
              <div className="domain-wizard-finish">
                <span className="domain-wizard-finish-icon" aria-hidden="true">
                  ✓
                </span>
                <span className="domain-wizard-eyebrow">Langkah 5</span>
                <h2>Domain berhasil didaftarkan</h2>
                <p>
                  Domain sudah tersimpan pada tenant {labelDesa(desaTerpilih)}. Status DNS dan SSL
                  di bawah berasal dari pemeriksaan nyata, bukan status contoh.
                </p>

                <dl className="domain-wizard-finish-list">
                  <div>
                    <dt>Tenant</dt>
                    <dd>{labelDesa(desaTerpilih)}</dd>
                  </div>
                  <div>
                    <dt>Domain</dt>
                    <dd>{domainTersimpan}</dd>
                  </div>
                  <div>
                    <dt>Jenis</dt>
                    <dd>{jenis === "subdomain" ? "Subdomain Platform" : "Custom Domain"}</dd>
                  </div>
                  <div>
                    <dt>DNS</dt>
                    <dd>
                      {dnsState.status === "success"
                        ? LABEL_STATUS_DNS[dnsState.data.status]
                        : "Belum diperiksa"}
                    </dd>
                  </div>
                  <div>
                    <dt>SSL</dt>
                    <dd>
                      {sslState.status === "success"
                        ? LABEL_STATUS_SSL[sslState.data.status]
                        : "Belum diperiksa"}
                    </dd>
                  </div>
                </dl>

                {sslState.status === "success" && sslState.data.status !== "aktif" ? (
                  <p className="domain-wizard-note is-warning">
                    Domain terdaftar, tetapi belum siap dipakai dengan HTTPS karena sertifikat SSL
                    belum aktif.
                  </p>
                ) : null}

                <div className="domain-wizard-finish-actions">
                  <Link className="button button-primary" href="/super-admin/domain">
                    Lihat Daftar Domain
                  </Link>
                  <button className="button button-secondary" onClick={mulaiLagi} type="button">
                    Tambah Domain Lain
                  </button>
                </div>
              </div>
            </PlatformCard>
          ) : null}
        </div>

        <aside className="domain-wizard-side">
          <PlatformCard title="Pratinjau Domain">
            <div className="domain-preview">
              <div className="domain-preview-browser">
                <span className="domain-preview-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="domain-preview-url">
                  <svg
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <rect height="11" rx="2" width="14" x="5" y="10" />
                    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                  </svg>
                  {hostTampil || "domain-belum-dipilih"}
                </span>
              </div>
              <div className="domain-preview-nav">
                <span className="domain-preview-brand">
                  <span aria-hidden="true">{labelDesa(desaTerpilih).charAt(0).toUpperCase()}</span>
                  {labelDesa(desaTerpilih)}
                </span>
                <span>Beranda</span>
                <span>Profil</span>
                <span>Layanan</span>
                <span>Berita</span>
                <span>Kontak</span>
              </div>
              <div className="domain-preview-hero">
                <span className="domain-preview-hero-pattern" aria-hidden="true" />
                <div>
                  <strong>{labelDesa(desaTerpilih)}</strong>
                  <span>
                    {desaTerpilih?.district
                      ? `Kecamatan ${desaTerpilih.district}`
                      : "Kecamatan belum diisi"}
                  </span>
                  <span>
                    {desaTerpilih?.regency
                      ? `Kabupaten ${desaTerpilih.regency}`
                      : "Kabupaten belum diisi"}
                  </span>
                </div>
              </div>
              <p className="domain-preview-caption">
                Pratinjau alamat dan identitas desa. Tampilan situs mengikuti tema aktif tenant.
              </p>
            </div>
          </PlatformCard>

          <PlatformCard title="Alur Pendaftaran Domain">
            <ol className="domain-wizard-flow">
              {LANGKAH.map((item) => (
                <li
                  className={
                    item.nomor < langkah
                      ? "is-done"
                      : item.nomor === langkah
                        ? "is-active"
                        : undefined
                  }
                  key={item.nomor}
                >
                  <span aria-hidden="true">{item.nomor < langkah ? "✓" : item.nomor}</span>
                  <div>
                    <strong>{item.judul}</strong>
                    <p>
                      {item.nomor === 1
                        ? "Tentukan desa dan tipe domain (subdomain/custom)."
                        : item.nomor === 2
                          ? "Isi nama domain dan pengaturan terkait."
                          : item.nomor === 3
                            ? "Periksa resolusi DNS domain (wajib untuk custom domain)."
                            : item.nomor === 4
                              ? "Pemeriksaan sertifikat SSL setelah DNS mengarah ke server."
                              : "Domain tersimpan; selesaikan DNS/SSL agar siap dipakai."}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </PlatformCard>
        </aside>
      </div>

      <div className="domain-wizard-footer">
        <Link className="button button-secondary domain-wizard-cancel" href="/super-admin/domain">
          <span aria-hidden="true">✕</span> Batal
        </Link>
        <div className="domain-wizard-footer-actions">
          {langkah > 1 && langkah < 5 ? (
            <button
              className="button button-secondary"
              disabled={langkah === 2 && domainDibuat}
              onClick={kembali}
              type="button"
            >
              <span aria-hidden="true">‹</span> Sebelumnya
            </button>
          ) : null}
          {langkah < 5 ? (
            langkah === 2 && !domainDibuat ? (
              <button
                className="button button-primary"
                disabled={tombolLanjutNonaktif}
                form="domain-wizard-form"
                type="submit"
              >
                {pending ? "Menyimpan..." : "Selanjutnya"} <span aria-hidden="true">›</span>
              </button>
            ) : (
              <button
                className="button button-primary"
                disabled={tombolLanjutNonaktif}
                onClick={lanjut}
                type="button"
              >
                Selanjutnya <span aria-hidden="true">›</span>
              </button>
            )
          ) : (
            <Link className="button button-primary" href="/super-admin/domain">
              Selesai <span aria-hidden="true">›</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
