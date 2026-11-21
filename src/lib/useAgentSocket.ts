"use client";
import { useEffect } from "react";
import { useMissionStore } from "@/store/useMissionStore";
import { parseServerMessage, type ClientMessage } from "./protocol";

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";
let socket: WebSocket | null = null;

/** Kirim perintah ke server; return false bila tidak terhubung */
export function sendCommand(msg: ClientMessage): boolean {
  if (socket?.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(msg));
  return true;
}

/** Koneksi WebSocket dengan reconnect exponential backoff. Tanpa NEXT_PUBLIC_WS_URL -> mode simulasi lokal. */
export function useAgentSocket(url: string = WS_URL) {
  useEffect(() => {
    if (!url) return;
    let closed = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout>;
    const st = useMissionStore.getState;

    const retryLater = () => { timer = setTimeout(connect, Math.min(1000 * 2 ** retry++, 15000)); };

    const connect = async () => {
      st().setConnection("connecting");
      // Ambil tiket sekali-pakai dari Next (sesi login dicek di sana). Tanpa auth -> tiket null.
      let full = url;
      try {
        const r = await fetch("/api/ws-ticket", { cache: "no-store" });
        if (r.status === 401) { window.location.href = "/login"; return; }
        if (r.ok) {
          const { ticket } = await r.json();
          if (ticket) { full += (url.includes("?") ? "&" : "?") + "ticket=" + encodeURIComponent(ticket); st().setAuthenticated(true); }
        }
      } catch { if (!closed) retryLater(); return; }
      if (closed) return;
      const ws = new WebSocket(full);
      socket = ws;
      ws.onopen = () => { retry = 0; st().setConnection("live"); };
      ws.onmessage = (e) => {
        const m = parseServerMessage(String(e.data));
        if (!m) return;
        if (m.type === "snapshot") st().applySnapshot(m.agents, m.logs);
        else if (m.type === "status") st().applyStatus(m.agentId, m.status, m.task);
        else if (m.type === "usage") st().applyUsage(m.records);
        else st().applyLog(m.log);
      };
      ws.onclose = () => {
        if (socket === ws) socket = null;
        if (closed) return;
        st().setConnection("connecting");
        retryLater();
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => { closed = true; clearTimeout(timer); socket?.close(); socket = null; st().setConnection("offline"); };
  }, [url]);
}
