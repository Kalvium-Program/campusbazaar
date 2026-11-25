"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, post, type Message } from "@/lib/api";
import { useMe } from "@/lib/hooks";

export function Thread({ listingId, withId }: { listingId: number; withId: number }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  // The same key the socket handler invalidates, so new messages appear at once.
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["thread", listingId, withId],
    queryFn: () => api<{ messages: Message[] }>(`/listings/${listingId}/messages?with=${withId}`),
  });

  const send = useMutation({
    mutationFn: () => post(`/listings/${listingId}/messages`, { body: text, to: withId }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["thread", listingId, withId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [data?.messages.length]);

  return (
    <div className="thread">
      <div className="thread-body" aria-live="polite">
        {isPending ? <div className="skeleton" style={{ height: 50 }} /> : isError ? <div className="notice error" role="alert">{error.message}</div> : data.messages.length === 0 ? (
          <p className="muted">No messages yet.</p>
        ) : data.messages.map((m) => (
          <div key={m.id} className={`bubble ${m.senderId === me?.id || m.sender.id === me?.id ? "mine" : ""}`}>
            {m.body}
            <time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</time>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="thread-form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}>
        <label className="sr-only" htmlFor="reply">Reply</label>
        <input id="reply" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" maxLength={500} />
        <button className="btn primary" disabled={send.isPending || !text.trim()}>Send</button>
      </form>
      {send.isError && <div className="notice error" role="alert" style={{ margin: "0 0.75rem 0.75rem" }}>{send.error.message}</div>}
    </div>
  );
}
