import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  WEB_ORIGIN: z.string().url(),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AI_PROVIDER: z.enum(["fake", "openai"]).default("fake"),
  AI_BASE_URL: z.string().url().optional(),
  AI_MODEL: z.string().optional(),
  // Comma-separated backups, tried in order when the main model is busy (429/5xx) or gone (404).
  AI_FALLBACK_MODELS: z.string().optional(),
  AI_API_KEY: z.string().optional(),
});

// Fail at start-up, not at the first request, when something is missing.
export const config = schema.parse(process.env);
export const isProd = config.NODE_ENV === "production";
