"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { DataDns } from "@/features/multi-desa/domain/status-dns";
import type { DataSsl } from "@/features/multi-desa/domain/status-ssl";
import type { ActionState } from "@/lib/action-state";

/**
 * Tombol pemeriksaan DNS/TLS satu domain di header detail.
 *
 * Server Action tetap membaca host dari database berdasarkan `domainId`.
 * Komponen ini hanya menampilkan status proses dan menyegarkan data cache
 * setelah pemeriksaan selesai.
 */
export function DetailDomainNetworkActions({
  domainId,
  aksiDns,
  aksiSsl,
}: {
  domainId: number;
  aksiDns: (domainId: number) => Promise<ActionState<DataDns>>;
  aksiSsl: (domainId: number) => Promise<ActionState<DataSsl>>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{
    tone: "success" | "warning" | "error";
    text: string;
  } | null>(null);

  function jalankan(jenis: "dns" | "ssl") {
    startTransition(async () => {
      const hasil = jenis === "dns" ? await aksiDns(domainId) : await aksiSsl(domainId);

      if (hasil.status === "success") {
        setPesan({ tone: hasil.tone === "warning" ? "warning" : "success", text: hasil.message });
        router.refresh();
        return;
      }

      if (hasil.status === "error") {
        setPesan({ tone: "error", text: hasil.message });
      }
    });
  }

  return (
    <div className="domain-network-actions">
      <div className="domain-network-buttons">
        <button
          className="button button-secondary"
          disabled={pending}
          onClick={() => jalankan("dns")}
          type="button"
        >
          Cek DNS
        </button>
        <button
          className="button button-secondary"
          disabled={pending}
          onClick={() => jalankan("ssl")}
          type="button"
        >
          Cek SSL
        </button>
      </div>
      {pesan ? (
        <span aria-live="polite" className={`domain-network-note is-${pesan.tone}`}>
          {pesan.text}
        </span>
      ) : null}
    </div>
  );
}
