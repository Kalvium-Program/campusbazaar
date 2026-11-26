"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, CATEGORIES, CATEGORY_ICON, type ListingPage } from "@/lib/api";
import { ListingCard, ListingSkeletons } from "./ListingCard";

// The URL is the state: refresh or share the link and you get the same view.
export function Browse() {
  const router = useRouter();
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const category = sp.get("category") ?? "";
  const sort = sp.get("sort") ?? "newest";
  const status = sp.get("status") ?? "AVAILABLE";
  const maxPrice = sp.get("maxPrice") ?? "";
  const page = Number(sp.get("page") ?? 1);

  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);

  function set(next: Record<string, string>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) (v ? p.set(k, v) : p.delete(k));
    if (!("page" in next)) p.delete("page");
    router.replace(`/?${p.toString()}`, { scroll: false });
  }

  // Wait for typing to pause before asking the API.
  useEffect(() => {
    if (text === q) return;
    const t = setTimeout(() => set({ q: text }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const params = new URLSearchParams({ sort, page: String(page), limit: "12" });
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (maxPrice) params.set("maxPrice", maxPrice);
  if (status !== "ALL") params.set("status", status);

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useQuery({
    queryKey: ["listings", params.toString()],
    queryFn: () => api<ListingPage>(`/listings?${params}`),
    placeholderData: (prev) => prev,
  });

  return (
    <section aria-label="Listings">
      <div className="chips" role="group" aria-label="Category">
        <button className="chip" aria-pressed={!category} onClick={() => set({ category: "" })}>🛍️ All</button>
        {CATEGORIES.map((c) => (
          <button key={c.value} className="chip" aria-pressed={category === c.value} onClick={() => set({ category: c.value })}>{CATEGORY_ICON[c.value]} {c.label}</button>
        ))}
      </div>

      <div className="filters">
        <div className="wide">
          <label className="sr-only" htmlFor="q">Search</label>
          <input id="q" className="input" type="search" placeholder="Search books, cycles, headphones…" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div>
          <label className="sr-only" htmlFor="max">Maximum price</label>
          <select id="max" className="input" value={maxPrice} onChange={(e) => set({ maxPrice: e.target.value })}>
            <option value="">Any price</option>
            <option value="500">Up to ₹500</option>
            <option value="1000">Up to ₹1,000</option>
            <option value="5000">Up to ₹5,000</option>
          </select>
        </div>
        <div>
          <label className="sr-only" htmlFor="sort">Sort</label>
          <select id="sort" className="input" value={sort} onChange={(e) => set({ sort: e.target.value })}>
            <option value="newest">Newest first</option>
            <option value="popular">Most viewed</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
        <div>
          <label className="sr-only" htmlFor="status">Availability</label>
          <select id="status" className="input" value={status} onChange={(e) => set({ status: e.target.value })}>
            <option value="AVAILABLE">Available</option>
            <option value="SOLD">Sold</option>
            <option value="ALL">All</option>
          </select>
        </div>
      </div>

      {isPending ? (
        <ListingSkeletons />
      ) : isError ? (
        <div className="notice error" role="alert">
          {error.message} <button className="btn sm" onClick={() => refetch()}>Try again</button>
        </div>
      ) : data.items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔍</div><h2>Nothing matches</h2>
          <p>Try a different word, or clear the filters.</p>
          <button className="btn" onClick={() => router.replace("/")}>Clear filters</button>
        </div>
      ) : (
        <>
          <p className="muted small" aria-live="polite">{data.total} {data.total === 1 ? "listing" : "listings"}</p>
          <div className="grid" style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
            {data.items.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
          {data.totalPages > 1 && (
            <nav className="pager" aria-label="Pages">
              <button className="btn sm" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Previous</button>
              <span className="muted small">Page {data.page} of {data.totalPages}</span>
              <button className="btn sm" disabled={page >= data.totalPages} onClick={() => set({ page: String(page + 1) })}>Next</button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
