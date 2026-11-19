"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { GalatField, PesanDialog } from "@/features/multi-desa/presentation/dialog-bagian";
import {
  GENDER_LABELS,
  GENDERS,
  LIFE_STATUS_LABELS,
  LIFE_STATUSES,
  RESIDENCE_STATUS_LABELS,
  RESIDENCE_STATUSES,
  type PendudukDTO,
  type PendudukReferenceData,
  type ReferenceOption,
} from "@/features/penduduk/domain/penduduk";
import { createIdleActionState, type ActionState } from "@/lib/action-state";

export type AksiFormPenduduk = (
  state: ActionState<{ id: number }>,
  formData: FormData,
) => Promise<ActionState<{ id: number }>>;

interface Props {
  aksi: AksiFormPenduduk;
  references: PendudukReferenceData;
  /** Diisi pada mode ubah; `undefined` pada mode tambah. */
  penduduk?: PendudukDTO;
}

function OpsiKatalog({ options }: { options: ReferenceOption[] }) {
  return (
    <>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </>
  );
}

function OpsiLabel({ options }: { options: PendudukReferenceData["families"] }) {
  return (
    <>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </>
  );
}

/**
 * Form tambah dan ubah penduduk.
 *
 * Satu komponen dipakai untuk kedua mode agar aturan field tidak bercabang.
 * Validasi tetap dijalankan ulang di Server Action; atribut HTML hanya membantu
 * pengguna, bukan pengganti pemeriksaan server.
 */
