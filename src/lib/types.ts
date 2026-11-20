export type AgentStatus = "working" | "idle" | "error";
export type Pose = "sit" | "stand" | "lie";

export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  status: AgentStatus;
  task: string;
  /** Indeks spot istirahat (IDLE_SPOTS) saat idle */
  idleIndex: number;
  deskIndex: number;
}

export interface LogEntry {
  id: number;
  agentId: string;
  time: number;
  level: "info" | "warn" | "error";
  message: string;
}
