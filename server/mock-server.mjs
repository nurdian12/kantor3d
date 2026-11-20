// Server WebSocket mock untuk pengembangan: `npm run ws` (default ws://localhost:8080)
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8080);
const agents = [
  { id: "lead", name: "Lead Agent", role: "Orkestrator", status: "working", task: "Mengoordinasi sprint" },
  { id: "engineer", name: "Lead Engineer", role: "Engineering", status: "working", task: "Refactor modul auth" },
  { id: "researcher", name: "Content Researcher", role: "Riset Konten", status: "idle", task: "Menunggu brief" },
];
const logs = [];
let seq = 0;
const wss = new WebSocketServer({ port: PORT });
const broadcast = (m) => wss.clients.forEach((c) => c.readyState === 1 && c.send(JSON.stringify(m)));

function setStatus(id, status) {
  const a = agents.find((x) => x.id === id);
  if (!a || a.status === status) return;
  a.status = status;
  a.task = status === "working" ? "Mengerjakan tugas baru" : status === "idle" ? "Istirahat" : "Tool call gagal (timeout)";
  broadcast({ type: "status", agentId: id, status, task: a.task });
  const log = { id: ++seq, agentId: id, level: status === "error" ? "error" : "info", message: `Status -> ${status}: ${a.task}`, time: Date.now() };
  logs.unshift(log); logs.length = Math.min(logs.length, 50);
  broadcast({ type: "log", log });
}

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "snapshot", agents, logs }));
  ws.on("message", (raw) => {
    try { const m = JSON.parse(String(raw)); if (m.type === "set_status") setStatus(m.agentId, m.status); } catch {}
  });
});

setInterval(() => {
  const a = agents[Math.floor(Math.random() * agents.length)];
  setStatus(a.id, a.status === "error" ? "working" : Math.random() < 0.15 ? "error" : a.status === "working" ? "idle" : "working");
}, 5000);
console.log(`Mock WebSocket server di ws://localhost:${PORT}`);
