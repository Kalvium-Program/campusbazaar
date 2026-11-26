// One typed client. Every call goes through here, so errors look the same everywhere.
export type User = { id: number; name: string; email: string; role: "USER" | "ADMIN" };
export type Category = "BOOKS" | "ELECTRONICS" | "FURNITURE" | "CYCLES" | "CLOTHING" | "OTHER";
export type Condition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
export type Listing = {
  id: number; title: string; description: string; priceRupees: number;
  category: Category; condition: Condition; status: "AVAILABLE" | "SOLD";
  createdAt: string; hasImage: boolean; views: number; saves: number; owner: { id: number; name: string };
};
export type ListingPage = { items: Listing[]; page: number; limit: number; total: number; totalPages: number };
export type Message = { id: number; body: string; senderId: number; createdAt: string; sender: { id: number; name: string } };
export type Conversation = {
  listing: { id: number; title: string };
  with: { id: number; name: string };
  last: { body: string; createdAt: string; mine: boolean };
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...init,
    headers: { ...(init.body && !isForm ? { "content-type": "application/json" } : {}), ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error;
    throw new ApiError(res.status, e?.code ?? "UNKNOWN", e?.message ?? "Something went wrong", e?.fields);
  }
  return json as T;
}

export const post = <T,>(path: string, body?: unknown) => api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const imageUrl = (id: number) => `/api/listings/${id}/image`;
export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "BOOKS", label: "Books" }, { value: "ELECTRONICS", label: "Electronics" },
  { value: "FURNITURE", label: "Furniture" }, { value: "CYCLES", label: "Cycles" },
  { value: "CLOTHING", label: "Clothing" }, { value: "OTHER", label: "Other" },
];
export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "NEW", label: "New" }, { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good" }, { value: "FAIR", label: "Fair" },
];
export const label = (list: { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;

export const CATEGORY_ICON: Record<Category, string> = { BOOKS: "📚", ELECTRONICS: "🎧", FURNITURE: "🪑", CYCLES: "🚲", CLOTHING: "👕", OTHER: "✨" };
export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  for (const [n, u] of [[86400 * 30, "mo"], [86400 * 7, "w"], [86400, "d"], [3600, "h"], [60, "m"]] as const) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  return "just now";
}
export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
