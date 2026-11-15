import Image from "next/image";
import Link from "next/link";

import { agendaMendatang } from "@/features/agenda/application/agenda-use-cases";
import { agendaLabelTanggal } from "@/features/agenda/domain/agenda";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";

import styles from "./agenda.module.css";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; bulan?: string; tahun?: string; hari?: string }>;
};

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const segments = value.split(/[\\/]/).filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === ".." || segment.includes(".."))
  ) {
    return null;
  }
  const path = segments[0] === String(villageId) ? segments : [String(villageId), ...segments];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}

function locationLabel(desa: {
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
}): string {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}

function dateParts(value: string) {
  const [year = 1970, month = 1, day = 1] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    day: new Intl.DateTimeFormat("id-ID", { day: "2-digit", timeZone: "UTC" }).format(date),
    month: new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(date),
    weekday: new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" }).format(date),
  };
}

function plainText(value: string | null): string {
  return (value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const namaBulan = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default async function AgendaPage({ searchParams }: Props) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  const agenda = await agendaMendatang(desa.id, 100);
  const lokasi = locationLabel(desa);
  const now = new Date();
  const currentYear = now.getFullYear();
  const requestedMonth = Number(params.bulan);
  const requestedYear = Number(params.tahun);
  const month =
    Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
      ? requestedMonth
      : now.getMonth() + 1;
  const year =
    Number.isInteger(requestedYear) &&
    requestedYear >= currentYear - 1 &&
    requestedYear <= currentYear + 2
      ? requestedYear
      : currentYear;
  const query = (params.q ?? "").trim().slice(0, 100);
  const requestedDay = Number(params.hari);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const selectedDay =
    Number.isInteger(requestedDay) && requestedDay >= 1 && requestedDay <= daysInMonth
      ? requestedDay
      : null;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const filteredAgenda = agenda.filter((item) => {
    const matchesMonth = item.mulai.startsWith(monthKey);
    const matchesQuery =
      !query ||
      [item.judul, item.lokasi, item.deskripsi].some((value) =>
        plainText(value).toLocaleLowerCase("id-ID").includes(query.toLocaleLowerCase("id-ID")),
      );
    return matchesMonth && matchesQuery;
  });
  const eventDays = new Set(filteredAgenda.map((item) => Number(item.mulai.slice(8, 10))));
  const selectedDateAgenda = selectedDay
    ? filteredAgenda.filter((item) => Number(item.mulai.slice(8, 10)) === selectedDay)
    : [];
  const previousMonth =
    month === 1 ? { bulan: 12, tahun: year - 1 } : { bulan: month - 1, tahun: year };
  const nextMonth =
    month === 12 ? { bulan: 1, tahun: year + 1 } : { bulan: month + 1, tahun: year };
  const monthHref = (value: { bulan: number; tahun: number }) => {
    const search = new URLSearchParams({
      bulan: String(value.bulan),
      tahun: String(value.tahun),
    });
    if (query) search.set("q", query);
    return `/agenda?${search.toString()}`;
  };
  const dayHref = (day: number) => {
    const search = new URLSearchParams({
      bulan: String(month),
      tahun: String(year),
      hari: String(day),
    });
    if (query) search.set("q", query);
    return `/agenda?${search.toString()}`;
  };
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const mondayOffset = (firstWeekday + 6) % 7;
  const calendarDays: (number | null)[] = [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return (
    <main className={styles.site}>
      <div className={styles.topline}>
        <div className={styles.container + " " + styles.toplineInner}>
          <span>Website Resmi Pemerintah Desa</span>
          <span className={styles.toplineLocation}>
            {lokasi || "Informasi resmi dan kegiatan desa"}
          </span>
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label={`Beranda ${desa.namaDesa ?? "desa"}`}>
            {desa.logo ? (
              <Image
                src={mediaUrl(desa.logo, desa.id) ?? "/images/flexidesa-mark.svg"}
                alt=""
                width={46}
                height={46}
                className={styles.logo}
                unoptimized
              />
            ) : (
              <span className={styles.logoFallback} aria-hidden="true">
                D
              </span>
            )}
            <span className={styles.brandCopy}>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <small>
                {desa.namaKabupaten ? `Kabupaten ${desa.namaKabupaten}` : "Sistem Informasi Desa"}
              </small>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Navigasi utama">
            <Link href="/">Beranda</Link>
            <Link href="/profil">Profil Desa</Link>
            <Link href="/berita">Berita</Link>
            <Link href="/agenda" aria-current="page">
              Agenda
            </Link>
          </nav>
          <Link href="/masuk" className={styles.login}>
            Masuk <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>/</span>
            <span>Informasi</span>
            <span>/</span>
            <span>Agenda Kegiatan</span>
          </nav>
          <p className={styles.eyebrow}>INFORMASI KEGIATAN DESA</p>
          <h1>Agenda Kegiatan Desa</h1>
          <p className={styles.heroText}>
            Jadwal, rencana, dan kegiatan pemerintah {desa.namaDesa ?? "desa"} untuk masyarakat.
          </p>
          {lokasi ? <p className={styles.location}>⌖ {lokasi}</p> : null}
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.container}>
          <nav className={styles.agendaTabs} aria-label="Informasi desa">
            <Link href="/berita">Berita Desa</Link>
            <span className={styles.disabledTab} aria-disabled="true">
              Pengumuman
            </span>
            <Link href="/agenda" aria-current="page">
              Agenda Kegiatan
            </Link>
            <Link href="/dokumen">Dokumen Desa</Link>
          </nav>

          <div className={styles.agendaLayout}>
            <div className={styles.agendaMain}>
              <section className={styles.calendarPanel}>
                <div className={styles.calendarHeader}>
                  <div className={styles.calendarTitle}>
                    <p className={styles.kicker}>KALENDER KEGIATAN</p>
                    <h2>▦ Kalender Kegiatan</h2>
                    <p>Lihat jadwal kegiatan desa dalam tampilan kalender interaktif.</p>
                  </div>
                  <div className={styles.monthSwitcher}>
                    <Link href={monthHref(previousMonth)} aria-label="Bulan sebelumnya">
                      ‹
                    </Link>
                    <strong>{monthLabel}</strong>
                    <Link href={monthHref(nextMonth)} aria-label="Bulan berikutnya">
                      ›
                    </Link>
                  </div>
                </div>
                <div className={styles.calendarContent}>
                  <div className={styles.calendarGrid}>
                    {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
                      <span className={styles.calendarWeekday} key={day}>
                        {day}
                      </span>
                    ))}
                    {calendarDays.map((day, index) => {
                      const isSelected = day === selectedDay;
                      const className = [
                        styles.calendarDay,
                        day && eventDays.has(day) ? styles.calendarHasEvent : "",
                        day === now.getDate() &&
                        month === now.getMonth() + 1 &&
                        year === currentYear
                          ? styles.calendarToday
                          : "",
                        isSelected ? styles.calendarSelected : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return day ? (
                        <Link
                          className={className}
                          href={dayHref(day)}
                          aria-current={isSelected ? "date" : undefined}
                          key={`${day}-${index}`}
                        >
                          {day}
                          {eventDays.has(day) ? <i aria-label="Ada kegiatan" /> : null}
                        </Link>
                      ) : (
                        <span className={styles.calendarDayEmpty} key={`empty-${index}`} />
                      );
                    })}
                  </div>
                  <section className={styles.selectedDayPanel} aria-live="polite">
                    <h3>
                      ▦ Kegiatan pada{" "}
                      {selectedDay ? `${selectedDay} ${namaBulan[month - 1]}` : "tanggal pilihan"}
                    </h3>
                    {selectedDay ? (
                      selectedDateAgenda.length ? (
                        <div className={styles.selectedDayList}>
                          {selectedDateAgenda.map((item) => (
                            <article className={styles.selectedDayEvent} key={item.id}>
                              <strong>{item.judul}</strong>
                              <span>{item.lokasi || "Lokasi belum ditentukan"}</span>
                              {item.deskripsi ? <p>{plainText(item.deskripsi)}</p> : null}
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.muted}>Belum ada kegiatan pada tanggal ini.</p>
                      )
                    ) : (
                      <p className={styles.muted}>
                        Pilih tanggal pada kalender untuk melihat kegiatan yang dijadwalkan.
                      </p>
                    )}
                  </section>
                </div>
              </section>

              <form className={styles.agendaFilter} action="/agenda" method="get">
                <label>
                  <span>Filter kegiatan</span>
                  <input
                    type="search"
                    name="q"
                    placeholder="Cari agenda kegiatan..."
                    defaultValue={query}
                  />
                </label>
                <label>
                  <span>Bulan</span>
                  <select name="bulan" defaultValue={String(month)}>
                    {namaBulan.map((name, index) => (
                      <option value={index + 1} key={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Tahun</span>
                  <select name="tahun" defaultValue={String(year)}>
                    {years.map((value) => (
                      <option value={value} key={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit">Terapkan filter</button>
              </form>

              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.kicker}>DAFTAR AGENDA KEGIATAN</p>
                  <h2>Seluruh agenda kegiatan</h2>
                  <p>Agenda yang telah dipublikasikan oleh pemerintah desa.</p>
                </div>
                <span className={styles.count}>{filteredAgenda.length} agenda</span>
              </div>

              {filteredAgenda.length > 0 ? (
                <div className={styles.agendaList}>
                  {filteredAgenda.map((item) => {
                    const date = dateParts(item.mulai);
                    const deskripsi = plainText(item.deskripsi);
                    return (
                      <article className={styles.agendaCard} key={item.id}>
                        <div
                          className={styles.dateBlock}
                          aria-label={agendaLabelTanggal(item.mulai, item.selesai)}
                        >
                          <strong>{date.day}</strong>
                          <span>{date.month}</span>
                          <small>{year}</small>
                        </div>
                        <div className={styles.agendaBody}>
                          <p className={styles.dateLabel}>
                            {date.weekday} · {agendaLabelTanggal(item.mulai, item.selesai)}
                          </p>
                          <h3>{item.judul}</h3>
                          {deskripsi ? <p className={styles.description}>{deskripsi}</p> : null}
                          {item.lokasi ? (
                            <p className={styles.place}>
                              <span aria-hidden="true">⌖</span> {item.lokasi}
                            </p>
                          ) : null}
                        </div>
                        <span className={styles.agendaMark} aria-hidden="true">
                          ↗
                        </span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon} aria-hidden="true">
                    ▦
                  </span>
                  <h3>{query ? "Agenda tidak ditemukan" : "Belum ada agenda pada periode ini"}</h3>
                  <p>Ubah filter bulan, tahun, atau kata kunci untuk melihat agenda lainnya.</p>
                  <Link href="/agenda">
                    Reset filter <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </div>

            <aside className={styles.agendaAside}>
              <section className={styles.sidebarCard}>
                <h2>Statistik kegiatan</h2>
                <div className={styles.sidebarStats}>
                  <div>
                    <strong>{agenda.length}</strong>
                    <span>Total agenda mendatang</span>
                  </div>
                  <div>
                    <strong>{filteredAgenda.length}</strong>
                    <span>Agenda pada periode ini</span>
                  </div>
                </div>
              </section>
              <section className={styles.sidebarCard}>
                <h2>Kegiatan mendatang</h2>
                {agenda.length ? (
                  <div className={styles.sidebarEvents}>
                    {agenda.slice(0, 3).map((item) => {
                      const date = dateParts(item.mulai);
                      return (
                        <div className={styles.sidebarEvent} key={item.id}>
                          <span>
                            <strong>{date.day}</strong>
                            <small>{date.month}</small>
                          </span>
                          <div>
                            <strong>{item.judul}</strong>
                            <small>{item.lokasi || "Lokasi belum ditentukan"}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles.muted}>Belum ada kegiatan yang dijadwalkan.</p>
                )}
              </section>
              <section className={styles.notifyCard}>
                <span aria-hidden="true">✓</span>
                <h2>Ikuti kegiatan desa</h2>
                <p>Masuk ke akun warga untuk mendapatkan informasi layanan dan kegiatan desa.</p>
                <Link href="/masuk">Masuk ke akun warga ↗</Link>
              </section>
            </aside>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerMain}>
            <div>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <p>
                Portal informasi resmi untuk mewujudkan pelayanan publik desa yang terbuka, mudah,
                dan terpercaya.
              </p>
            </div>
            <div>
              <span>INFORMASI KANTOR</span>
              <p>{desa.alamatKantor || lokasi || "Alamat kantor desa belum tersedia."}</p>
              {desa.telepon ? <a href={`tel:${desa.telepon}`}>{desa.telepon}</a> : null}
            </div>
            <div>
              <span>TAUTAN CEPAT</span>
              <Link href="/">Beranda</Link>
              <Link href="/profil">Profil Desa</Link>
              <Link href="/berita">Berita</Link>
              <Link href="/masuk">Layanan Warga</Link>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>
              © {new Date().getFullYear()} {desa.namaDesa ?? "Pemerintah Desa"}. Seluruh hak cipta
              dilindungi.
            </span>
            <span>
              Didukung oleh <strong>FlexiDesa</strong>
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
