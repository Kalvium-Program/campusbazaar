import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { CookieOptions, RequestHandler } from "express";
import { config, isProd } from "./config.js";
import { db } from "./db.js";
import { forbidden, unauthorized } from "./errors.js";

export const COOKIE = "cb_token";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

// Low cost in tests keeps the suite fast. Real users get cost 12.
const COST = config.NODE_ENV === "test" ? 4 : 12;
export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export type AuthUser = { id: number; name: string; email: string; role: "USER" | "ADMIN" };

export const signToken = (userId: number) =>
  jwt.sign({ sub: String(userId) }, config.JWT_SECRET, { expiresIn: "7d" });

export const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProd,
  maxAge: SEVEN_DAYS,
  path: "/",
};

async function userFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { sub: string };
    // Re-read the user: a deleted user or a changed role takes effect at once.
    return await db.user.findUnique({
      where: { id: Number(payload.sub) },
      select: { id: true, name: true, email: true, role: true },
    });
  } catch {
    return null;
  }
}

export const loadUser: RequestHandler = async (req, _res, next) => {
  try {
    req.user = (await userFromToken(req.cookies?.[COOKIE])) ?? undefined;
    next();
  } catch (e) {
    next(e);
  }
};

export const requireAuth: RequestHandler = (req, _res, next) =>
  req.user ? next() : next(unauthorized());

export const requireRole =
  (role: AuthUser["role"]): RequestHandler =>
  (req, _res, next) =>
    !req.user ? next(unauthorized()) : req.user.role === role ? next() : next(forbidden());

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
