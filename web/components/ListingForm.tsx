"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError, CATEGORIES, CONDITIONS, imageUrl, post, type Listing } from "@/lib/api";
import { Field } from "./Field";

type Draft = { title: string; description: string; priceRupees: number };

export function ListingForm({ existing }: { existing?: Listing }) {
  const router = useRouter();
  const qc = useQueryClient();
  const form = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(existing?.hasImage ? imageUrl(existing.id) : null);
  const [aiNotes, setAiNotes] = useState("");
  const [aiMsg, setAiMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const field = (name: string) => form.current?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  const getField = (name: string) => field(name)?.value;
  const setField = (name: string, value: string) => { const el = field(name); if (el) el.value = value; };

  const draft = useMutation({
    mutationFn: () => post<{ draft: Draft }>("/ai/draft", { notes: aiNotes, category: getField("category") }),
    onSuccess: ({ draft }) => {
      setField("title", draft.title);
      setField("description", draft.description);
      setField("priceRupees", String(draft.priceRupees));
      setAiMsg({ kind: "ok", text: "Draft ready. Read it, fix anything that is wrong, then post. You are the seller, not the AI." });
    },
    onError: (e) => setAiMsg({ kind: "error", text: e instanceof Error ? e.message : "The helper failed" }),
  });

  const save = useMutation({
    mutationFn: (fd: FormData) => api<{ listing: Listing }>(existing ? `/listings/${existing.id}` : "/listings", { method: existing ? "PATCH" : "POST", body: fd }),
    onSuccess: async ({ listing }) => {
      await qc.invalidateQueries({ queryKey: ["listings"] });
      router.push(`/listings/${listing.id}`);
      router.refresh();
    },
  });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(form.current!);
    if (!(f.get("photo") as File | null)?.size) f.delete("photo");
    save.mutate(f);
  }

  const fields = save.error instanceof ApiError ? save.error.fields : undefined;

  return (
    <form ref={form} onSubmit={submit} noValidate className="stack">
      {!existing && (
        <div className="card pad">
          <h2>Let the AI write a first draft</h2>
          <p className="muted small">Type a few words about the item. The helper suggests a title, a description and a fair price. It can be wrong, so always check it.</p>
          <label className="sr-only" htmlFor="notes">Notes about your item</label>
          <textarea id="notes" className="input" style={{ minHeight: 70 }} value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} placeholder="e.g. Hero cycle, 21 gears, new tyres, about 4000 rupees" />
          <div className="row" style={{ marginTop: "0.6rem" }}>
            <button type="button" className="btn" disabled={draft.isPending || aiNotes.trim().length < 5} onClick={() => { setAiMsg(null); draft.mutate(); }}>
              {draft.isPending ? "Writing…" : "Write my listing"}
            </button>
            {aiMsg && <span className={`notice ${aiMsg.kind}`} role="status">{aiMsg.text}</span>}
          </div>
        </div>
      )}

      <div className="card pad">
        <Field label="Title" htmlFor="title" error={fields?.title}>
          <input id="title" name="title" className="input" defaultValue={existing?.title} maxLength={80} aria-invalid={Boolean(fields?.title)} />
        </Field>
        <Field label="Description" htmlFor="description" error={fields?.description} hint="Be honest about wear and what is included.">
          <textarea id="description" name="description" className="input" defaultValue={existing?.description} maxLength={600} aria-invalid={Boolean(fields?.description)} />
        </Field>
        <div className="row" style={{ alignItems: "start" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="Price (₹)" htmlFor="priceRupees" error={fields?.priceRupees}>
              <input id="priceRupees" name="priceRupees" type="number" min={1} inputMode="numeric" className="input" defaultValue={existing?.priceRupees} aria-invalid={Boolean(fields?.priceRupees)} />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="Category" htmlFor="category" error={fields?.category}>
              <select id="category" name="category" className="input" defaultValue={existing?.category ?? "BOOKS"}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="Condition" htmlFor="condition" error={fields?.condition}>
              <select id="condition" name="condition" className="input" defaultValue={existing?.condition ?? "GOOD"}>
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <Field label="Photo" htmlFor="photo" error={fields?.photo} hint="JPG, PNG or WebP, up to 2 MB.">
          <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="input"
            onChange={(e) => { const file = e.target.files?.[0]; setPreview(file ? URL.createObjectURL(file) : null); }} />
        </Field>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview && <img className="preview" src={preview} alt="Photo preview" />}
      </div>

      {save.isError && !fields && <div className="notice error" role="alert">{save.error.message}</div>}
      <div className="row">
        <button className="btn primary" disabled={save.isPending}>{save.isPending ? "Saving…" : existing ? "Save changes" : "Post listing"}</button>
        <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
