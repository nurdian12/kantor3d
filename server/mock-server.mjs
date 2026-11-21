// Server WebSocket mock: `npm run ws` (default ws://localhost:8080)
// Autentikasi (opsional, aktif bila AUTH_SECRET diset): klien wajib membawa ?ticket=... dari /api/ws-ticket.
// Tiket = HMAC-SHA256 (format sama dengan src/lib/auth.ts), berumur 30 dtk, sekali pakai.
import { WebSocketServer } from "ws";
import { createHmac, timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.PORT ?? 8080);
const SECRET = process.env.AUTH_SECRET ?? "";
const ORIGINS = (process.env.WS_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const STATUSES = ["working", "idle", "error"];

const used = new Map(); // jti -> exp (cegah pemakaian ulang tiket)
setInterval(() => { const n = Date.now(); for (const [k, e] of used) if (e < n) used.delete(k); }, 30_000).unref();

function verifyTicket(token) {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expect = createHmac("sha256", SECRET).update(body).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== expect.length || !timingSafeEqual(got, expect)) return false;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (p.aud !== "ws" || typeof p.exp !== "number" || p.exp < Date.now() || typeof p.jti !== "string" || used.has(p.jti)) return false;
    used.set(p.jti, p.exp);
    return true;
  } catch { return false; }
}

const agents = [
  { id: "manager", name: "Nova", role: "Orkestrator", status: "working", task: "Menyusun kalender konten" },
  { id: "scraper", name: "Radar", role: "Riset & Scraping", status: "working", task: "Scraping tren TikTok & Threads" },
  { id: "creator", name: "Pixel", role: "Pembuatan Konten", status: "idle", task: "Menunggu brief" },
  { id: "scheduler", name: "Orbit", role: "Penjadwalan (Repliz)", status: "working", task: "Mengisi antrean posting" },
  { id: "community", name: "Sapa", role: "Komentar & Chat (Repliz)", status: "idle", task: "Tidak ada komentar menunggu" },
  { id: "analyst", name: "Kompas", role: "Analitik Performa", status: "idle", task: "Menunggu data baru" },
];
const logs = [];
let seq = 0;

const wss = new WebSocketServer({
  port: PORT,
  maxPayload: 4096,
  verifyClient: (info, cb) => {
    if (ORIGINS.length && !ORIGINS.includes(info.origin)) return cb(false, 403, "Origin not allowed");
    if (SECRET) {
      const ticket = new URL(info.req.url ?? "/", "http://x").searchParams.get("ticket");
      if (!verifyTicket(ticket)) return cb(false, 401, "Unauthorized");
    }
    cb(true);
  },
});
const broadcast = (m) => wss.clients.forEach((c) => c.readyState === 1 && c.send(JSON.stringify(m)));

function setStatus(id, status) {
  const a = agents.find((x) => x.id === id);
  if (!a || !STATUSES.includes(status) || a.status === status) return;
  a.status = status;
  a.task = status === "working" ? "Mengerjakan tugas baru" : status === "idle" ? "Istirahat" : "Tool call gagal (timeout)";
  broadcast({ type: "status", agentId: id, status, task: a.task });
  const log = { id: ++seq, agentId: id, level: status === "error" ? "error" : "info", message: `Status -> ${status}: ${a.task}`, time: Date.now() };
  logs.unshift(log); logs.length = Math.min(logs.length, 50);
  broadcast({ type: "log", log });
}

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
  ws.send(JSON.stringify({ type: "snapshot", agents, logs }));
  ws.on("message", (raw) => {
    try { const m = JSON.parse(String(raw)); if (m.type === "set_status") setStatus(m.agentId, m.status); } catch {}
  });
});

// heartbeat: putus koneksi yang tidak merespons
setInterval(() => wss.clients.forEach((ws) => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 30_000).unref();

setInterval(() => {
  const a = agents[Math.floor(Math.random() * agents.length)];
  setStatus(a.id, a.status === "error" ? "working" : Math.random() < 0.15 ? "error" : a.status === "working" ? "idle" : "working");
}, 5000);
console.log(`Mock WebSocket server di ws://localhost:${PORT} — auth: ${SECRET ? "AKTIF" : "nonaktif (set AUTH_SECRET)"}`);
