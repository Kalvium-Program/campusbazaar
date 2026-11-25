"use client";
import { useEffect, useState } from "react";
import { post } from "./api";

// Asks the API for a one-time ticket, then opens the socket with it.
// Reconnects with a short delay if the connection drops.
export function useChatSocket(onMessage: (data: unknown) => void) {
  const [live, setLive] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const url = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws";

    async function connect() {
      try {
        const { ticket } = await post<{ ticket: string }>("/chat/ticket");
        if (stopped) return;
        ws = new WebSocket(`${url}?ticket=${ticket}`);
        ws.onopen = () => setLive(true);
        ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch { /* ignore bad frames */ } };
        ws.onclose = () => { setLive(false); if (!stopped) timer = setTimeout(connect, 3000); };
      } catch {
        if (!stopped) timer = setTimeout(connect, 5000);
      }
    }
    connect();
    return () => { stopped = true; clearTimeout(timer); ws?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return live;
}
