import type { Listing, User } from "./api";

// Used by server components. Talks to the API directly, with no browser in between.
const API = process.env.API_URL ?? "http://localhost:4000";

export async function serverGet<T>(path: string, cookie?: string): Promise<T | null> {
  const res = await fetch(`${API}/api${path}`, { cache: "no-store", headers: cookie ? { cookie } : {} });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}
export const getListing = async (id: string) => (await serverGet<{ listing: Listing }>(`/listings/${id}`))?.listing ?? null;
export type { User };
