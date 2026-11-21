"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useMissionStore, type Tab } from "@/store/useMissionStore";
import { useWorkStore } from "@/store/useWorkStore";
import { randomSysLine } from "@/lib/mockData";
import { REPLIZ_AGENTS, deriveAgentStates } from "@/lib/replizAgents";
import TasksView from "./views/TasksView";
import CalendarView from "./views/CalendarView";
import UsageView from "./views/UsageView";
import MemoryView from "./views/MemoryView";
import FilesView from "./views/FilesView";
import LogsView from "./views/LogsView";
import SocialView from "./views/SocialView";

const TABS: ReadonlyArray<readonly [Tab, string, string]> = [
  ["office", "🏢", "Kantor"], ["tasks", "📋", "Tugas"], ["calendar", "🗓️", "Kalender"], ["usage", "📈", "Token"],
  ["memory", "🧠", "Memori"], ["files", "📁", "File"], ["social", "🌐", "Sosial"], ["logs", "🖥️", "Log"],
];
import QuickPanel from "./QuickPanel";
import Overview2D from "./Overview2D";
import type { AgentStatus } from "@/lib/types";
import { useAgentSocket } from "@/lib/useAgentSocket";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-500">Memuat kantor 3D…</div> });

export default function Dashboard() {
  const { viewMode, setViewMode, theme, setTheme, simulate, connection, focus, setFocus, selectedId, follow, setFollow, agents, select, authenticated, tab, setTab } = useMissionStore();
  const social = useWorkStore((s) => s.social);
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
      const { agents: all, setStatus, addLog } = useMissionStore.getState();
      // agen yang digerakkan data Repliz tidak disimulasikan acak
      const driven = useWorkStore.getState().social ? (REPLIZ_AGENTS as readonly string[]) : [];
      const agents = all.filter((x) => !driven.includes(x.id));
      if (agents.length === 0) return;
      const a = agents[Math.floor(Math.random() * agents.length)];
      const r = Math.random();
      const next: AgentStatus = a.status === "error" ? "working" : r < 0.12 ? "error" : a.status === "working" ? "idle" : "working";
      if (a.status === "working" && next === "working") addLog(a.id, "info", "Progres tugas diperbarui");
      setStatus(a.id, next);
    }, 6000);
    return () => clearInterval(id);
  }, [simulate, connection]);

  // Alur kerja dari Repliz: polling ringkasan tiap 60 dtk; kondisi nyata dipetakan ke status agen Scheduler & Community.
  useEffect(() => {
    const { fetchSocial } = useWorkStore.getState();
    fetchSocial();
    const id = setInterval(() => fetchSocial(), 60_000);
    const unsub = useWorkStore.subscribe((s, prev) => {
      if (!s.social || s.social === prev.social) return;
      const m = useMissionStore.getState();
      useWorkStore.getState().pushSys("info", "repliz", `sinkron: ${s.social.schedule.pending} terjadwal · ${s.social.schedule.error} gagal · ${s.social.comments.total} komentar menunggu`);
      if (m.connection === "live") return; // server WebSocket adalah sumber kebenaran status
      const derived = deriveAgentStates(s.social);
      for (const [agentId, d] of Object.entries(derived)) {
        const cur = m.agents.find((a) => a.id === agentId);
        if (!cur || (cur.status === d.status && cur.task === d.task)) continue;
        const changed = cur.status !== d.status;
        m.applyStatus(agentId, d.status, d.task);
        if (changed) m.addLog(agentId, d.status === "error" ? "error" : d.status === "idle" ? "warn" : "info", d.task);
      }
    });
    return () => { clearInterval(id); unsub(); };
  }, []);

  // Umpan log sistem: (1) cerminkan log aktivitas agen (real-time dari WebSocket bila terhubung),
  // (2) tanpa WebSocket, hasilkan baris sistem simulasi agar terminal tetap hidup.
  useEffect(() => {
    const { pushSys } = useWorkStore.getState();
    pushSys("info", "ws-server", "Mission Control dimulai");
    return useMissionStore.subscribe((s, prev) => {
      const l = s.logs[0];
      if (l && l !== prev.logs[0]) pushSys(l.level === "warn" ? "warn" : l.level, "agent", `[${l.agentId}] ${l.message}`);
      if (s.connection !== prev.connection) pushSys(s.connection === "live" ? "info" : "warn", "ws-server", `koneksi WebSocket: ${s.connection}`);
    });
  }, []);
  useEffect(() => {
    if (connection === "live") return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => { const l = randomSysLine(); useWorkStore.getState().pushSys(l.level, l.source, l.message); timer = setTimeout(tick, 1200 + Math.random() * 2300); };
    timer = setTimeout(tick, 800);
    return () => clearTimeout(timer);
  }, [connection]);

  const btn = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"}`;

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-5 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <div>
          <h1 className="text-lg font-bold tracking-tight">🛰️ AI Agent Mission Control</h1>
          <p className="text-xs text-slate-500">Kantor media sosial · {social ? "Repliz terhubung" : "Repliz belum terhubung"} · {connection === "live" ? "agen real-time (WebSocket)" : connection === "connecting" ? "menghubungkan…" : "agen simulasi"}</p>
        </div>
        <div className="flex items-center gap-3">
          {tab === "office" && <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Mode tampilan">
            <button className={btn(viewMode === "3d")} onClick={() => setViewMode("3d")}>3D View</button>
            <button className={btn(viewMode === "2d")} onClick={() => setViewMode("2d")}>2D Overview</button>
          </div>}
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
      <nav aria-label="Navigasi utama" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white/60 px-4 py-2 dark:border-slate-700 dark:bg-slate-900/60">
        {TABS.map(([k, icon, text]) => (
          <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === k ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
            <span aria-hidden>{icon}</span>{text}
          </button>
        ))}
      </nav>
      {/* Kantor 3D tetap ter-mount (disembunyikan) agar state kamera/karakter tidak hilang saat pindah tab */}
      <main className={tab === "office" ? "flex min-h-0 flex-1 flex-col lg:flex-row" : "hidden"}>
        <section className="relative min-h-[50vh] flex-1 overflow-hidden">
          <div className={viewMode === "3d" ? "h-full w-full" : "hidden"}><Scene3D active={tab === "office" && viewMode === "3d"} /></div>
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
      {tab !== "office" && (
        <main className="min-h-0 flex-1 overflow-hidden">
          {tab === "tasks" && <TasksView />}
          {tab === "calendar" && <CalendarView />}
          {tab === "usage" && <UsageView />}
          {tab === "memory" && <MemoryView />}
          {tab === "files" && <FilesView />}
          {tab === "social" && <SocialView />}
          {tab === "logs" && <LogsView />}
        </main>
      )}
    </div>
  );
}