export function FormPenduduk({ aksi, references, penduduk }: Props) {
  const router = useRouter();
  const ubah = penduduk !== undefined;
  const kembali = ubah ? `/penduduk/${penduduk.id}` : "/penduduk";
  const [state, formAction, pending] = useActionState(
    aksi,
    createIdleActionState<{ id: number }>(),
  );
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const galat = (name: string): string | undefined => fieldErrors[name]?.[0];
  const tidakValid = (name: string): boolean => galat(name) !== undefined;

  useEffect(() => {
    if (state.status !== "success") return;
    router.push(`/penduduk/${state.data.id}`);
  }, [state, router]);

  return (
    <form action={formAction} className="form-stack">
      {ubah ? <input name="id" type="hidden" value={penduduk.id} /> : null}

      <section className="platform-card penduduk-form-card">
        <header className="platform-card-head">
          <div>
            <h2>Identitas Penduduk</h2>
            <p>NIK lengkap hanya ditampilkan pada formulir berizin ubah.</p>
          </div>
        </header>
        <div className="platform-card-body">
          <div className="platform-form-grid">
            <label className="form-field">
              <span className="form-label">NIK (opsional)</span>
              <input
                aria-invalid={tidakValid("nationalId")}
                autoComplete="off"
                className="form-input"
                defaultValue={penduduk?.nationalId ?? ""}
                inputMode="numeric"
                maxLength={16}
                name="nationalId"
                pattern="[0-9]{16}"
              />
              <span className="form-help">16 angka. Kosongkan bila belum tersedia.</span>
              <GalatField pesan={galat("nationalId")} />
            </label>

            <label className="form-field">
              <span className="form-label">Nama lengkap</span>
              <input
                aria-invalid={tidakValid("name")}
                className="form-input"
                defaultValue={penduduk?.name ?? ""}
                maxLength={100}
                name="name"
                required
              />
              <GalatField pesan={galat("name")} />
            </label>

            <label className="form-field">
              <span className="form-label">Jenis kelamin</span>
              <select
                aria-invalid={tidakValid("gender")}
                className="form-input"
                defaultValue={penduduk?.gender ?? ""}
                name="gender"
                required
              >
                <option disabled value="">
                  Pilih jenis kelamin
                </option>
                {GENDERS.map((value) => (
                  <option key={value} value={value}>
                    {GENDER_LABELS[value]}
                  </option>
                ))}
              </select>
              <GalatField pesan={galat("gender")} />
            </label>

            <label className="form-field">
              <span className="form-label">Tempat lahir</span>
              <input
                aria-invalid={tidakValid("birthPlace")}
                className="form-input"
                defaultValue={penduduk?.birthPlace ?? ""}
                maxLength={100}
                name="birthPlace"
              />
              <GalatField pesan={galat("birthPlace")} />
            </label>

            <label className="form-field">
              <span className="form-label">Tanggal lahir</span>
              <input
                aria-invalid={tidakValid("birthDate")}
                className="form-input"
                defaultValue={penduduk?.birthDate ?? ""}
                name="birthDate"
                type="date"
              />
              <GalatField pesan={galat("birthDate")} />
            </label>

            <label className="form-field">
              <span className="form-label">Agama</span>
              <select
                aria-invalid={tidakValid("religionId")}
                className="form-input"
                defaultValue={penduduk?.religionId ?? ""}
                name="religionId"
              >
                <option value="">Tidak diisi</option>
                <OpsiKatalog options={references.religions} />
              </select>
              <GalatField pesan={galat("religionId")} />
            </label>

            <label className="form-field">
              <span className="form-label">Kewarganegaraan</span>
              <select
                aria-invalid={tidakValid("citizenshipId")}
                className="form-input"
                defaultValue={penduduk?.citizenshipId ?? ""}
                name="citizenshipId"
              >
                <option value="">Tidak diisi</option>
                <OpsiKatalog options={references.citizenships} />
              </select>
              <GalatField pesan={galat("citizenshipId")} />
            </label>

            <label className="form-field">
              <span className="form-label">Golongan darah</span>
              <select
                aria-invalid={tidakValid("bloodTypeId")}
                className="form-input"
                defaultValue={penduduk?.bloodTypeId ?? ""}
                name="bloodTypeId"
              >
                <option value="">Tidak diisi</option>
                <OpsiKatalog options={references.bloodTypes} />
              </select>
              <GalatField pesan={galat("bloodTypeId")} />
            </label>
          </div>
        </div>
      </section>

      <section className="platform-card penduduk-form-card">
        <header className="platform-card-head">
          <div>
            <h2>Pendidikan &amp; Pekerjaan</h2>
            <p>Pendidikan terakhir dan pendidikan yang sedang ditempuh dapat berbeda.</p>
          </div>
        </header>
        <div className="platform-card-body">
          <div className="platform-form-grid">
            <label className="form-field">
              <span className="form-label">Pendidikan terakhir</span>
              <select
                aria-invalid={tidakValid("educationId")}
                className="form-input"
                defaultValue={penduduk?.educationId ?? ""}
                name="educationId"
              >
                <option value="">Tidak diisi</option>
                <OpsiKatalog options={references.educations} />
              </select>
              <GalatField pesan={galat("educationId")} />
            </label>

            <label className="form-field">
              <span className="form-label">Pendidikan sedang ditempuh</span>
              <select
                aria-invalid={tidakValid("educationSedangId")}
                className="form-input"
                defaultValue={penduduk?.educationSedangId ?? ""}
                name="educationSedangId"
              >
                <option value="">Tidak diisi</option>
                <OpsiKatalog options={references.educations} />
              </select>
              <GalatField pesan={galat("educationSedangId")} />
            </label>

            <label className="form-field">
              <span className="form-label">Pekerjaan</span>
              <select
                aria-invalid={tidakValid("occupationId")}
                className="form-input"
                defaultValue={penduduk?.occupationId ?? ""}
                name="occupationId"
              >
                <option value="">Tidak diisi</option>
                <OpsiKatalog options={references.occupations} />
              </select>
              <GalatField pesan={galat("occupationId")} />
            </label>

            <label className="form-field">
              <span className="form-label">Status perkawinan</span>
              <select
                aria-invalid={tidakValid("maritalStatusId")}
                className="form-input"
                defaultValue={penduduk?.maritalStatusId ?? ""}
                name="maritalStatusId"
              >
                <option value="">Tidak diisi</option>
                <OpsiKatalog options={references.maritalStatuses} />
              </select>
              <GalatField pesan={galat("maritalStatusId")} />
            </label>
          </div>
        </div>
      </section>

      <section className="platform-card penduduk-form-card">
        <header className="platform-card-head">
          <div>
            <h2>Keluarga, Wilayah &amp; Kontak</h2>
            <p>Kartu Keluarga dan wilayah dibatasi pada desa ini.</p>
          </div>
        </header>
        <div className="platform-card-body">
          <div className="platform-form-grid">
            <label className="form-field">
              <span className="form-label">Kartu Keluarga</span>
              <select
                aria-invalid={tidakValid("familyId")}
                className="form-input"
                defaultValue={penduduk?.familyId ?? ""}
                name="familyId"
              >
                <option value="">Tidak ditautkan</option>
                <OpsiLabel options={references.families} />
              </select>
              <GalatField pesan={galat("familyId")} />
            </label>

            <label className="form-field">
              <span className="form-label">Hubungan dalam keluarga</span>
              <select
                aria-invalid={tidakValid("familyRelationId")}
                className="form-input"
                defaultValue={penduduk?.familyRelationId ?? ""}
                name="familyRelationId"
              >
                <option value="">Tidak diisi</option>
                <OpsiKatalog options={references.familyRelations} />
              </select>
              <GalatField pesan={galat("familyRelationId")} />
            </label>

            <label className="form-field">
              <span className="form-label">Wilayah</span>
              <select
                aria-invalid={tidakValid("regionId")}
                className="form-input"
                defaultValue={penduduk?.regionId ?? ""}
                name="regionId"
              >
                <option value="">Tidak diisi</option>
                <OpsiLabel options={references.regions} />
              </select>
              <GalatField pesan={galat("regionId")} />
            </label>

            <label className="form-field">
              <span className="form-label">Telepon</span>
              <input
                aria-invalid={tidakValid("phone")}
                className="form-input"
                defaultValue={penduduk?.phone ?? ""}
                maxLength={30}
                name="phone"
                type="tel"
              />
              <GalatField pesan={galat("phone")} />
            </label>

            <label className="form-field penduduk-form-lebar">
              <span className="form-label">Alamat</span>
              <input
                aria-invalid={tidakValid("address")}
                className="form-input"
                defaultValue={penduduk?.address ?? ""}
                maxLength={255}
                name="address"
              />
              <GalatField pesan={galat("address")} />
            </label>

            <label className="form-field">
              <span className="form-label">Status tempat tinggal</span>
              <select
                aria-invalid={tidakValid("residenceStatus")}
                className="form-input"
                defaultValue={penduduk?.residenceStatus ?? "permanent"}
                name="residenceStatus"
                required
              >
                {RESIDENCE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {RESIDENCE_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
              <GalatField pesan={galat("residenceStatus")} />
            </label>

            <label className="form-field">
              <span className="form-label">Status kependudukan</span>
              <select
                aria-invalid={tidakValid("lifeStatus")}
                className="form-input"
                defaultValue={penduduk?.lifeStatus ?? "alive"}
                name="lifeStatus"
                required
              >
                {LIFE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {LIFE_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
              <GalatField pesan={galat("lifeStatus")} />
            </label>
          </div>
        </div>
      </section>

      <section className="platform-card penduduk-form-card">
        <header className="platform-card-head">
          <div>
            <h2>Data Orang Tua</h2>
            <p>Nama dan NIK orang tua sebagaimana tercatat pada dokumen kependudukan.</p>
          </div>
        </header>
        <div className="platform-card-body">
          <div className="platform-form-grid">
            <label className="form-field">
              <span className="form-label">Nama ayah</span>
              <input
                aria-invalid={tidakValid("fatherName")}
                className="form-input"
                defaultValue={penduduk?.fatherName ?? ""}
                maxLength={100}
                name="fatherName"
              />
              <GalatField pesan={galat("fatherName")} />
            </label>

            <label className="form-field">
              <span className="form-label">NIK ayah (opsional)</span>
              <input
                aria-invalid={tidakValid("fatherNationalId")}
                autoComplete="off"
                className="form-input"
                defaultValue={penduduk?.fatherNationalId ?? ""}
                inputMode="numeric"
                maxLength={16}
                name="fatherNationalId"
                pattern="[0-9]{16}"
              />
              <GalatField pesan={galat("fatherNationalId")} />
            </label>

            <label className="form-field">
              <span className="form-label">Nama ibu</span>
              <input
                aria-invalid={tidakValid("motherName")}
                className="form-input"
                defaultValue={penduduk?.motherName ?? ""}
                maxLength={100}
                name="motherName"
              />
              <GalatField pesan={galat("motherName")} />
            </label>

            <label className="form-field">
              <span className="form-label">NIK ibu (opsional)</span>
              <input
                aria-invalid={tidakValid("motherNationalId")}
                autoComplete="off"
                className="form-input"
                defaultValue={penduduk?.motherNationalId ?? ""}
                inputMode="numeric"
                maxLength={16}
                name="motherNationalId"
                pattern="[0-9]{16}"
              />
              <GalatField pesan={galat("motherNationalId")} />
            </label>
          </div>
        </div>
      </section>

      <PesanDialog state={state} />

      <div className="penduduk-form-actions">
        <Link className="button button-secondary" href={kembali}>
          Batal
        </Link>
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Menyimpan..." : ubah ? "Simpan Perubahan" : "Simpan Penduduk"}
        </button>
      </div>
    </form>
  );
}
