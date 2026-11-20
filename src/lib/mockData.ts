import type { FileEntry, MemoryItem, ScheduledJob, Task, UsageRecord } from "./workTypes";
import { AGENT_META } from "./agentsMeta";

const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const ago = (ms: number) => Date.now() - ms;

export const INITIAL_TASKS = (): Task[] => [
  { id: "t1", title: "Susun roadmap Q1", agentId: "lead", status: "in_progress", priority: "high", createdAt: ago(5 * HOUR) },
  { id: "t2", title: "Delegasi tugas sprint 14", agentId: "lead", status: "done", priority: "medium", createdAt: ago(2 * DAY) },
  { id: "t3", title: "Review laporan mingguan tim", agentId: "lead", status: "todo", priority: "low", createdAt: ago(3 * HOUR) },
  { id: "t4", title: "Refactor modul autentikasi API", agentId: "engineer", status: "in_progress", priority: "high", createdAt: ago(1 * DAY) },
  { id: "t5", title: "Optimasi query dashboard", agentId: "engineer", status: "ready", priority: "medium", createdAt: ago(2 * DAY) },
  { id: "t6", title: "Tambah rate limiting WebSocket", agentId: "engineer", status: "todo", priority: "medium", createdAt: ago(8 * HOUR) },
  { id: "t7", title: "Riset kompetitor konten AI", agentId: "researcher", status: "in_progress", priority: "medium", createdAt: ago(6 * HOUR) },
  { id: "t8", title: "Rangkum 12 paper terbaru", agentId: "researcher", status: "ready", priority: "low", createdAt: ago(1 * DAY) },
  { id: "t9", title: "Kumpulkan referensi artikel", agentId: "researcher", status: "done", priority: "low", createdAt: ago(4 * DAY) },
  { id: "t10", title: "Wireframe halaman Kanban", agentId: "designer", status: "ready", priority: "high", createdAt: ago(12 * HOUR) },
  { id: "t11", title: "Ikon & aset mode gelap", agentId: "designer", status: "todo", priority: "low", createdAt: ago(1 * DAY) },
  { id: "t12", title: "Regresi UI sebelum rilis", agentId: "qa", status: "todo", priority: "high", createdAt: ago(4 * HOUR) },
  { id: "t13", title: "Tulis test e2e login", agentId: "qa", status: "in_progress", priority: "medium", createdAt: ago(9 * HOUR) },
  { id: "t14", title: "Laporan metrik bulanan", agentId: "analyst", status: "done", priority: "medium", createdAt: ago(3 * DAY) },
  { id: "t15", title: "Analisis konsumsi token", agentId: "analyst", status: "in_progress", priority: "high", createdAt: ago(2 * HOUR) },
];

export const SCHEDULES: ScheduledJob[] = [
  { id: "j1", agentId: "lead", name: "Ringkasan standup harian", cron: "0 9 * * 1-5", description: "Rangkum progres tim setiap pagi kerja", enabled: true },
  { id: "j2", agentId: "lead", name: "Review sprint mingguan", cron: "0 16 * * 5", description: "Evaluasi hasil sprint tiap Jumat sore", enabled: true },
  { id: "j3", agentId: "engineer", name: "Build & test malam", cron: "30 1 * * *", description: "Jalankan build penuh dan suite unit test", enabled: true },
  { id: "j4", agentId: "engineer", name: "Audit dependensi", cron: "0 6 * * 1", description: "Cek kerentanan paket tiap Senin", enabled: true },
  { id: "j5", agentId: "engineer", name: "Backup database", cron: "0 */6 * * *", description: "Backup inkremental setiap 6 jam", enabled: true },
  { id: "j6", agentId: "researcher", name: "Pindai tren konten", cron: "*/30 8-18 * * 1-5", description: "Pantau tren tiap 30 menit jam kerja", enabled: true },
  { id: "j7", agentId: "researcher", name: "Digest mingguan", cron: "0 8 * * 1", description: "Kirim ringkasan riset tiap Senin", enabled: false },
  { id: "j8", agentId: "designer", name: "Sinkronisasi aset desain", cron: "15 10 * * 1-5", description: "Sinkron aset dari library desain", enabled: true },
  { id: "j9", agentId: "qa", name: "Suite regresi", cron: "0 2 * * *", description: "Regresi penuh setiap dini hari", enabled: true },
  { id: "j10", agentId: "qa", name: "Smoke test produksi", cron: "*/15 * * * *", description: "Cek kesehatan endpoint tiap 15 menit", enabled: true },
  { id: "j11", agentId: "analyst", name: "Laporan metrik harian", cron: "0 7 * * *", description: "Kompilasi metrik penggunaan kemarin", enabled: true },
  { id: "j12", agentId: "analyst", name: "Rollup KPI bulanan", cron: "0 8 1 * *", description: "Rekap KPI di awal bulan", enabled: true },
];

