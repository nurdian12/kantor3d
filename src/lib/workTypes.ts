export type TaskStatus = "todo" | "in_progress" | "ready" | "done";
export type Priority = "low" | "medium" | "high";
export interface Task { id: string; title: string; agentId: string; status: TaskStatus; priority: Priority; createdAt: number; note?: string; source?: "repliz" | "orkestrator" }

export type SysLevel = "debug" | "info" | "warn" | "error";
export interface SysLine { id: number; time: number; level: SysLevel; source: string; message: string }

export interface UsageRecord { t: number; agentId: string; input: number; output: number }
