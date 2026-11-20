"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useMissionStore } from "@/store/useMissionStore";
import QuickPanel from "./QuickPanel";
import Overview2D from "./Overview2D";
import type { AgentStatus } from "@/lib/types";
import { useAgentSocket } from "@/lib/useAgentSocket";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-500">Memuat kantor 3D…</div> });

export default function Dashboard() {
  const { viewMode, setViewMode, theme, setTheme, simulate, connection, focus, setFocus, selectedId, follow, setFollow, agents, select, authenticated } = useMissionStore();
  const selected = agents.find((a) => a.id === selectedId);
  useAgentSocket();

  // Tema: baca preferensi tersimpan, sinkronkan ke <html class="dark">
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme") as "light" | "dark" | null;
      if (saved) setTheme(saved);
      else if (!window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("light");
    } catch {}
  }, [setTheme]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  // Simulasi real-time (mock): status agen berubah acak tiap beberapa detik
  useEffect(() => {
    if (!simulate || connection !== "offline") return;
    const id = setInterval(() => {
      const { agents, setStatus, addLog } = useMissionStore.getState();
      const a = agents[Math.floor(Math.random() * agents.length)];
      const r = Math.random();
      const next: AgentStatus = a.status === "error" ? "working" : r < 0.12 ? "error" : a.status === "working" ? "idle" : "working";
      if (a.status === "working" && next === "working") addLog(a.id, "info", "Progres tugas diperbarui");
      setStatus(a.id, next);
    }, 6000);
    return () => clearInterval(id);
  }, [simulate, connection]);

  const btn = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"}`;

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-5 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <div>
          <h1 className="text-lg font-bold tracking-tight">🛰️ AI Agent Mission Control</h1>
          <p className="text-xs text-slate-500">Kantor virtual 2 lantai · {connection === "live" ? "data real-time (WebSocket)" : connection === "connecting" ? "menghubungkan…" : "data mock"}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Mode tampilan">
            <button className={btn(viewMode === "3d")} onClick={() => setViewMode("3d")}>3D View</button>
            <button className={btn(viewMode === "2d")} onClick={() => setViewMode("2d")}>2D Overview</button>
          </div>
          {authenticated && (
            <button onClick={async () => { await fetch("/api/logout", { method: "POST" }); window.location.href = "/login"; }}
              className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">Keluar</button>
          )}
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Ganti tema"
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative min-h-[50vh] flex-1 overflow-hidden">
          <div className={viewMode === "3d" ? "h-full w-full" : "hidden"}><Scene3D active={viewMode === "3d"} /></div>
          {viewMode === "2d" && <Overview2D />}
          {viewMode === "3d" && (
            <div className="absolute left-4 top-4 flex rounded-xl bg-white/80 p-1 shadow backdrop-blur dark:bg-slate-900/80" role="group" aria-label="Fokus lantai">
              {([["all", "Semua"], ["1", "Lantai 1"], ["2", "Lantai 2"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setFocus(k)} className={btn(focus === k)}>{label}</button>
              ))}
            </div>
          )}
          {viewMode === "3d" && selected && (
            <div className="absolute left-4 top-[68px] flex items-center gap-2 rounded-xl bg-white/80 px-3 py-1.5 text-xs shadow backdrop-blur dark:bg-slate-900/80">
              <span className="h-2 w-2 rounded-full" style={{ background: selected.color }} />
              <span className="font-medium">{selected.name}</span>
              <button onClick={() => setFollow(!follow)} className={`rounded-md px-2 py-0.5 font-medium ${follow ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"}`}>
                {follow ? "Mengikuti" : "Ikuti"}
              </button>
              <button onClick={() => select(null)} aria-label="Batal pilih" className="text-slate-500 hover:text-slate-800 dark:hover:text-white">✕</button>
            </div>
          )}
          {viewMode === "3d" && <p className="pointer-events-none absolute bottom-3 left-4 rounded-md bg-slate-900/60 px-2 py-1 text-[11px] text-white">Drag: putar · Scroll: zoom · Klik karakter: kamera mengikuti & filter log</p>}
        </section>
        <div className="max-h-[50vh] lg:max-h-none"><QuickPanel /></div>
      </main>
    </div>
  );
}
