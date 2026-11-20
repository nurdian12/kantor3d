"use client";
import { useMemo, useState } from "react";
import { AGENT_META, agentMeta } from "@/lib/agentsMeta";
import type { Priority, Task, TaskStatus } from "@/lib/workTypes";
import { useWorkStore } from "@/store/useWorkStore";
import { AgentDot, AgentFilter, card, toggleIn } from "./ui";

const COLUMNS: Array<{ id: TaskStatus; title: string; hint: string; dot: string }> = [
  { id: "todo", title: "To Do", hint: "Belum dimulai", dot: "bg-slate-400" },
  { id: "in_progress", title: "In Progress", hint: "Sedang dikerjakan", dot: "bg-indigo-500" },
  { id: "ready", title: "Ready", hint: "Siap ditinjau / dirilis", dot: "bg-amber-500" },
  { id: "done", title: "Done", hint: "Selesai", dot: "bg-emerald-500" },
];
const ORDER = COLUMNS.map((c) => c.id);
const PRIO: Record<Priority, string> = { high: "Tinggi", medium: "Sedang", low: "Rendah" };
const PRIO_STYLE: Record<Priority, string> = {
  high: "bg-red-500/15 text-red-700 dark:text-red-300",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  low: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

function TaskCard({ t, onDragStart }: { t: Task; onDragStart: (id: string) => void }) {
  const { moveTask, removeTask } = useWorkStore();
  const i = ORDER.indexOf(t.status);
  return (
    <li draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; onDragStart(t.id); }}
      className="cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"><AgentDot id={t.agentId} /><span className="truncate">{agentMeta(t.agentId).name}</span></span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIO_STYLE[t.priority]}`}>{PRIO[t.priority]}</span>
      </div>
      {/* tombol pindah = alternatif keyboard/layar sentuh untuk drag & drop */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700">
        <div className="flex gap-1">
          <button disabled={i === 0} onClick={() => moveTask(t.id, ORDER[i - 1])} aria-label="Pindah ke kolom sebelumnya" className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700">←</button>
          <button disabled={i === ORDER.length - 1} onClick={() => moveTask(t.id, ORDER[i + 1])} aria-label="Pindah ke kolom berikutnya" className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700">→</button>
        </div>
        <button onClick={() => removeTask(t.id)} aria-label={`Hapus tugas ${t.title}`} className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-500">Hapus</button>
      </div>
    </li>
  );
}

export default function TasksView() {
  const { tasks, moveTask, addTask } = useWorkStore();
  const [agents, setAgents] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [title, setTitle] = useState("");
  const [agentId, setAgentId] = useState(AGENT_META[0].id);
  const [priority, setPriority] = useState<Priority>("medium");

  const shown = useMemo(() => tasks.filter((t) => agents.length === 0 || agents.includes(t.agentId)), [tasks, agents]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AgentFilter ids={AGENT_META.map((a) => a.id)} selected={agents} onToggle={(id) => setAgents((s) => toggleIn(s, id))} onClear={() => setAgents([])} />
        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { addTask({ title: title.trim(), agentId, priority }); setTitle(""); } }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tugas baru…" aria-label="Judul tugas baru"
            className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-800" />
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-label="Agen penanggung jawab" className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800">
            {AGENT_META.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} aria-label="Prioritas" className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800">
            {(Object.keys(PRIO) as Priority[]).map((p) => <option key={p} value={p}>{PRIO[p]}</option>)}
          </select>
          <button disabled={!title.trim()} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Tambah</button>
        </form>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = shown.filter((t) => t.status === col.id);
          return (
            <section key={col.id} aria-label={col.title}
              onDragOver={(e) => { e.preventDefault(); setOver(col.id); }} onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain") || dragId; if (id) moveTask(id, col.id); setOver(null); setDragId(null); }}
              className={`${card} flex min-h-[200px] flex-col p-3 transition ${over === col.id ? "ring-2 ring-indigo-400" : ""}`}>
              <header className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><span className={`h-2 w-2 rounded-full ${col.dot}`} />{col.title}</h2>
                  <p className="text-[11px] text-slate-500">{col.hint}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{items.length}</span>
              </header>
              <ul className="flex-1 space-y-2 overflow-y-auto">
                {items.map((t) => <TaskCard key={t.id} t={t} onDragStart={setDragId} />)}
                {items.length === 0 && <li className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-600">Tarik tugas ke sini</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