const mem = (id: string, agentId: string, kind: MemoryItem["kind"], title: string, content: string, h: number): MemoryItem =>
  ({ id, agentId, kind, title, content, updatedAt: ago(h * HOUR), tokens: Math.ceil(content.length / 3.6) });

export const INITIAL_MEMORIES = (): MemoryItem[] => [
  mem("m1", "lead", "konteks", "Sprint aktif", "Sprint 14 berjalan 10–21 Nov. Fokus: autentikasi, kanban, monitoring token. Anggota: 6 agen.", 5),
  mem("m2", "lead", "preferensi", "Gaya laporan", "Pengguna menyukai ringkasan singkat berpoin, bahasa Indonesia, tanpa jargon berlebihan.", 30),
  mem("m3", "lead", "fakta", "Jam kerja tim", "Standup 09:00 WIB, review sprint Jumat 16:00 WIB.", 72),
  mem("m4", "engineer", "konteks", "Arsitektur", "Next.js App Router + R3F. WebSocket server terpisah dengan tiket HMAC sekali pakai.", 8),
  mem("m5", "engineer", "pembelajaran", "Bug hydration", "Render waktu lokal memicu mismatch hydration; gunakan suppressHydrationWarning atau render setelah mount.", 20),
  mem("m6", "engineer", "preferensi", "Konvensi kode", "TypeScript strict, komponen fungsional, state global via Zustand.", 90),
  mem("m7", "researcher", "fakta", "Kompetitor utama", "Tiga pesaing dipantau: AgentBoard, OpsCrew, FlowDesk. Update tiap Senin.", 12),
  mem("m8", "researcher", "konteks", "Brief riset", "Topik: tren orkestrasi multi-agen dan observabilitas token untuk Q1.", 6),
  mem("m9", "designer", "preferensi", "Palet warna", "Gunakan indigo sebagai aksen utama; mode gelap divalidasi CVD-safe.", 40),
  mem("m10", "designer", "konteks", "Wireframe aktif", "Halaman Kanban, Kalender, Token Monitor. Mobile-first, kolom scroll horizontal.", 10),
  mem("m11", "qa", "pembelajaran", "Flaky test", "Test WebSocket kadang flaky karena reconnect backoff; tunggu status 'WS Live'.", 15),
  mem("m12", "qa", "fakta", "Cakupan test", "Cakupan saat ini 72%. Target 85% sebelum rilis.", 48),
  mem("m13", "analyst", "fakta", "Harga token", "Estimasi biaya: $3/1M token input, $15/1M token output (asumsi internal).", 24),
  mem("m14", "analyst", "konteks", "Periode analisis", "Bandingkan 7 hari terakhir dengan 7 hari sebelumnya untuk deteksi lonjakan.", 7),
];

// ---------- File output agen ----------
const f = (path: string, content: string, h: number): FileEntry => ({ path, agentId: path.split("/")[0], content, modified: ago(h * HOUR) });
export const FILES: FileEntry[] = [
  f("lead/reports/sprint-14-plan.md", "# Sprint 14\n\n## Tujuan\n- Autentikasi WebSocket\n- Kanban & kalender\n- Monitor token\n\n## Risiko\n- Beban render 3D di perangkat lemah\n", 5),
  f("lead/reports/standup-2026-11-20.md", "# Standup 20 Nov\n\n- Engineer: refactor auth 80%\n- Researcher: riset kompetitor\n- QA: e2e login berjalan\n", 3),
  f("lead/notes/roadmap-q1.md", "# Roadmap Q1\n1. Multi-tenant\n2. Peran viewer/operator\n3. Ekspor laporan PDF\n", 30),
  f("engineer/src/auth.ts", "export async function verifyTicket(token: string) {\n  // HMAC-SHA256, 30 detik, sekali pakai\n  return true;\n}\n", 2),
  f("engineer/builds/build-2026-11-20.log", "[01:30:02] install deps\n[01:31:10] tsc --noEmit ... ok\n[01:32:45] next build ... ok\n[01:33:01] done in 179s\n", 14),
  f("engineer/reports/perf.json", JSON.stringify({ lcp_ms: 1840, tbt_ms: 120, bundle_kb: 360 }, null, 2), 26),
  f("researcher/outputs/kompetitor.csv", "nama,fitur_utama,harga\nAgentBoard,Kanban,$29\nOpsCrew,Scheduler,$49\nFlowDesk,Logs,$19\n", 6),
  f("researcher/outputs/tren-ai-2026.md", "# Tren AI 2026\n- Orkestrasi multi-agen\n- Observabilitas token\n- Memori jangka panjang\n", 18),
  f("designer/assets/wireframe-kanban.md", "# Wireframe Kanban\n4 kolom: To Do | In Progress | Ready | Done\nKartu: judul, agen, prioritas\n", 10),
  f("designer/assets/palette.json", JSON.stringify({ accent: "#6366f1", surfaceDark: "#1a1a19" }, null, 2), 40),
  f("qa/reports/regresi-2026-11-20.md", "# Regresi 20 Nov\n- Total: 148 test\n- Lulus: 145\n- Gagal: 3 (flaky WS)\n", 17),
  f("qa/logs/smoke.log", "[10:00] GET /api/ws-ticket 200\n[10:15] GET / 200\n[10:30] GET / 200\n", 1),
  f("analyst/reports/metrik-harian.csv", "tanggal,token_input,token_output\n2026-11-18,4200000,1050000\n2026-11-19,4600000,1180000\n", 9),
  f("analyst/reports/kpi-nov.md", "# KPI November\n- Uptime 99.94%\n- Tugas selesai: 128\n- Biaya token: $186\n", 60),
];

