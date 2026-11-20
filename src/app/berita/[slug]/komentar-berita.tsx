"use client";

import { useEffect, useState, type FormEvent } from "react";

import styles from "../berita.module.css";

type Comment = { id: number; namaPenulis: string; isi: string; createdAt: string };
type Props = { slug: string; enabled: boolean };

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function KomentarBerita({ slug, enabled }: Props) {
  const [items, setItems] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [isi, setIsi] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const endpoint = `/api/publik/berita/${encodeURIComponent(slug)}/komentar`;

  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Komentar belum dapat dimuat.");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setItems(data.daftar ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        if (active) setMessage("Daftar komentar belum dapat dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [endpoint]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSending(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, email, isi }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Komentar gagal dikirim.");
      setMessage("Komentar berhasil dikirim dan langsung ditampilkan.");
      setNama("");
      setEmail("");
      setIsi("");
      const refreshed = await fetch(endpoint, { cache: "no-store" });
      if (refreshed.ok) {
        const latest = await refreshed.json();
        setItems(latest.daftar ?? []);
        setTotal(latest.total ?? 0);
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Komentar gagal dikirim.");
    } finally {
      setSending(false);
    }
  }

  if (!enabled)
    return (
      <section className={styles.commentPanel}>
        <h2>▢　Komentar</h2>
        <p>Komentar untuk berita ini dinonaktifkan oleh pengelola desa.</p>
      </section>
    );

  return (
    <section className={styles.commentPanel}>
      <h2>▢　Tinggalkan Komentar</h2>
      <form className={styles.commentForm} onSubmit={submit}>
        <label className={styles.commentField}>
          <span>Komentar</span>
          <textarea
            value={isi}
            onChange={(event) => setIsi(event.target.value)}
            placeholder="Tulis komentar Anda..."
            maxLength={500}
            minLength={5}
            required
            rows={3}
          />
          <small>{isi.length}/500</small>
        </label>
        <div className={styles.commentInputs}>
          <label>
            <span>Nama Lengkap</span>
            <input
              value={nama}
              onChange={(event) => setNama(event.target.value)}
              placeholder="Nama Lengkap"
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          <label>
            <span>Email (opsional)</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email (opsional)"
              maxLength={150}
            />
          </label>
          <button type="submit" disabled={sending}>
            {sending ? "Mengirim..." : "➤　Kirim Komentar"}
          </button>
        </div>
        {message ? (
          <p className={styles.commentMessage} role="status">
            {message}
          </p>
        ) : null}
      </form>
      <div className={styles.commentListHead}>
        <strong>Komentar warga</strong>
        <span>{total} komentar</span>
      </div>
      {loading ? (
        <p className={styles.emptySmall}>Memuat komentar…</p>
      ) : items.length ? (
        <div className={styles.commentList}>
          {items.map((item) => (
            <article key={item.id}>
              <span className={styles.commentAvatar}>
                {item.namaPenulis.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{item.namaPenulis}</strong>
                <time>{dateLabel(item.createdAt)}</time>
                <p>{item.isi}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.emptySmall}>
          Belum ada komentar. Jadilah yang pertama memberikan komentar.
        </p>
      )}
    </section>
  );
}
