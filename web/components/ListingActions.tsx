"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, post, type Listing } from "@/lib/api";
import { useMe } from "@/lib/hooks";

export function ListingActions({ listing }: { listing: Listing }) {
  const { data: me, isPending } = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["listings"] }); router.refresh(); };
  const toggle = useMutation({
    mutationFn: () => api(`/listings/${listing.id}`, { method: "PATCH", body: JSON.stringify({ status: listing.status === "SOLD" ? "AVAILABLE" : "SOLD" }) }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => api(`/listings/${listing.id}`, { method: "DELETE" }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["listings"] }); router.push("/"); router.refresh(); },
  });
  const message = useMutation({
    mutationFn: () => post(`/listings/${listing.id}/messages`, { body: text }),
    onSuccess: () => { setText(""); setSent(true); qc.invalidateQueries({ queryKey: ["conversations"] }); },
  });

  if (isPending) return <div className="skeleton" style={{ height: 80 }} />;
  if (!me) {
    return (
      <div className="card pad">
        <p>Log in to message the seller.</p>
        <Link className="btn primary" href={`/login?next=/listings/${listing.id}`}>Log in</Link>
      </div>
    );
  }
  if (me.id === listing.owner.id || me.role === "ADMIN") {
    return (
      <div className="card pad stack">
        <h2>{me.id === listing.owner.id ? "Your listing" : "Admin"}</h2>
        <div className="row">
          <Link className="btn" href={`/listings/${listing.id}/edit`}>Edit</Link>
          <button className="btn" disabled={toggle.isPending} onClick={() => toggle.mutate()}>{listing.status === "SOLD" ? "Mark available" : "Mark as sold"}</button>
          <button className="btn danger" disabled={remove.isPending} onClick={() => { if (confirm("Delete this listing for good?")) remove.mutate(); }}>Delete</button>
        </div>
        {(toggle.isError || remove.isError) && <div className="notice error" role="alert">{(toggle.error ?? remove.error)?.message}</div>}
      </div>
    );
  }
  return (
    <form className="card pad" onSubmit={(e) => { e.preventDefault(); message.mutate(); }}>
      <h2>Message {listing.owner.name.split(" ")[0]}</h2>
      <label className="sr-only" htmlFor="msg">Message</label>
      <textarea id="msg" className="input" style={{ minHeight: 70 }} value={text} onChange={(e) => { setText(e.target.value); setSent(false); }} placeholder="Hi, is this still available?" maxLength={500} />
      <div className="row" style={{ marginTop: "0.6rem" }}>
        <button className="btn primary" disabled={message.isPending || !text.trim() || listing.status === "SOLD"}>{message.isPending ? "Sending…" : "Send message"}</button>
        {sent && <span className="notice ok" role="status">Sent. <Link href="/messages"><u>Open messages</u></Link></span>}
        {listing.status === "SOLD" && <span className="muted small">This item is sold.</span>}
      </div>
      {message.isError && <div className="notice error" role="alert" style={{ marginTop: "0.6rem" }}>{message.error.message}</div>}
    </form>
  );
}
