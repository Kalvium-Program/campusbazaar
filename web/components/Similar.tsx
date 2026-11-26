"use client";
import { useQuery } from "@tanstack/react-query";
import { api, type Listing } from "@/lib/api";
import { ListingCard } from "./ListingCard";

export function Similar({ id }: { id: number }) {
  const { data } = useQuery({ queryKey: ["similar", id], queryFn: () => api<{ items: Listing[] }>(`/listings/${id}/similar`) });
  if (!data?.items.length) return null;
  return (
    <section className="similar" aria-label="Similar listings">
      <h2>You might also like</h2>
      <div className="grid">{data.items.map((l) => <ListingCard key={l.id} l={l} />)}</div>
    </section>
  );
}
