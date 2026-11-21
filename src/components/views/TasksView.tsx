"use client";
import { useMemo, useState } from "react";
import { AGENT_META, agentMeta } from "@/lib/agentsMeta";
import type { Priority, Task, TaskStatus } from "@/lib/workTypes";
import { useWorkStore } from "@/store/useWorkStore";
import { AgentDot, AgentFilter, card, plat, toggleIn } from "./ui";
import type { SocialSummary } from "@/lib/repliz";

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

/** Alur kerja dari Repliz -> kartu Kanban (baca-saja). Pemetaan kolom:
 *  To Do = perlu tindakan (posting gagal -> Scheduler, komentar menunggu -> Community)
 *  In Progress = sedang dipublikasikan · Ready = antrean tayang berikutnya · Done = tayang 24 jam terakhir */
function replizCards(s: SocialSummary): Task[] {
  const hh = (iso: string) => new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const mk = (id: string, agentId: string, status: TaskStatus, priority: Priority, title: string, note?: string): Task => ({ id: `rz-${id}`, agentId, status, priority, title, note, createdAt: 0, source: "repliz" });
  return [
    ...s.failed.slice(0, 5).map((f) => mk(`f${f.id}`, "scheduler", "todo", "high", `Jadwalkan ulang: ${f.title || "(tanpa judul)"}`, `${plat(f.platform).icon} ${f.account} · gagal ${hh(f.scheduleAt)}${f.errorMessage ? ` · ${f.errorMessage}` : ""}`)),
    ...s.comments.items.slice(0, 5).map((c) => mk(`c${c.id}`, "community", "todo", "medium", `Balas komentar: “${c.text || "…"}”`, `${plat(c.platform).icon} ${c.account} · ${c.contentTitle}`)),
    ...(s.schedule.process > 0 ? [mk("proc", "scheduler", "in_progress", "high", `Memublikasikan ${s.schedule.process} posting`)] : []),
    ...s.upcoming.slice(0, 5).map((u) => mk(`u${u.id}`, "scheduler", "ready", "low", u.title || "(tanpa judul)", `${plat(u.platform).icon} ${u.account} · tayang ${hh(u.scheduleAt)}`)),
    ...s.recentDone.map((d) => mk(`d${d.id}`, "scheduler", "done", "low", `Tayang: ${d.title || "(tanpa judul)"}`, `${plat(d.platform).icon} ${d.account} · ${hh(d.scheduleAt)}`)),
  ];
}

function TaskCard({ t, onDragStart }: { t: Task; onDragStart: (id: string) => void }) {
  const { moveTask, removeTask } = useWorkStore();
  const i = ORDER.indexOf(t.status);
  const fromRepliz = t.source === "repliz";
  return (
    <li draggable={!fromRepliz} onDragStart={(e) => { if (fromRepliz) return; e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; onDragStart(t.id); }}
      className={`rounded-xl border p-3 shadow-sm ${fromRepliz ? "border-indigo-200 bg-indigo-50/60 dark:border-indigo-500/30 dark:bg-indigo-500/10" : "cursor-grab border-slate-200 bg-white active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800"}`}>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t.title}</p>
      {t.note && <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">{t.note}</p>}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"><AgentDot id={t.agentId} /><span className="truncate">{agentMeta(t.agentId).name}</span></span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIO_STYLE[t.priority]}`}>{PRIO[t.priority]}</span>
      </div>
      {/* tombol pindah = alternatif keyboard/layar sentuh untuk drag & drop */}
      {fromRepliz ? (
        <p className="mt-2 border-t border-indigo-200/60 pt-2 text-[10px] font-medium text-indigo-600 dark:border-indigo-500/20 dark:text-indigo-300">🔒 Dari Repliz · baca-saja</p>
      ) : (
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700">
        <div className="flex gap-1">
          <button disabled={i === 0} onClick={() => moveTask(t.id, ORDER[i - 1])} aria-label="Pindah ke kolom sebelumnya" className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700">←</button>
          <button disabled={i === ORDER.length - 1} onClick={() => moveTask(t.id, ORDER[i + 1])} aria-label="Pindah ke kolom berikutnya" className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700">→</button>
        </div>
        <button onClick={() => removeTask(t.id)} aria-label={`Hapus tugas ${t.title}`} className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-500">Hapus</button>
      </div>
      )}
    </li>
  );
}

export default function TasksView() {
  const { tasks, moveTask, addTask, social } = useWorkStore();
  const [showRepliz, setShowRepliz] = useState(true);
  const [agents, setAgents] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [title, setTitle] = useState("");
  const [agentId, setAgentId] = useState(AGENT_META[0].id);
  const [priority, setPriority] = useState<Priority>("medium");

  const rz = useMemo(() => (social && showRepliz ? replizCards(social) : []), [social, showRepliz]);
  const shown = useMemo(() => [...rz, ...tasks].filter((t) => agents.length === 0 || agents.includes(t.agentId)), [tasks, rz, agents]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <AgentFilter ids={AGENT_META.map((a) => a.id)} selected={agents} onToggle={(id) => setAgents((s) => toggleIn(s, id))} onClear={() => setAgents([])} />
          <button onClick={() => setShowRepliz((v) => !v)} aria-pressed={showRepliz} disabled={!social} title={social ? "" : "Repliz belum terhubung"}
            className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-40 ${showRepliz && social ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>🌐 Alur Repliz{social ? ` (${rz.length})` : ""}</button>
        </div>
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
