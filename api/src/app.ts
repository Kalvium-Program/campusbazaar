import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Provider } from "./ai.js";
import { loadUser, requireAuth } from "./auth.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { errorHandler, route404 } from "./errors.js";
import { aiRouter } from "./routes/ai.js";
import { authRouter } from "./routes/auth.js";
import { listingsRouter } from "./routes/listings.js";
import { messagesRouter } from "./routes/messages.js";
import { issueTicket } from "./ws.js";

export function createApp(opts: { provider?: Provider } = {}) {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin" });
    next();
  });
  // Browsers on the web app's origin may send the cookie. Nobody else.
  app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());
  app.use(loadUser);

  app.get("/api/health", async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/listings", listingsRouter);
  app.use("/api/ai", aiRouter(opts.provider));
  app.use("/api", messagesRouter);
  app.post("/api/chat/ticket", requireAuth, (req, res) => res.json({ ticket: issueTicket(req.user!.id) }));

  app.use(route404);
  app.use(errorHandler);
  return app;
}
