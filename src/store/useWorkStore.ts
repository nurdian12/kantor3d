import { create } from "zustand";
import type { MemoryItem, SysLevel, SysLine, Task, TaskStatus } from "@/lib/workTypes";
import { INITIAL_MEMORIES, INITIAL_TASKS } from "@/lib/mockData";

const MAX_LINES = 500;
let lineSeq = 0;

interface WorkState {
  tasks: Task[];
  memories: MemoryItem[];
  sysLogs: SysLine[];
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
  moveTask: (id, status) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),
  addTask: (t) => set((s) => ({ tasks: [{ id: `t${Date.now()}`, status: "todo", createdAt: Date.now(), ...t }, ...s.tasks] })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  addMemory: (m) => set((s) => ({ memories: [{ id: `m${Date.now()}`, updatedAt: Date.now(), tokens: Math.ceil(m.content.length / 3.6), ...m }, ...s.memories] })),
  removeMemory: (id) => set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),
  pushSys: (level, source, message) =>
    set((s) => ({ sysLogs: [...s.sysLogs, { id: ++lineSeq, time: Date.now(), level, source, message }].slice(-MAX_LINES) })),
  clearSys: () => set({ sysLogs: [] }),
}));
