"use client";
import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { ListingForm } from "@/components/ListingForm";
import { api, type Listing } from "@/lib/api";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isPending, isError, error } = useQuery({ queryKey: ["listing", id], queryFn: () => api<{ listing: Listing }>(`/listings/${id}`).then((r) => r.listing) });
  if (isPending) return <div className="skeleton" style={{ height: 320, maxWidth: 720 }} />;
  if (isError) return <div className="notice error" role="alert">{error.message}</div>;
  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <h1>Edit listing</h1>
      <ListingForm existing={data} />
    </div>
  );
}
