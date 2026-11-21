import { create } from "zustand";
import type { Agent, AgentStatus, LogEntry } from "@/lib/types";
import { CAPACITY } from "@/lib/layout";
import type { RemoteAgent, RemoteLog } from "@/lib/protocol";

export type ViewMode = "3d" | "2d";
export type Theme = "light" | "dark";
export type Tab = "office" | "tasks" | "calendar" | "usage" | "memory" | "files" | "social" | "logs";
export type Focus = "all" | "1" | "2";
export type Connection = "offline" | "connecting" | "live";

const PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];

/** Ubah agen dari server menjadi Agent lokal (warna/meja/spot idle dipertahankan bila agen sudah dikenal) */
function toAgent(r: RemoteAgent, i: number, prev?: Agent): Agent {
  return {
    id: r.id,
    name: r.name,
    role: r.role ?? prev?.role ?? "Agent",
    color: prev?.color ?? PALETTE[i % PALETTE.length],
    status: r.status,
    task: r.task ?? prev?.task ?? "",
    idleIndex: prev?.idleIndex ?? i % CAPACITY,
    deskIndex: prev?.deskIndex ?? i % CAPACITY,
  };
}
const toLog = (l: RemoteLog): LogEntry => ({ id: l.id ?? ++logSeq, agentId: l.agentId, time: l.time ?? Date.now(), level: l.level ?? "info", message: l.message });

const now = Date.now();

const INITIAL_AGENTS: Agent[] = [
  { id: "manager", name: "Social Manager", role: "Orkestrator", color: "#6366f1", status: "working", task: "Menyusun kalender konten minggu depan", idleIndex: 0, deskIndex: 0 },
  { id: "scraper", name: "Social Scraper", role: "Riset & Scraping", color: "#10b981", status: "working", task: "Scraping tren TikTok & Threads", idleIndex: 1, deskIndex: 1 },
  { id: "creator", name: "Content Creator", role: "Pembuatan Konten", color: "#f59e0b", status: "idle", task: "Menunggu brief konten berikutnya", idleIndex: 2, deskIndex: 2 },
  { id: "scheduler", name: "Scheduler", role: "Penjadwalan (Repliz)", color: "#ec4899", status: "idle", task: "Antrean posting kosong", idleIndex: 3, deskIndex: 3 },
  { id: "community", name: "Community Manager", role: "Komentar & Chat (Repliz)", color: "#06b6d4", status: "idle", task: "Tidak ada komentar menunggu", idleIndex: 4, deskIndex: 4 },
  { id: "analyst", name: "Analyst", role: "Analitik Performa", color: "#8b5cf6", status: "idle", task: "Menunggu data performa baru", idleIndex: 5, deskIndex: 5 },
];

const INITIAL_LOGS: LogEntry[] = [
  { id: 3, agentId: "scraper", time: now - 60_000, level: "info", message: "Selesai scraping 40 video tren #psikologi" },
  { id: 2, agentId: "creator", time: now - 30_000, level: "info", message: "Draf caption 'Love bombing' selesai" },
  { id: 1, agentId: "manager", time: now - 10_000, level: "info", message: "Briefing konten harian dimulai" },
];

const TASKS: Record<string, string[]> = {
  manager: ["Menyusun kalender konten minggu depan", "Briefing tim konten harian", "Meninjau performa kampanye"],
  scraper: ["Scraping tren TikTok & Threads", "Memantau akun kompetitor", "Mengumpulkan hashtag naik daun"],
  creator: ["Menulis caption Reels", "Menyusun naskah video 60 detik", "Membuat carousel edukasi"],
  scheduler: ["Mengisi antrean posting Repliz", "Mencoba ulang posting gagal", "Mengatur jam tayang optimal"],
  community: ["Membalas komentar pengikut", "Memoderasi komentar spam", "Menindaklanjuti kontak follow-up"],
  analyst: ["Menyusun laporan performa harian", "Menganalisis engagement per platform", "Merekap pertumbuhan pengikut"],
};

const MAX_LOGS = 50;
let logSeq = 100;

