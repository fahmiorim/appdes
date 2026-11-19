"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { headerPlatform } from "@/features/navigation/domain/header-platform";

/**
 * Bilah atas konsol platform: breadcrumb, pencarian tenant, dan tautan audit.
 *
 * Judul dan deskripsi halaman tidak lagi dirender di sini — keduanya menjadi
 * header konten (`PlatformPageHeader`) seperti mockup konsol. Pencarian
 * mengirim `q` ke daftar domain lintas desa; tidak ada hasil pencarian palsu
 * di top bar.
 */
export function PlatformTopbarHead() {
  const pathname = usePathname();
  const { title, remah = [] } = headerPlatform(pathname);
  const diRingkasan = pathname === "/super-admin";
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd+K memfokuskan pencarian, sama seperti petunjuk tombol di mockup.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <nav className="platform-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li>
            <span className="platform-breadcrumb-home" aria-hidden="true">
              <svg
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                viewBox="0 0 24 24"
              >
                <path d="M4 10.6 12 4l8 6.6" />
                <path d="M6.4 9.6V19h11.2V9.6" />
                <path d="M10 19v-4.6h4V19" />
              </svg>
            </span>
            {diRingkasan ? (
              <span aria-current="page">Dashboard Super Admin</span>
            ) : (
              <Link href="/super-admin">Dashboard Super Admin</Link>
            )}
          </li>
          {diRingkasan
            ? null
            : remah.map((item, index) => (
                <li key={`${item.label}-${index}`}>
                  <span aria-hidden="true" className="platform-breadcrumb-sep">
                    ›
                  </span>
                  {item.href ? (
                    <Link href={item.href}>{item.label}</Link>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </li>
              ))}
          {diRingkasan ? null : (
            <li aria-current="page">
              <span aria-hidden="true" className="platform-breadcrumb-sep">
                ›
              </span>
              {title}
            </li>
          )}
        </ol>
      </nav>

      <div className="platform-topbar-tools">
        <form
          action="/super-admin/domain"
          className="platform-topbar-search"
          method="get"
          role="search"
        >
          <span aria-hidden="true" className="platform-topbar-search-icon">
            <svg
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <circle cx="10.8" cy="10.8" r="6.4" />
              <path d="m15.6 15.6 4 4" />
            </svg>
          </span>
          <input
            aria-label="Cari desa atau domain"
            name="q"
            placeholder="Cari desa atau domain..."
            ref={inputRef}
            type="search"
          />
          <kbd aria-hidden="true">Ctrl K</kbd>
        </form>
        <Link
          aria-label="Buka audit trail"
          className="platform-topbar-icon"
          href="/super-admin/audit"
          title="Audit trail"
        >
          <svg
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.7}
            viewBox="0 0 24 24"
          >
            <path d="M6 9.4a6 6 0 0 1 12 0c0 4.2 1.6 5.4 1.6 5.4H4.4S6 13.6 6 9.4Z" />
            <path d="M10.2 18a2 2 0 0 0 3.6 0" />
          </svg>
        </Link>
      </div>
    </>
  );
}
