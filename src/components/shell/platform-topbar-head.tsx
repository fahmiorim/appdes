"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { headerPlatform } from "@/features/navigation/domain/header-platform";

/**
 * Identitas halaman konsol platform di top bar.
 *
 * Judul dan deskripsi halaman mengikuti rute aktif sehingga top bar langsung
 * memberi konteks tanpa blok judul terpisah yang mendorong konten ke bawah.
 */
export function PlatformTopbarHead() {
  const pathname = usePathname();
  const { eyebrow, title, description, aksi } = headerPlatform(pathname);

  return (
    <div className="platform-topbar-head">
      <div className="platform-topbar-text">
        <span className="platform-topbar-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aksi ? (
        <Link className="button button-secondary" href={aksi.href}>
          {aksi.label}
        </Link>
      ) : null}
    </div>
  );
}
