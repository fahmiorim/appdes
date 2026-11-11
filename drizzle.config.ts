import { defineConfig } from "drizzle-kit";

// `parseEnv` membaca process.env; drizzle-kit memuat berkas .env secara otomatis.
import { parseEnv } from "./src/lib/env";

const env = parseEnv(process.env);

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
