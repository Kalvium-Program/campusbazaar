"use client";
import { useEffect, useState } from "react";

// The free API host sleeps when idle. Ping it on load so it wakes while the visitor reads the page,
// and say so if it is slow instead of leaving them staring at a blank grid.
export function WakeBanner() {
  const [state, setState] = useState<"ok" | "waking">("ok");
  useEffect(() => {
    let done = false;
    const slow = setTimeout(() => { if (!done) setState("waking"); }, 2500);
    (async () => {
      for (let i = 0; i < 12 && !done; i++) {
        try {
          const r = await fetch("/api/health", { cache: "no-store" });
          if (r.ok) break;
        } catch { /* keep trying */ }
        await new Promise((r) => setTimeout(r, 3000));
      }
      done = true;
      clearTimeout(slow);
      setState("ok");
    })();
    return () => { done = true; clearTimeout(slow); };
  }, []);
  if (state === "ok") return null;
  return (
    <div className="wake" role="status">
      <span className="spinner" aria-hidden="true" />
      <span><strong>Waking up the server…</strong> It naps when nobody is around. This takes up to a minute, then it is fast.</span>
    </div>
  );
}
