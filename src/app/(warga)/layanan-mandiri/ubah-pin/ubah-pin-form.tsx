"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import type { ActionState } from "@/lib/action-state";

import { ubahPinAction } from "./actions";

const STATE_AWAL: ActionState = { status: "idle" };

export function UbahPinForm({ mustChangePin }: { mustChangePin: boolean }) {
  const [state, formAction, pending] = useActionState(ubahPinAction, STATE_AWAL);

  const fieldError = (name: string) =>
    state.status === "error" ? state.fieldErrors?.[name]?.[0] : undefined;

  return (
    <form action={formAction} className="form-stack">
      {mustChangePin ? (
        <Alert variant="info">
          Ini PIN sementara dari administrator desa. Ganti sekarang agar layanan mandiri dapat
          dipakai.
        </Alert>
      ) : null}

      {state.status === "error" ? <Alert variant="error">{state.message}</Alert> : null}

      <FormField
        label="PIN lama"
        name="pinLama"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        pattern="[0-9]{6}"
        minLength={6}
        maxLength={6}
        placeholder="6 angka"
        required
        error={fieldError("pinLama")}
      />

      <FormField
        label="PIN baru"
        name="pinBaru"
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        pattern="[0-9]{6}"
        minLength={6}
        maxLength={6}
        placeholder="6 angka"
        required
        error={fieldError("pinBaru")}
      />

      <FormField
        label="Ulangi PIN baru"
        name="konfirmasiPin"
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        pattern="[0-9]{6}"
        minLength={6}
        maxLength={6}
        placeholder="6 angka"
        required
        helpText="PIN harus 6 digit angka dan berbeda dari PIN lama."
        error={fieldError("konfirmasiPin")}
      />

      <Button type="submit" block disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan PIN baru"}
      </Button>
    </form>
  );
}
