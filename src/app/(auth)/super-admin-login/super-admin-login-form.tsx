"use client";

import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { authClient } from "@/lib/auth-client";

import styles from "./super-admin-login.module.css";

export function SuperAdminLoginForm({ nextPath }: { nextPath: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.username({
        username: username.trim(),
        password,
      });

      if (result.error) {
        setError("Nama pengguna atau kata sandi tidak sesuai.");
        return;
      }

      if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) return;
      window.location.assign(nextPath);
    } catch {
      setError("Tidak dapat menghubungi layanan autentikasi. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <label className={styles.field}>
        <span>Nama pengguna</span>
        <input
          autoComplete="username"
          name="username"
          placeholder="Masukkan nama pengguna"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          minLength={3}
          required
        />
      </label>
      <label className={styles.field}>
        <span>Kata sandi</span>
        <span className={styles.passwordWrap}>
          <input
            autoComplete="current-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Masukkan kata sandi"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
          <button
            type="button"
            className={styles.passwordToggle}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Sembunyikan" : "Lihat"}
          </button>
        </span>
      </label>
      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          "Memeriksa akun..."
        ) : (
          <>
            Masuk ke Konsol <span aria-hidden="true">→</span>
          </>
        )}
      </button>
    </form>
  );
}
