import { create } from "zustand";
import type { Agent, AgentStatus, LogEntry } from "@/lib/types";
import { CAPACITY } from "@/lib/layout";
import type { RemoteAgent, RemoteLog } from "@/lib/protocol";

export type ViewMode = "3d" | "2d";
export type Theme = "light" | "dark";
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
  { id: "lead", name: "Lead Agent", role: "Orkestrator", color: "#6366f1", status: "working", task: "Mengoordinasi sprint & delegasi tugas", idleIndex: 0, deskIndex: 0 },
  { id: "engineer", name: "Lead Engineer", role: "Engineering", color: "#10b981", status: "working", task: "Refactor modul autentikasi API", idleIndex: 1, deskIndex: 1 },
  { id: "researcher", name: "Content Researcher", role: "Riset Konten", color: "#f59e0b", status: "idle", task: "Menunggu brief riset berikutnya", idleIndex: 2, deskIndex: 2 },
];

const INITIAL_LOGS: LogEntry[] = [
  { id: 3, agentId: "researcher", time: now - 60_000, level: "info", message: "Selesai merangkum 12 artikel tren AI" },
  { id: 2, agentId: "engineer", time: now - 30_000, level: "info", message: "Memulai refactor modul autentikasi" },
  { id: 1, agentId: "lead", time: now - 10_000, level: "info", message: "Sprint planning dimulai" },
];

const TASKS: Record<string, string[]> = {
  lead: ["Mengoordinasi sprint & delegasi tugas", "Review laporan harian tim", "Menyusun roadmap kuartal"],
  engineer: ["Refactor modul autentikasi API", "Menulis unit test untuk scheduler", "Optimasi query database"],
  researcher: ["Riset kompetitor konten", "Merangkum paper terbaru", "Mengumpulkan referensi artikel"],
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
