"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import type { StatusTemplate } from "@/features/multi-desa/domain/template-website";
import { createIdleActionState, type ActionState } from "@/lib/action-state";

export interface PenggunaanTemplateTampil {
  villageId: number;
  namaDesa: string | null;
  domain: string | null;
  themeNama: string;
  versi: string;
  diperbaruiPada: string;
}

type AksiStatus = (
  state: ActionState<{ status: StatusTemplate }>,
  formData: FormData,
) => Promise<ActionState<{ status: StatusTemplate }>>;

type AksiDistribusi = (
  state: ActionState<{ jumlah: number }>,
  formData: FormData,
) => Promise<ActionState<{ jumlah: number }>>;

export function AksiStatusTemplate({
  aksi,
  id,
  status,
  versiTertinggal,
}: {
  aksi: AksiStatus;
  id: number;
  status: StatusTemplate;
  versiTertinggal: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    aksi,
    createIdleActionState<{ status: StatusTemplate }>(),
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state]);

  const berikutnya: { status: StatusTemplate; label: string }[] =
    status === "published"
      ? [{ status: "archived", label: "Arsipkan" }]
      : [{ status: "published", label: status === "archived" ? "Terbitkan ulang" : "Terbitkan" }];

  return (
    <div className="template-status-actions">
      {berikutnya.map((item) => (
        <form action={formAction} key={item.status}>
          <input name="id" type="hidden" value={id} />
          <input name="status" type="hidden" value={item.status} />
          <button className="button button-secondary" disabled={pending} type="submit">
            {pending ? "Menyimpan..." : item.label}
          </button>
        </form>
      ))}
      {status === "published" && versiTertinggal > 0 ? (
        <span className="template-warning">{versiTertinggal} tenant tertinggal versi</span>
      ) : null}
      {state.status === "error" ? (
        <span className="alert alert-error" role="alert">
          {state.message}
        </span>
      ) : null}
      {state.status === "success" ? (
        <span className="alert alert-info" role="status">
          {state.message}
        </span>
      ) : null}
    </div>
  );
}

export function FormDistribusiTemplate({
  aksi,
  id,
  penggunaan,
  versi,
}: {
  aksi: AksiDistribusi;
  id: number;
  penggunaan: PenggunaanTemplateTampil[];
  versi: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    aksi,
    createIdleActionState<{ jumlah: number }>(),
  );
  const [dipilih, setDipilih] = useState<number[]>([]);

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state]);

  const tertinggal = penggunaan.filter((item) => item.versi !== versi);

  if (penggunaan.length === 0) {
    return (
      <p className="form-help">
        Belum ada tenant yang memakai template ini. Distribusi versi hanya tersedia untuk tenant
        dengan tema aktif yang sama.
      </p>
    );
  }

  return (
    <form action={formAction} className="template-distribution">
      <div className="template-distribution-head">
        <div>
          <strong>Kirim pembaruan versi {versi}</strong>
          <p>
            {tertinggal.length > 0
              ? `${tertinggal.length} tenant masih memakai versi lama.`
              : "Semua tenant sudah memakai versi ini."}
          </p>
        </div>
        <div className="platform-row-actions">
          <button
            className="button button-secondary"
            onClick={() =>
              setDipilih(
                tertinggal.length > 0
                  ? tertinggal.map((item) => item.villageId)
                  : penggunaan.map((item) => item.villageId),
              )
            }
            type="button"
          >
            Pilih semua
          </button>
          <button className="button button-secondary" onClick={() => setDipilih([])} type="button">
            Kosongkan
          </button>
        </div>
      </div>

      <div className="tenant-table-scroll">
        <table className="tenant-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Pilih</span>
              </th>
              <th scope="col">Desa</th>
              <th scope="col">Domain</th>
              <th scope="col">Tema</th>
              <th scope="col">Versi</th>
              <th scope="col">Diperbarui</th>
            </tr>
          </thead>
          <tbody>
            {penggunaan.map((item) => (
              <tr key={item.villageId}>
                <td>
                  <input
                    aria-label={`Pilih ${item.namaDesa ?? "desa"}`}
                    checked={dipilih.includes(item.villageId)}
                    name="villageIds"
                    onChange={(event) =>
                      setDipilih((sebelum) =>
                        event.target.checked
                          ? [...sebelum, item.villageId]
                          : sebelum.filter((id) => id !== item.villageId),
                      )
                    }
                    type="checkbox"
                    value={item.villageId}
                  />
                </td>
                <td>
                  <strong>{item.namaDesa ?? "Tanpa nama"}</strong>
                </td>
                <td>{item.domain ?? <span className="tenant-secondary">Belum ada domain</span>}</td>
                <td>{item.themeNama}</td>
                <td>
                  <span
                    className={
                      item.versi === versi ? "template-version" : "template-version is-warning"
                    }
                  >
                    v{item.versi}
                  </span>
                </td>
                <td>{item.diperbaruiPada}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <input name="id" type="hidden" value={id} />
      <div className="template-distribution-foot">
        <span>{dipilih.length} tenant dipilih</span>
        <button
          className="button button-primary"
          disabled={pending || dipilih.length === 0}
          type="submit"
        >
          {pending ? "Mengirim..." : "Kirim pembaruan"}
        </button>
      </div>

      {state.status === "error" ? (
        <p className="alert alert-error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p className="alert alert-info" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
