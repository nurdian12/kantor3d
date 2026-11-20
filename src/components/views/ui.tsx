"use client";
import { agentMeta } from "@/lib/agentsMeta";

export const card = "rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-slate-700 dark:bg-slate-900/70";

export function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: ReadonlyArray<readonly [T, string]>; label: string }) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label={label}>
      {options.map(([k, text]) => (
        <button key={k} onClick={() => onChange(k)} aria-pressed={value === k}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${value === k ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"}`}>{text}</button>
      ))}
    </div>
  );
}

export function AgentDot({ id, size = 8 }: { id: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: agentMeta(id).color }} />;
}

/** Filter agen: banyak-pilih; kosong = semua */
export function AgentFilter({ ids, selected, onToggle, onClear }: { ids: string[]; selected: string[]; onToggle: (id: string) => void; onClear: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter agen">
      <button onClick={onClear} className={`rounded-full px-3 py-1 text-xs font-medium ${selected.length === 0 ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>Semua</button>
      {ids.map((id) => {
        const on = selected.includes(id);
        return (
          <button key={id} onClick={() => onToggle(id)} aria-pressed={on}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${on ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}>
            <AgentDot id={id} />{agentMeta(id).name}
          </button>
        );
      })}
    </div>
  );
}

export const toggleIn = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

export const fmtTokens = (n: number) => (n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + "K" : String(Math.round(n)));
export const relTime = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? "baru saja" : m < 60 ? `${m} mnt lalu` : m < 1440 ? `${Math.round(m / 60)} jam lalu` : `${Math.round(m / 1440)} hari lalu`;
};
