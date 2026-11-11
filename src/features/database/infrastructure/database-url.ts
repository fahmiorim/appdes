import "server-only";

export type DatabaseConnection = {
  username: string;
  password: string;
  host: string;
  port: string;
  database: string;
};

/** Baca kredensial koneksi dari DSN MySQL yang dipakai `mysqldump`/`mysql`. */
export function parseDatabaseUrl(url: string): DatabaseConnection {
  const parsed = new URL(url);
  return {
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: parsed.port || "3306",
    database: parsed.pathname.replace(/^\//, ""),
  };
}
