"use client";
import { useMemo, useState } from "react";
import { AGENT_META, agentMeta } from "@/lib/agentsMeta";
import type { MemoryKind } from "@/lib/workTypes";
import { useWorkStore } from "@/store/useWorkStore";
import { AgentDot, card, fmtTokens, relTime } from "./ui";

const KINDS: MemoryKind[] = ["fakta", "preferensi", "konteks", "pembelajaran"];
const KIND_STYLE: Record<MemoryKind, string> = {
  fakta: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  preferensi: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  konteks: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  pembelajaran: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};
const BUDGET = 2000; // token memori per agen (mock)

export default function MemoryView() {
  const { memories, addMemory, removeMemory } = useWorkStore();
  const [agent, setAgent] = useState<string>("all");
  const [kind, setKind] = useState<MemoryKind | "all">("all");
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ title: "", content: "", kind: "fakta" as MemoryKind });

  const perAgent = useMemo(() => Object.fromEntries(AGENT_META.map((a) => {
    const items = memories.filter((m) => m.agentId === a.id);
    return [a.id, { count: items.length, tokens: items.reduce((s, m) => s + m.tokens, 0) }];
  })), [memories]);

  const shown = memories
    .filter((m) => (agent === "all" || m.agentId === agent) && (kind === "all" || m.kind === kind) && (q === "" || (m.title + " " + m.content).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-auto p-4 lg:grid-cols-[260px_1fr]">
      <aside className={`${card} h-fit p-3`}>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Agen</h2>
        <ul className="space-y-1">
          <li><button onClick={() => setAgent("all")} aria-pressed={agent === "all"} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${agent === "all" ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}><span>Semua agen</span><span className="text-xs opacity-80">{memories.length}</span></button></li>
          {AGENT_META.map((a) => {
            const p = perAgent[a.id], pct = Math.min(100, (p.tokens / BUDGET) * 100);
            return (
              <li key={a.id}>
                <button onClick={() => setAgent(a.id)} aria-pressed={agent === a.id} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${agent === a.id ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                  <span className="flex items-center justify-between"><span className="flex items-center gap-2"><AgentDot id={a.id} />{a.name}</span><span className="text-xs opacity-80">{p.count}</span></span>
                  <span className="mt-1.5 block h-1 rounded-full bg-black/10 dark:bg-white/10"><span className="block h-full rounded-full bg-current opacity-60" style={{ width: `${pct}%` }} /></span>
                  <span className="mt-0.5 block text-[10px] opacity-70">{fmtTokens(p.tokens)} / {fmtTokens(BUDGET)} token</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari memori…" aria-label="Cari memori" className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-800" />
          {(["all", ...KINDS] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${kind === k ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{k === "all" ? "Semua jenis" : k}</button>
          ))}
        </div>

        <form className={`${card} grid gap-2 p-3 sm:grid-cols-[1fr_9rem_auto]`} onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim() || !form.content.trim() || agent === "all") return;
          addMemory({ agentId: agent, kind: form.kind, title: form.title.trim(), content: form.content.trim() });
          setForm({ ...form, title: "", content: "" });
        }}>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul memori" aria-label="Judul memori" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800" />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as MemoryKind })} aria-label="Jenis memori" className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800">{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
          <button disabled={agent === "all" || !form.title.trim() || !form.content.trim()} title={agent === "all" ? "Pilih satu agen di kiri untuk menambah memori" : ""} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Tambah</button>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder={agent === "all" ? "Pilih satu agen di kiri untuk menambah memori…" : `Isi memori untuk ${agentMeta(agent).name}…`} aria-label="Isi memori" rows={2} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm sm:col-span-3 dark:border-slate-600 dark:bg-slate-800" />
        </form>

        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((m) => (
            <li key={m.id} className={`${card} p-4`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{m.title}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND_STYLE[m.kind]}`}>{m.kind}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{m.content}</p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><AgentDot id={m.agentId} />{agentMeta(m.agentId).name} · {m.tokens} token · {relTime(m.updatedAt)}</span>
                <button onClick={() => removeMemory(m.id)} aria-label={`Hapus memori ${m.title}`} className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-red-500/10 hover:text-red-500">Hapus</button>
              </div>
            </li>
          ))}
          {shown.length === 0 && <li className="text-sm text-slate-500">Tidak ada memori yang cocok.</li>}
        </ul>
      </div>
    </div>
  );
}
