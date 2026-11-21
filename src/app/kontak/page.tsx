import type { Metadata } from "next";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";

import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import { KontakFaq } from "./kontak-faq";
import styles from "./kontak.module.css";

export const metadata: Metadata = { title: "Kontak & Pengaduan" };
export const dynamic = "force-dynamic";
function locationLabel(desa: {
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
}) {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}
function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes("..")))
    return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return "/api/publik/media/" + path.map(encodeURIComponent).join("/");
}
export default async function KontakPage() {
  const desa = await getIdentitasFromRequest();
  const location = locationLabel(desa);
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const phone = desa.telepon?.trim() ?? "";
  const phoneDigits = phone.replace(/\\D/g, "");
  const whatsappNumber = phoneDigits.startsWith("0") ? "62" + phoneDigits.slice(1) : phoneDigits;
  const email = desa.emailDesa?.trim() ?? "";
  const address = desa.alamatKantor?.trim() ?? "";
  const mapQuery = [address, desa.namaDesa, location].filter(Boolean).join(", ");
  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/kontak" />
      <section className={styles.hero}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb}>
            <Link href="/">Beranda</Link>
            <span>›</span>
            <span>Kontak & Pengaduan</span>
          </nav>
          <div className={styles.heroContent}>
            <div>
              <span className={styles.eyebrow}>ASPIRASI DAN PELAYANAN PUBLIK</span>
              <h1>Kontak & Pengaduan</h1>
              <p>
                Sampaikan pertanyaan, saran, atau pengaduan Anda kepada Pemerintah{" "}
                {desa.namaDesa ?? "Desa"} melalui saluran komunikasi resmi.
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryAction} href="#saluran-kontak">
                  ▤　Hubungi Kami
                </a>
                <a className={styles.secondaryAction} href="/pengaduan">
                  ◷　Lihat Pengaduan Publik　→
                </a>
              </div>
            </div>
            <div className={styles.heroArt} aria-hidden="true">
              <div className={styles.chat}>•••</div>
              <div className={styles.agent}>
                <span>☺</span>
                <i />
                <i />
                <i />
              </div>
              <div className={styles.mail}>✉</div>
            </div>
          </div>
        </div>
      </section>
      <div className={styles.container + " " + styles.content}>
        <nav className={styles.sectionNav}>
          <a className={styles.active} href="#saluran-kontak">
            ▤　Hubungi Kami
          </a>
          <a href="#lokasi-kantor">⌖　Lokasi Kantor</a>
          <a href="#faq">ⓘ　Pertanyaan Umum (FAQ)</a>
          <a href="/pengaduan">◷　Pengaduan Publik</a>
        </nav>
        <section className={styles.intro}>
          <div className={styles.introArt}>📣</div>
          <div>
            <h2>Layanan Aspirasi Masyarakat</h2>
            <p>
              Sampaikan masukan atau laporan terkait pelayanan dan lingkungan desa melalui saluran
              resmi. Informasi pengaduan yang telah disetujui untuk publikasi dapat dilihat
              masyarakat.
            </p>
          </div>
          <ul>
            <li>Mudah diakses</li>
            <li>Disampaikan melalui saluran resmi</li>
            <li>Informasi publik menjaga privasi</li>
          </ul>
        </section>
        <div className={styles.mainGrid}>
          <section className={styles.contacts} id="saluran-kontak">
            <div className={styles.sectionTitle}>
              <span>♧</span>
              <div>
                <h2>Informasi Kontak Desa</h2>
                <p>Hubungi pemerintah desa melalui informasi resmi berikut.</p>
              </div>
            </div>
            <div className={styles.contactList}>
              <article>
                <span className={styles.whatsapp}>◉</span>
                <div>
                  <b>Telepon / WhatsApp</b>
                  <p>{phone || "Nomor telepon belum tersedia"}</p>
                </div>
                {phoneDigits ? (
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
                    ↗
                  </a>
                ) : null}
              </article>
              <article>
                <span className={styles.phone}>☎</span>
                <div>
                  <b>Telepon Kantor Desa</b>
                  <p>{phone || "Nomor telepon belum tersedia"}</p>
                </div>
                {phoneDigits ? <a href={`tel:${phone.replace(/[^\\d+]/g, "")}`}>↗</a> : null}
              </article>
              <article>
                <span className={styles.email}>✉</span>
                <div>
                  <b>Email Resmi</b>
                  <p>{email || "Email resmi belum tersedia"}</p>
                </div>
                {email ? <a href={`mailto:${email}`}>↗</a> : null}
              </article>
              <article>
                <span className={styles.addressIcon}>⌖</span>
                <div>
                  <b>Alamat Kantor</b>
                  <p>
                    {address || "Alamat kantor belum tersedia"}
                    {location ? ", " + location : ""}
                  </p>
                </div>
              </article>
            </div>
            <div className={styles.contactNote}>
              <b>Ingin menyampaikan pengaduan?</b>
              <p>
                Gunakan saluran telepon atau WhatsApp resmi di atas. Anda juga dapat melihat
                pengaduan yang telah disetujui untuk ditampilkan kepada publik.
              </p>
              <div>
                {phoneDigits ? (
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
                    Hubungi via WhatsApp　→
                  </a>
                ) : null}
                <a href="/pengaduan">Lihat Pengaduan Publik　→</a>
              </div>
            </div>
          </section>
          <aside className={styles.sidebar}>
            <section id="lokasi-kantor">
              <div className={styles.sectionTitle}>
                <span>⌖</span>
                <div>
                  <h2>Lokasi Kantor Desa</h2>
                  <p>Kantor Pemerintah {desa.namaDesa ?? "Desa"}</p>
                </div>
              </div>
              <div className={styles.mapPlaceholder}>
                <span>⌖</span>
                <b>{desa.namaDesa ?? "Kantor Desa"}</b>
                <small>{address || location || "Lokasi kantor belum dilengkapi"}</small>
              </div>
              <p className={styles.addressText}>
                {address || "Alamat kantor belum tersedia"}
                {location ? ", " + location : ""}
              </p>
              {mapQuery ? (
                <a
                  className={styles.mapLink}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Lihat di Google Maps　↗
                </a>
              ) : null}
            </section>
            <section>
              <div className={styles.sectionTitle}>
                <span>◷</span>
                <div>
                  <h2>Jam Pelayanan</h2>
                  <p>Silakan konfirmasi jadwal melalui kontak kantor.</p>
                </div>
              </div>
              <p className={styles.hoursNote}>
                Jadwal operasional belum dicantumkan pada profil desa.
              </p>
            </section>
            <section className={styles.tracking}>
              <span>▣</span>
              <div>
                <h2>Pengaduan Masyarakat</h2>
                <p>Lihat informasi pengaduan yang telah dipublikasikan.</p>
                <a href="/pengaduan">Lihat Pengaduan　→</a>
              </div>
            </section>
          </aside>
        </div>
        <section className={styles.faq} id="faq">
          <div className={styles.sectionTitle}>
            <span>ⓘ</span>
            <div>
              <h2>Pertanyaan Umum (FAQ)</h2>
              <p>Informasi umum mengenai komunikasi dan pengaduan kepada pemerintah desa.</p>
            </div>
          </div>
          <KontakFaq />
        </section>
        <section className={styles.bottomCta}>
          <div className={styles.ctaArt}>✉　✓</div>
          <div>
            <h2>Saran & Masukan Anda Sangat Berarti</h2>
            <p>
              Bantu meningkatkan kualitas pelayanan dan pembangunan desa dengan menyampaikan saran
              melalui saluran resmi.
            </p>
          </div>
          <a
            href={
              phoneDigits
                ? `https://wa.me/${whatsappNumber}`
                : email
                  ? `mailto:${email}`
                  : "#saluran-kontak"
            }
            target={phoneDigits || email ? "_blank" : undefined}
            rel={phoneDigits || email ? "noreferrer" : undefined}
          >
            Sampaikan Saran　→
          </a>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
