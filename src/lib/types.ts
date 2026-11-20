export type AgentStatus = "working" | "idle" | "error";
export type Pose = "sit" | "stand" | "lie";
export type IdleSpotId = "lounge" | "bedroom" | "balcony";

export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  status: AgentStatus;
  task: string;
  /** Spot yang dipakai saat idle */
  idleSpot: IdleSpotId;
  deskIndex: number;
}

export interface LogEntry {
  id: number;
  agentId: string;
  time: number;
  level: "info" | "warn" | "error";
  message: string;
}
