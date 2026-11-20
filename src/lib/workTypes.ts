export type TaskStatus = "todo" | "in_progress" | "ready" | "done";
export type Priority = "low" | "medium" | "high";
export interface Task { id: string; title: string; agentId: string; status: TaskStatus; priority: Priority; createdAt: number; note?: string }

export type MemoryKind = "fakta" | "preferensi" | "konteks" | "pembelajaran";
export interface MemoryItem { id: string; agentId: string; kind: MemoryKind; title: string; content: string; updatedAt: number; tokens: number }

export type SysLevel = "debug" | "info" | "warn" | "error";
export interface SysLine { id: number; time: number; level: SysLevel; source: string; message: string }

export interface ScheduledJob { id: string; agentId: string; name: string; cron: string; description: string; enabled: boolean }

export interface FileEntry { path: string; agentId: string; content: string; modified: number }
export interface UsageRecord { t: number; agentId: string; input: number; output: number }
