import { defineConfig } from "vitest/config";

// Local runs read .env.test. CI sets the variables itself.
try {
  process.loadEnvFile(".env.test");
} catch {
  /* no file */
}

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    // every test file shares one database, so files must not run in parallel
    fileParallelism: false,
  },
});
