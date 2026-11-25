"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ListingCard, ListingSkeletons } from "@/components/ListingCard";
import { api, type ListingPage } from "@/lib/api";

export default function Page() {
  const { data, isPending, isError, error } = useQuery({ queryKey: ["listings", "mine"], queryFn: () => api<ListingPage>("/listings?mine=true&limit=24") });
  return (
    <div className="stack">
      <div className="spread"><h1>My listings</h1><Link className="btn primary" href="/sell">Sell an item</Link></div>
      {isPending ? <ListingSkeletons n={4} /> : isError ? <div className="notice error" role="alert">{error.message}</div> : data.items.length === 0 ? (
        <div className="empty"><h2>You have not listed anything yet</h2><p>Post your first item. It takes a minute.</p><Link className="btn primary" href="/sell">Sell an item</Link></div>
      ) : <div className="grid">{data.items.map((l) => <ListingCard key={l.id} l={l} />)}</div>}
    </div>
  );
}
