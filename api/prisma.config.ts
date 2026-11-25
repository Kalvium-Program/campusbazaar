import { defineConfig } from "prisma/config";

// Prisma 7 does not read .env by itself. Load it when the file exists.
const envFile = process.env.ENV_FILE ?? ".env";
try {
  process.loadEnvFile(envFile);
} catch {
  /* no file: use the real environment (CI, Render) */
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
