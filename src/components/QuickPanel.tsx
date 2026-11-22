"use client";
import { useMissionStore, statusLabel } from "@/store/useMissionStore";
import { spotFor } from "./Character";
import type { AgentStatus } from "@/lib/types";
import { sendCommand } from "@/lib/useAgentSocket";
import { useWorkStore } from "@/store/useWorkStore";
import { AGENT_META } from "@/lib/agentsMeta";

const badge: Record<AgentStatus, string> = {
  working: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  idle: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  error: "bg-red-500/15 text-red-600 dark:text-red-300",
};
const dot: Record<AgentStatus, string> = { working: "bg-emerald-500", idle: "bg-sky-500", error: "bg-red-500 animate-pulse" };
const logColor = { info: "text-slate-500", warn: "text-amber-500", error: "text-red-500" } as const;

const fmt = (t: number) => new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function QuickPanel() {
  const { agents, logs, selectedId, select, setStatus: setLocal, connection } = useMissionStore();
  const social = useWorkStore((s) => s.social);
  // saat terhubung, server adalah sumber kebenaran: kirim perintah, tunggu broadcast
  const setStatus = (id: string, status: AgentStatus) => { if (connection === "live") sendCommand({ type: "set_status", agentId: id, status }); else setLocal(id, status); };
  const counts = { working: 0, idle: 0, error: 0 };
  agents.forEach((a) => counts[a.status]++);
  const visible = selectedId ? logs.filter((l) => l.agentId === selectedId) : logs;

  return (
    <aside className="flex h-full w-full flex-col gap-4 overflow-y-auto overscroll-contain border-slate-200 bg-white/80 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 lg:w-[360px] lg:border-l">
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Kru Agen ({agents.length})</h2>
        <div className="mb-3 flex gap-2 text-[11px]">
          {(Object.keys(counts) as AgentStatus[]).map((k) => (
            <span key={k} className={`rounded-full px-2 py-0.5 font-medium ${badge[k]}`}>{counts[k]} {statusLabel(k)}</span>
          ))}
        </div>
        <ul className="space-y-2">
          {agents.map((a) => (
            <li key={a.id} onClick={() => select(selectedId === a.id ? null : a.id)}
              className={`cursor-pointer rounded-xl border p-3 transition ${selectedId === a.id ? "border-indigo-400 bg-indigo-500/10" : "border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"}`}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: a.color }}>
                  {a.name.split(" ").map((w) => w[0]).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{a.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{a.role} · Lantai {spotFor(a).floor}</p>
                </div>
                <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge[a.status]}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${dot[a.status]}`} />{statusLabel(a.status)}
                </span>
              </div>
              <p className="mt-2 truncate text-xs text-slate-600 dark:text-slate-400" title={a.task}>{AGENT_META.find((m) => m.id === a.id)?.source === "none" && connection !== "live" ? "⚠ Belum terhubung ke sumber data" : a.task}</p>
              <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                {(["working", "idle", "error"] as AgentStatus[]).map((s) => (
                  <button key={s} onClick={() => setStatus(a.id, s)}
                    className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${a.status === s ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}>
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex shrink-0 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Log Aktivitas{selectedId ? " (terfilter)" : ""}</h2>
          {connection !== "offline" ? (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${connection === "live" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/15 text-amber-600"}`}>{connection === "live" ? "● WS Live" : "◌ Menghubungkan"}</span>
          ) : (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${social ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>{social ? `● Repliz ${new Date(social.fetchedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "○ Repliz belum terhubung"}</span>
          )}
        </div>
        <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {visible.map((l) => {
            const a = agents.find((x) => x.id === l.agentId);
            return (
              <li key={l.id} className="rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800/70">
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span className="font-semibold" style={{ color: a?.color }}>{a?.name}</span><span suppressHydrationWarning>{fmt(l.time)}</span>
                </div>
                <p className={`mt-0.5 ${logColor[l.level]} ${l.level === "info" ? "dark:text-slate-300" : ""}`}>{l.message}</p>
              </li>
            );
          })}
          {visible.length === 0 && <li className="text-xs text-slate-500">Belum ada log.</li>}
        </ul>
      </div>
    </aside>
  );
}
