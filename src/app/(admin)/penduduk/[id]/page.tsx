import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPendudukDetailData } from "@/features/penduduk/application/use-cases";
import {
  calculateAge,
  GENDER_LABELS,
  LIFE_STATUS_LABELS,
  RESIDENCE_STATUS_LABELS,
  samarkanNik,
} from "@/features/penduduk/domain/penduduk";
import { formatWilayahLabel } from "@/features/wilayah/domain/wilayah";

export const metadata: Metadata = {
  title: "Detail Penduduk",
};

const tanggal = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatTanggal(value: string | null): string {
  if (!value) return "Belum diisi";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : tanggal.format(parsed);
}

function nilaiAtauStrip(value: string | null | undefined): string {
  return value?.trim() ? value : "—";
}

export default async function PendudukDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nomor = Number(id);

  if (!Number.isInteger(nomor) || nomor <= 0) notFound();

  const data = await getPendudukDetailData(nomor);
  if (!data) notFound();

  const penduduk = data.resident;
  const usia = calculateAge(penduduk.birthDate);
  const wilayah = data.region
    ? formatWilayahLabel({
        dusun: data.region.dusun ?? "",
        rw: data.region.rw ?? "",
        rt: data.region.rt ?? "",
      })
    : null;
  const wilayahTerisi =
    data.region && (data.region.dusun || data.region.rw || data.region.rt) ? wilayah : null;

  return (
    <div className="modul-page penduduk-page">
      <Link className="penduduk-back" href="/penduduk">
        ← Kembali ke Data Penduduk
      </Link>

      <div className="page-heading penduduk-detail-heading">
        <div>
          <span className="eyebrow">Kependudukan</span>
          <h1>{penduduk.name}</h1>
          <p>
            NIK {samarkanNik(penduduk.nationalId)} · {GENDER_LABELS[penduduk.gender]}
            {usia !== null ? ` · ${usia} tahun` : ""}
          </p>
        </div>
        <span
          className="beranda-chip"
          data-tone={penduduk.lifeStatus === "alive" ? "hijau" : "oranye"}
        >
          {LIFE_STATUS_LABELS[penduduk.lifeStatus]}
        </span>
      </div>

      <div className="penduduk-detail-layout">
        <div className="penduduk-detail-main">
          <section className="platform-card penduduk-detail-card">
            <header className="penduduk-card-head">
              <div>
                <h2>Identitas Penduduk</h2>
                <p>Data pribadi yang tercatat pada desa ini.</p>
              </div>
            </header>
            <dl className="penduduk-detail-grid">
              <div>
                <dt>NIK</dt>
                <dd className="modul-mono">{samarkanNik(penduduk.nationalId)}</dd>
              </div>
              <div>
                <dt>Nama lengkap</dt>
                <dd>{penduduk.name}</dd>
              </div>
              <div>
                <dt>Jenis kelamin</dt>
                <dd>{GENDER_LABELS[penduduk.gender]}</dd>
              </div>
              <div>
                <dt>Tempat lahir</dt>
                <dd>{nilaiAtauStrip(penduduk.birthPlace)}</dd>
              </div>
              <div>
                <dt>Tanggal lahir</dt>
                <dd>{formatTanggal(penduduk.birthDate)}</dd>
              </div>
              <div>
                <dt>Usia</dt>
                <dd>{usia === null ? "—" : `${usia} tahun`}</dd>
              </div>
              <div>
                <dt>Agama</dt>
                <dd>{nilaiAtauStrip(data.religion?.name)}</dd>
              </div>
              <div>
                <dt>Kewarganegaraan</dt>
                <dd>{nilaiAtauStrip(data.citizenship?.name)}</dd>
              </div>
              <div>
                <dt>Golongan darah</dt>
                <dd>{nilaiAtauStrip(data.bloodType?.name)}</dd>
              </div>
              <div>
                <dt>Status perkawinan</dt>
                <dd>{nilaiAtauStrip(data.maritalStatus?.name)}</dd>
              </div>
              <div>
                <dt>Hubungan keluarga</dt>
                <dd>{nilaiAtauStrip(data.familyRelation?.name)}</dd>
              </div>
              <div>
                <dt>Pendidikan terakhir</dt>
                <dd>{nilaiAtauStrip(data.education?.name)}</dd>
              </div>
              <div>
                <dt>Pekerjaan</dt>
                <dd>{nilaiAtauStrip(data.occupation?.name)}</dd>
              </div>
            </dl>
          </section>

          <section className="platform-card penduduk-detail-card">
            <header className="penduduk-card-head">
              <div>
                <h2>Alamat &amp; Kontak</h2>
                <p>Wilayah dan kontak yang tercatat untuk penduduk ini.</p>
              </div>
            </header>
            <dl className="penduduk-detail-grid">
              <div className="penduduk-detail-lebar">
                <dt>Alamat</dt>
                <dd>{nilaiAtauStrip(penduduk.address)}</dd>
              </div>
              <div>
                <dt>Telepon</dt>
                <dd>{nilaiAtauStrip(penduduk.phone)}</dd>
              </div>
              <div>
                <dt>Wilayah</dt>
                <dd>{wilayahTerisi ?? "Belum diisi"}</dd>
              </div>
              <div>
                <dt>Status tempat tinggal</dt>
                <dd>{RESIDENCE_STATUS_LABELS[penduduk.residenceStatus]}</dd>
              </div>
              <div>
                <dt>Status kependudukan</dt>
                <dd>{LIFE_STATUS_LABELS[penduduk.lifeStatus]}</dd>
              </div>
            </dl>
          </section>

          <section className="platform-card penduduk-detail-card">
            <header className="penduduk-card-head">
              <div>
                <h2>Data Orang Tua</h2>
                <p>Nama dan NIK orang tua sebagaimana tercatat.</p>
              </div>
            </header>
            <dl className="penduduk-detail-grid">
              <div>
                <dt>Nama ayah</dt>
                <dd>{nilaiAtauStrip(penduduk.fatherName)}</dd>
              </div>
              <div>
                <dt>NIK ayah</dt>
                <dd className="modul-mono">{samarkanNik(penduduk.fatherNationalId)}</dd>
              </div>
              <div>
                <dt>Nama ibu</dt>
                <dd>{nilaiAtauStrip(penduduk.motherName)}</dd>
              </div>
              <div>
                <dt>NIK ibu</dt>
                <dd className="modul-mono">{samarkanNik(penduduk.motherNationalId)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="penduduk-detail-rail">
          <section className="platform-card penduduk-detail-card">
            <header className="penduduk-card-head">
              <div>
                <h2>Kartu Keluarga</h2>
              </div>
            </header>
            {data.family ? (
              <dl className="penduduk-detail-grid penduduk-detail-grid-satu">
                <div>
                  <dt>Nomor KK</dt>
                  <dd className="modul-mono">{data.family.number}</dd>
                </div>
                <div>
                  <dt>Alamat KK</dt>
                  <dd>{nilaiAtauStrip(data.family.address)}</dd>
                </div>
                <div>
                  <dt>Wilayah</dt>
                  <dd>{wilayahTerisi ?? "Belum diisi"}</dd>
                </div>
              </dl>
            ) : (
              <p className="modul-empty">Penduduk ini belum terhubung ke Kartu Keluarga.</p>
            )}
          </section>

          <section className="platform-card penduduk-detail-catatan">
            <h2>Catatan Privasi</h2>
            <p>
              NIK ditampilkan dalam bentuk samaran. Buka data lengkap hanya melalui alur yang
              berwenang dan jangan menyalin data pribadi ke luar sistem.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
