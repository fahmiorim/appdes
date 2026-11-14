"use client";

import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ nextPath }: { nextPath: string }) {
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

      window.location.assign(nextPath);
    } catch {
      setError("Tidak dapat menghubungi layanan autentikasi. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-stack login-form-stack" onSubmit={handleSubmit}>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <FormField
        label="Nama pengguna"
        name="username"
        autoComplete="username"
        placeholder="Masukkan nama pengguna"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        required
        minLength={3}
      />
      <div className="login-password-field">
        <FormField
          label="Kata sandi"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Masukkan kata sandi"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
        />
        <button
          className="login-password-toggle"
          type="button"
          aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          aria-pressed={showPassword}
          onClick={() => setShowPassword((value) => !value)}
        >
          {showPassword ? "Sembunyikan" : "Lihat"}
        </button>
      </div>
      <Button type="submit" block disabled={isSubmitting} className="login-submit">
        {isSubmitting ? "Memeriksa akun..." : "Masuk"}
      </Button>
    </form>
  );
}
