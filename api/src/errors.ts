import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

// One error shape for the whole API: { error: { code, message, fields? } }
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new HttpError(404, "NOT_FOUND", `${what} not found`);
export const unauthorized = (m = "Please log in") => new HttpError(401, "UNAUTHORIZED", m);
export const forbidden = (m = "You are not allowed to do that") => new HttpError(403, "FORBIDDEN", m);

export const route404: RequestHandler = (_req, _res, next) => next(notFound("Route"));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }
    res.status(400).json({ error: { code: "VALIDATION", message: "Please fix the highlighted fields", fields } });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields } });
    return;
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: { code: "FILE_TOO_LARGE", message: "Photo must be 2 MB or smaller" } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong on our side" } });
};
