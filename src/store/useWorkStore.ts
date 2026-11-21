import { create } from "zustand";
import type { MemoryItem, SysLevel, SysLine, Task, TaskStatus } from "@/lib/workTypes";
import { INITIAL_MEMORIES, INITIAL_TASKS } from "@/lib/mockData";
import type { SocialSummary } from "@/lib/repliz";

const MAX_LINES = 500;
let lineSeq = 0;

interface WorkState {
  tasks: Task[];
  memories: MemoryItem[];
  sysLogs: SysLine[];
  /** Ringkasan Repliz (null bila belum dimuat / belum dikonfigurasi) */
  social: SocialSummary | null;
  socialError: string | null;
  socialLoading: boolean;
  fetchSocial: (force?: boolean) => Promise<void>;
  moveTask: (id: string, status: TaskStatus) => void;
  addTask: (t: Pick<Task, "title" | "agentId" | "priority">) => void;
  removeTask: (id: string) => void;
  addMemory: (m: Pick<MemoryItem, "agentId" | "kind" | "title" | "content">) => void;
  removeMemory: (id: string) => void;
  pushSys: (level: SysLevel, source: string, message: string) => void;
  clearSys: () => void;
}

export const useWorkStore = create<WorkState>((set) => ({
  tasks: INITIAL_TASKS(),
  memories: INITIAL_MEMORIES(),
  sysLogs: [],
  social: null,
  socialError: null,
  socialLoading: false,
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
  addMemory: (m) => set((s) => ({ memories: [{ id: `m${Date.now()}`, updatedAt: Date.now(), tokens: Math.ceil(m.content.length / 3.6), ...m }, ...s.memories] })),
  removeMemory: (id) => set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),
  pushSys: (level, source, message) =>
    set((s) => ({ sysLogs: [...s.sysLogs, { id: ++lineSeq, time: Date.now(), level, source, message }].slice(-MAX_LINES) })),
  clearSys: () => set({ sysLogs: [] }),
}));
