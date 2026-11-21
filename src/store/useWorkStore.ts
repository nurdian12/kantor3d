import { create } from "zustand";
import type { SysLevel, SysLine, Task, TaskStatus } from "@/lib/workTypes";
import type { SocialSummary, StatsSummary } from "@/lib/repliz";

const MAX_LINES = 500;
let lineSeq = 0;

interface WorkState {
  tasks: Task[];
  sysLogs: SysLine[];
  /** Ringkasan Repliz (null bila belum dimuat / belum dikonfigurasi) */
  social: SocialSummary | null;
  socialError: string | null;
  socialLoading: boolean;
  fetchSocial: (force?: boolean) => Promise<void>;
  stats: StatsSummary | null;
  statsError: string | null;
  statsLoading: boolean;
  fetchStats: (force?: boolean) => Promise<void>;
  moveTask: (id: string, status: TaskStatus) => void;
  addTask: (t: Pick<Task, "title" | "agentId" | "priority">) => void;
  removeTask: (id: string) => void;
  pushSys: (level: SysLevel, source: string, message: string) => void;
  clearSys: () => void;
}

export const useWorkStore = create<WorkState>((set) => ({
  tasks: [],
  sysLogs: [],
  social: null,
  socialError: null,
  socialLoading: false,
  stats: null,
  statsError: null,
  statsLoading: false,
  fetchStats: async (force = false) => {
    set({ statsLoading: true });
    try {
      const r = await fetch(`/api/repliz/stats${force ? "?refresh=1" : ""}`, { cache: "no-store" });
      const j = await r.json();
      if (r.ok) set({ stats: j, statsError: null, statsLoading: false });
      else set({ statsError: j.message ?? "Gagal memuat statistik Repliz.", statsLoading: false });
    } catch { set({ statsError: "Tidak dapat menghubungi server.", statsLoading: false }); }
  },
  fetchSocial: async (force = false) => {
    set({ socialLoading: true });
    try {
      const r = await fetch(`/api/repliz${force ? "?refresh=1" : ""}`, { cache: "no-store" });
      const j = await r.json();
      if (r.ok) set({ social: j, socialError: null, socialLoading: false });
      else set({ socialError: j.message ?? "Gagal memuat data Repliz.", socialLoading: false });
    } catch { set({ socialError: "Tidak dapat menghubungi server.", socialLoading: false }); }
  },
  moveTask: (id, status) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),
  addTask: (t) => set((s) => ({ tasks: [{ id: `t${Date.now()}`, status: "todo", createdAt: Date.now(), ...t }, ...s.tasks] })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  pushSys: (level, source, message) =>
    set((s) => ({ sysLogs: [...s.sysLogs, { id: ++lineSeq, time: Date.now(), level, source, message }].slice(-MAX_LINES) })),
  clearSys: () => set({ sysLogs: [] }),
}));
