"use client";
import { useEffect, useMemo, useRef, useState } from "react";
const SOURCES = ["app", "repliz", "ws-server"];
import type { SysLevel, SysLine } from "@/lib/workTypes";
import { useWorkStore } from "@/store/useWorkStore";
import { useMissionStore } from "@/store/useMissionStore";

const LEVELS: SysLevel[] = ["debug", "info", "warn", "error"];
const COLOR: Record<SysLevel, string> = { debug: "text-slate-500", info: "text-sky-400", warn: "text-amber-400", error: "text-red-400" };
const ts = (t: number) => new Date(t).toLocaleTimeString("id-ID", { hour12: false }) + "." + String(t % 1000).padStart(3, "0");

export default function LogsView() {
  const lines = useWorkStore((s) => s.sysLogs);
  const clear = useWorkStore((s) => s.clearSys);
  const connection = useMissionStore((s) => s.connection);
  const [levels, setLevels] = useState<SysLevel[]>(LEVELS);
  const [source, setSource] = useState("all");
  const [q, setQ] = useState("");
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState<SysLine[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  // saat dijeda, tampilan dibekukan tetapi log tetap terkumpul di belakang layar
  const togglePause = () => { if (!paused) setFrozen(useWorkStore.getState().sysLogs); setPaused(!paused); };
  const source_ = paused ? frozen : lines;
  const shown = useMemo(() => source_.filter((l) => levels.includes(l.level) && (source === "all" || l.source === source) && (q === "" || l.message.toLowerCase().includes(q.toLowerCase()))), [source_, levels, source, q]);
  const pending = paused ? lines.length - frozen.length : 0;

  useEffect(() => { const el = box.current; if (el && stick.current && !paused) el.scrollTop = el.scrollHeight; }, [shown, paused]);

  const download = () => {
    const text = shown.map((l) => `${new Date(l.time).toISOString()} ${l.level.toUpperCase().padEnd(5)} [${l.source}] ${l.message}`).join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    Object.assign(document.createElement("a"), { href: url, download: "mission-control.log" }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((l) => {
          const on = levels.includes(l);
          return <button key={l} aria-pressed={on} onClick={() => setLevels((s) => (on ? s.filter((x) => x !== l) : [...s, l]))} className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${on ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{l}</button>;
        })}
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter sumber" className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800">
          <option value="all">Semua sumber</option>
          {[...SOURCES, "agent"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari…" aria-label="Cari log" className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs dark:border-slate-600 dark:bg-slate-800" />
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-medium ${paused ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}>{paused ? `⏸ Dijeda${pending ? ` (+${pending} baru)` : ""}` : "● Real-time"}</span>
          <button onClick={togglePause} className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium dark:bg-slate-800">{paused ? "Lanjutkan" : "Jeda"}</button>
          <button onClick={download} className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium dark:bg-slate-800">Unduh</button>
          <button onClick={clear} className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium dark:bg-slate-800">Bersihkan</button>
        </div>
      </div>
      <div ref={box} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24; }}
        role="log" aria-live="off" aria-label="Terminal log sistem"
        className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-3 font-mono text-[12px] leading-5 text-slate-300 shadow-inner">
        {shown.map((l) => (
          <div key={l.id} className="whitespace-pre-wrap break-words">
            <span className="text-slate-600">{ts(l.time)}</span>{" "}
            <span className={`inline-block w-12 font-bold uppercase ${COLOR[l.level]}`}>{l.level}</span>{" "}
            <span className="text-violet-400">[{l.source}]</span> <span className={l.level === "error" ? "text-red-300" : ""}>{l.message}</span>
          </div>
        ))}
        {shown.length === 0 && <p className="text-slate-600">Menunggu log… {connection === "live" ? "(WebSocket aktif)" : "(hanya peristiwa nyata: sinkron Repliz, WebSocket, perubahan status agen)"}</p>}
        {!paused && <span className="inline-block h-3.5 w-2 translate-y-0.5 animate-pulse bg-emerald-400" />}
      </div>
    </div>
  );
}