interface MissionState {
  agents: Agent[];
  logs: LogEntry[];
  viewMode: ViewMode;
  theme: Theme;
  simulate: boolean;
  connection: Connection;
  tab: Tab;
  setTab: (t: Tab) => void;
  authenticated: boolean;
  setAuthenticated: (v: boolean) => void;
  focus: Focus;
  follow: boolean;
  setFollow: (v: boolean) => void;
  setFocus: (f: Focus) => void;
  selectedId: string | null;
  setStatus: (id: string, status: AgentStatus) => void;
  cycleStatus: (id: string) => void;
  addLog: (agentId: string, level: LogEntry["level"], message: string) => void;
  setViewMode: (m: ViewMode) => void;
  setTheme: (t: Theme) => void;
  toggleSimulate: () => void;
  setConnection: (c: Connection) => void;
  applySnapshot: (agents: RemoteAgent[], logs?: RemoteLog[]) => void;
  applyStatus: (agentId: string, status: AgentStatus, task?: string) => void;
  applyLog: (log: RemoteLog) => void;
  select: (id: string | null) => void;
}

const STATUS_LABEL: Record<AgentStatus, string> = { working: "Working", idle: "Idle", error: "Error" };
export const statusLabel = (s: AgentStatus) => STATUS_LABEL[s];

export const useMissionStore = create<MissionState>((set, get) => ({
  agents: INITIAL_AGENTS,
  logs: INITIAL_LOGS,
  viewMode: "3d",
  theme: "dark",
  simulate: true,
  connection: "offline",
  authenticated: false,
  setAuthenticated: (authenticated) => set({ authenticated }),
  tab: "office",
  setTab: (tab) => set({ tab }),
  focus: "all",
  follow: true,
  setFollow: (follow) => set({ follow }),
  setFocus: (focus) => set({ focus }),
  selectedId: null,

  setStatus: (id, status) => {
    const agent = get().agents.find((a) => a.id === id);
    if (!agent || agent.status === status) return;
    const list = TASKS[id] ?? [];
    const task =
      status === "working" ? list[Math.floor(Math.random() * list.length)] ?? "Mengerjakan tugas"
      : status === "idle" ? "Istirahat — menunggu tugas"
      : "Terjadi kesalahan: tool call gagal (timeout)";
    set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, status, task } : a)) }));
    get().addLog(
      id,
      status === "error" ? "error" : status === "idle" ? "warn" : "info",
      status === "working" ? `Mulai bekerja: ${task}` : status === "idle" ? "Berpindah ke area istirahat (lantai 2)" : task,
    );
  },
  cycleStatus: (id) => {
    const a = get().agents.find((x) => x.id === id);
    if (!a) return;
    const order: AgentStatus[] = ["working", "idle", "error"];
    get().setStatus(id, order[(order.indexOf(a.status) + 1) % order.length]);
  },
  addLog: (agentId, level, message) =>
    set((s) => ({ logs: [{ id: ++logSeq, agentId, time: Date.now(), level, message }, ...s.logs].slice(0, MAX_LOGS) })),
  setViewMode: (viewMode) => set({ viewMode }),
  setTheme: (theme) => set({ theme }),
  toggleSimulate: () => set((s) => ({ simulate: !s.simulate })),
  select: (selectedId) => set((s) => ({ selectedId, follow: selectedId && selectedId !== s.selectedId ? true : s.follow })),
  setConnection: (connection) => set({ connection }),
  applySnapshot: (agents, logs) =>
    set((s) => ({
      agents: agents.map((r, i) => toAgent(r, i, s.agents.find((a) => a.id === r.id))),
      logs: logs ? logs.map(toLog).sort((a, b) => b.time - a.time).slice(0, MAX_LOGS) : s.logs,
    })),
  applyStatus: (agentId, status, task) =>
    set((s) => ({ agents: s.agents.map((a) => (a.id === agentId ? { ...a, status, task: task ?? a.task } : a)) })),
  applyLog: (log) => set((s) => ({ logs: [toLog(log), ...s.logs].slice(0, MAX_LOGS) })),
}));