// ---------- Penggunaan token (deterministik) ----------
// mulberry32: seed berurutan tetap menghasilkan keluaran yang tidak berkorelasi
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const BASE: Record<string, number> = { lead: 45_000, engineer: 120_000, researcher: 80_000, designer: 38_000, qa: 55_000, analyst: 62_000 };

/** Rekaman per jam untuk 60 hari terakhir (30 hari terkini + 30 hari pembanding) */
export function generateUsage(nowMs = Date.now()): UsageRecord[] {
  const hourNow = Math.floor(nowMs / HOUR) * HOUR;
  const out: UsageRecord[] = [];
  for (let i = 60 * 24 - 1; i >= 0; i--) {
    const t = hourNow - i * HOUR;
    const d = new Date(t);
    const h = d.getHours(), dow = d.getDay();
    const work = h >= 8 && h <= 19 ? 1 : h >= 20 || h <= 1 ? 0.45 : 0.15;
    const weekend = dow === 0 || dow === 6 ? 0.45 : 1;
    for (const a of AGENT_META) {
      const r = rng(Math.floor(t / HOUR) * 31 + a.id.charCodeAt(0) * 97 + a.id.length);
      const night = a.id === "qa" || a.id === "engineer" ? (h < 6 ? 0.9 : 0) : 0; // job malam
      const f = Math.max(work * weekend, night) * (0.55 + r() * 0.9);
      const input = Math.round(BASE[a.id] * f);
      out.push({ t, agentId: a.id, input, output: Math.round(input * (0.2 + r() * 0.12)) });
    }
  }
  return out;
}

// ---------- Generator baris log sistem ----------
const SOURCES = ["scheduler", "ws-server", "auth", "agent-runtime", "tool-runner", "db"];
const TEMPLATES: Array<[("debug" | "info" | "warn" | "error"), string, string]> = [
  ["debug", "ws-server", "heartbeat ping/pong ok (6 klien)"],
  ["info", "scheduler", "job 'Smoke test produksi' dijalankan"],
  ["info", "agent-runtime", "agent engineer memulai tugas: refactor auth"],
  ["info", "auth", "tiket WS diterbitkan (ttl 30s)"],
  ["debug", "db", "query 'tasks.list' selesai dalam 12ms"],
  ["warn", "tool-runner", "tool 'web_search' lambat (4.2s)"],
  ["warn", "agent-runtime", "konteks agen researcher mendekati batas (86%)"],
  ["error", "tool-runner", "tool call gagal: timeout setelah 30s (agent qa)"],
  ["error", "db", "koneksi database terputus, mencoba ulang (1/3)"],
  ["info", "scheduler", "job 'Backup database' selesai (8.1s)"],
  ["info", "ws-server", "klien baru terhubung dari 127.0.0.1"],
  ["debug", "agent-runtime", "menyimpan memori baru untuk agen lead (214 token)"],
];
export function randomSysLine(): { level: "debug" | "info" | "warn" | "error"; source: string; message: string } {
  const r = Math.random();
  // bobot: info/debug dominan, error jarang
  const pool = r < 0.08 ? TEMPLATES.filter((t) => t[0] === "error") : r < 0.25 ? TEMPLATES.filter((t) => t[0] === "warn") : TEMPLATES.filter((t) => t[0] === "info" || t[0] === "debug");
  const [level, source, message] = pool[Math.floor(Math.random() * pool.length)];
  return { level, source, message };
}
export { SOURCES };
