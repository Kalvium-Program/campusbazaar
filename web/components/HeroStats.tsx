"use client";
import { useQuery } from "@tanstack/react-query";
import { api, type ListingPage } from "@/lib/api";

export function HeroStats() {
  const { data } = useQuery({ queryKey: ["listings", "stats"], queryFn: () => api<ListingPage>("/listings?limit=1&status=AVAILABLE") });
  if (!data) return null;
  return (
    <div className="hero-stats">
      <div><strong>{data.total}</strong><span>items for sale</span></div>
      <div><strong>6</strong><span>categories</span></div>
      <div><strong>Free</strong><span>to list, always</span></div>
    </div>
  );
}
