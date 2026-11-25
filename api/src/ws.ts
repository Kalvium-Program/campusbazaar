import type { IncomingMessage, Server } from "node:http";
import { randomBytes } from "node:crypto";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { config } from "./config.js";

// Cross-domain deploys (Vercel + Render) cannot rely on the cookie reaching the socket,
// so the page asks the API for a one-time ticket and opens ws://api/ws?ticket=...
const TICKET_TTL_MS = 30_000;
const tickets = new Map<string, { userId: number; expires: number }>();

export function issueTicket(userId: number) {
  const now = Date.now();
  for (const [t, v] of tickets) if (v.expires < now) tickets.delete(t);
  const ticket = randomBytes(24).toString("hex");
  tickets.set(ticket, { userId, expires: now + TICKET_TTL_MS });
  return ticket;
}

function takeTicket(ticket: string | null) {
  if (!ticket) return null;
  const v = tickets.get(ticket);
  tickets.delete(ticket); // single use
  return v && v.expires >= Date.now() ? v.userId : null;
}

class Hub {
  private sockets = new Map<number, Set<WebSocket>>();
  add(userId: number, ws: WebSocket) {
    const set = this.sockets.get(userId) ?? new Set();
    set.add(ws);
    this.sockets.set(userId, set);
    ws.on("close", () => set.delete(ws));
  }
  sendTo(userId: number, payload: unknown) {
    for (const ws of this.sockets.get(userId) ?? []) if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
  }
}
export const hub = new Hub();

export function attachWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head) => {
    const refuse = (code: number, why: string) => {
      socket.write(`HTTP/1.1 ${code} ${why}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname !== "/ws") return refuse(404, "Not Found");
    // 1. Origin: only our own web app may open a socket
    if (req.headers.origin !== config.WEB_ORIGIN) return refuse(403, "Forbidden");
    // 2. Ticket: proves a logged-in user asked for this socket, once
    const userId = takeTicket(url.searchParams.get("ticket"));
    if (!userId) return refuse(401, "Unauthorized");
    wss.handleUpgrade(req, socket, head, (ws) => {
      hub.add(userId, ws);
      ws.send(JSON.stringify({ type: "ready" }));
    });
  });
}
