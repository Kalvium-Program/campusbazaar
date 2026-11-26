"use client";
import Link from "next/link";
import { ListingCard, ListingSkeletons } from "@/components/ListingCard";
import { useSavedIds } from "@/lib/hooks";

export default function Page() {
  const { items, isPending } = useSavedIds();
  return (
    <div className="stack">
      <div className="spread"><h1>Saved</h1><span className="muted small">Things you are keeping an eye on</span></div>
      {isPending ? <ListingSkeletons n={4} /> : !items?.length ? (
        <div className="empty"><div className="empty-icon">♡</div><h2>Nothing saved yet</h2><p>Tap the heart on any listing to keep it here.</p><Link className="btn primary" href="/">Browse listings</Link></div>
      ) : <div className="grid">{items.map((l) => <ListingCard key={l.id} l={l} />)}</div>}
    </div>
  );
}
