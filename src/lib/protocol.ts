import type { AgentStatus } from "./types";

/** Kontrak pesan WebSocket (server -> klien) */
export interface RemoteAgent { id: string; name: string; role?: string; status: AgentStatus; task?: string }
export interface RemoteLog { id?: number; agentId: string; level?: "info" | "warn" | "error"; message: string; time?: number }

export type ServerMessage =
  | { type: "snapshot"; agents: RemoteAgent[]; logs?: RemoteLog[] }
  | { type: "status"; agentId: string; status: AgentStatus; task?: string }
  | { type: "log"; log: RemoteLog };

/** Klien -> server */
export type ClientMessage = { type: "set_status"; agentId: string; status: AgentStatus };

const STATUSES = ["working", "idle", "error"];
export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const m = JSON.parse(raw);
    if (m?.type === "snapshot" && Array.isArray(m.agents)) return m;
    if (m?.type === "status" && typeof m.agentId === "string" && STATUSES.includes(m.status)) return m;
    if (m?.type === "log" && typeof m.log?.agentId === "string" && typeof m.log?.message === "string") return m;
  } catch {}
  return null;
}
