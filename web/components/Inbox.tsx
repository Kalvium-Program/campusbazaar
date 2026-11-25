"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, type Conversation } from "@/lib/api";
import { useChatSocket } from "@/lib/useChatSocket";
import { Thread } from "./Thread";

export function Inbox() {
  const qc = useQueryClient();
  const sp = useSearchParams();
  const listingId = Number(sp.get("listing")) || null;
  const withId = Number(sp.get("with")) || null;

  const { data, isPending, isError, error } = useQuery({ queryKey: ["conversations"], queryFn: () => api<{ conversations: Conversation[] }>("/conversations") });

  const live = useChatSocket((msg) => {
    const m = msg as { type?: string; listingId?: number; message?: { sender: { id: number } } };
    if (m.type !== "message") return;
    qc.invalidateQueries({ queryKey: ["conversations"] });
    qc.invalidateQueries({ queryKey: ["thread", m.listingId, m.message?.sender.id] });
    qc.invalidateQueries({ queryKey: ["thread", m.listingId] });
  });

  return (
    <div className="stack">
      <div className="spread">
        <h1>Messages</h1>
        <span className="muted small"><span className={`dot ${live ? "live" : ""}`} /> {live ? "Live" : "Connecting…"}</span>
      </div>
      <div className="chat">
        <div className="card" style={{ overflow: "auto", maxHeight: 520 }}>
          {isPending ? <div className="pad"><div className="skeleton" style={{ height: 60 }} /></div> : isError ? <div className="pad notice error" role="alert">{error.message}</div> : data.conversations.length === 0 ? (
            <div className="empty small">No conversations yet. Open a listing and send a message.</div>
          ) : data.conversations.map((c) => (
            <Link key={`${c.listing.id}:${c.with.id}`} href={`/messages?listing=${c.listing.id}&with=${c.with.id}`} className={`convo ${listingId === c.listing.id && withId === c.with.id ? "active" : ""}`}>
              <strong>{c.with.name}</strong>
              <span className="small">{c.listing.title}</span>
              <span className="muted small" style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.last.mine ? "You: " : ""}{c.last.body}</span>
            </Link>
          ))}
        </div>
        <div className="card">
          {listingId && withId ? <Thread listingId={listingId} withId={withId} /> : <div className="empty">Pick a conversation.</div>}
        </div>
      </div>
    </div>
  );
}
