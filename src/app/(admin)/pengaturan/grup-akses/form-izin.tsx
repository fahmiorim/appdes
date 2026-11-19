"use client";

import { useActionState } from "react";

import type { ModulePermissionRow } from "@/features/rbac/domain/grup";
import { createIdleActionState, type ActionState } from "@/lib/action-state";

interface Props {
  roleId: number;
  permissions: ModulePermissionRow[];
  readOnly: boolean;
  aksi: (state: ActionState<null>, formData: FormData) => Promise<ActionState<null>>;
}

export function FormIzin({ roleId, permissions, readOnly, aksi }: Props) {
  const [state, formAction, pending] = useActionState(aksi, createIdleActionState<null>());

  return (
    <form action={formAction} className="pengguna-izin-form">
      <input name="roleId" type="hidden" value={roleId} />

      <div className="tenant-table-scroll">
        <table className="tenant-table pengguna-izin-table">
          <thead>
            <tr>
              <th scope="col">Modul</th>
              <th scope="col">Baca</th>
              <th scope="col">Tulis</th>
              <th scope="col">Kelola</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((modul) => (
              <tr key={modul.moduleId} data-grup={modul.isGroup || undefined}>
                <td style={{ paddingLeft: modul.parentId === null ? 16 : 32 }}>
                  <span className={modul.isGroup ? "modul-strong" : undefined}>{modul.name}</span>
                  <span className="tenant-secondary">{modul.slug}</span>
                </td>
                {(["read", "write", "manage"] as const).map((akses) => (
                  <td key={akses}>
                    <input
                      aria-label={`${modul.name}: ${akses}`}
                      defaultChecked={modul[akses]}
                      disabled={readOnly}
                      name={`${akses}-${modul.moduleId}`}
                      type="checkbox"
                    />
                    <input name="moduleId" type="hidden" value={modul.moduleId} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pengguna-izin-footer">
        <p>
          Tulis mencakup baca; kelola mencakup tulis. Perubahan berlaku pada permintaan berikutnya.
        </p>
        {readOnly ? (
          <span className="pengguna-rail-note">Grup sistem tidak dapat diubah.</span>
        ) : (
          <button className="button button-primary" disabled={pending} type="submit">
            {pending ? "Menyimpan..." : "Simpan izin"}
          </button>
        )}
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
