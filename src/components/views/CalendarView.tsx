"use client";
import { useEffect, useMemo, useState } from "react";
import { AGENT_META, agentMeta } from "@/lib/agentsMeta";
import { nextRun, parseCron, timesOnDay, type CronSpec } from "@/lib/cron";
import { SCHEDULES } from "@/lib/mockData";
import type { SchedulePost } from "@/lib/repliz";
import { AgentDot, AgentFilter, card, plat, toggleIn } from "./ui";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
type PostStatus = "pending" | "process" | "success" | "error";
const POST_STYLE: Record<PostStatus, { label: string; pill: string; sym: string }> = {
  pending: { label: "Terjadwal", pill: "bg-sky-500/15 text-sky-700 dark:text-sky-300", sym: "⏳" },
  process: { label: "Diproses", pill: "bg-amber-500/15 text-amber-700 dark:text-amber-300", sym: "⚙" },
  success: { label: "Tayang", pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", sym: "✓" },
  error: { label: "Gagal", pill: "bg-red-500/15 text-red-700 dark:text-red-300", sym: "✗" },
};
const hhmmDate = (iso: string) => { const d = new Date(iso); return hhmm(d.getHours() * 60 + d.getMinutes()); };

interface Run { jobId: string; agentId: string; name: string; minute: number }

export default function CalendarView() {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [agents, setAgents] = useState<string[]>([]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(SCHEDULES.map((j) => [j.id, j.enabled])));

  // Lapisan posting Repliz (baca-saja)
  const [showCron, setShowCron] = useState(true);
  const [showPosts, setShowPosts] = useState(true);
  const [posts, setPosts] = useState<SchedulePost[]>([]);
  const [postsNote, setPostsNote] = useState<string | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);

  const specs = useMemo(() => {
    const m = new Map<string, CronSpec>();
    for (const j of SCHEDULES) { try { m.set(j.id, parseCron(j.cron)); } catch { /* cron tidak valid: dilewati */ } }
    return m;
  }, []);
  const jobs = SCHEDULES.filter((j) => (agents.length === 0 || agents.includes(j.agentId)) && specs.has(j.id));

  const runsOn = (d: Date): Run[] =>
    (showCron ? jobs : []).filter((j) => enabled[j.id]).flatMap((j) => timesOnDay(specs.get(j.id)!, d).map((minute) => ({ jobId: j.id, agentId: j.agentId, name: j.name, minute })));

  // grid 6 minggu mulai Minggu
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  const gridStartMs = gridStart.getTime();
  useEffect(() => {
    let stale = false;
    setPostsLoading(true);
    const from = new Date(gridStartMs), to = new Date(gridStartMs + 42 * 86_400_000);
    fetch(`/api/repliz/schedule?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, j: await r.json() }))
      .then(({ ok, j }) => {
        if (stale) return;
        if (ok) { setPosts(j.posts); setPostsNote(j.truncated ? `Menampilkan ${j.posts.length} dari ${j.total} posting (dibatasi).` : null); }
        else { setPosts([]); setPostsNote(j.message ?? "Gagal memuat jadwal Repliz."); }
      })
      .catch(() => { if (!stale) { setPosts([]); setPostsNote("Tidak dapat menghubungi server."); } })
      .finally(() => { if (!stale) setPostsLoading(false); });
    return () => { stale = true; };
  }, [gridStartMs]);

  const postsByDay = useMemo(() => {
    const m = new Map<string, SchedulePost[]>();
    for (const p of posts) { const k = dayKey(new Date(p.scheduleAt)); (m.get(k) ?? m.set(k, []).get(k)!).push(p); }
    for (const l of m.values()) l.sort((a, b) => +new Date(a.scheduleAt) - +new Date(b.scheduleAt));
    return m;
  }, [posts]);

  const cellInfo = useMemo(() => cells.map((d) => {
    const runs = runsOn(d);
    const byJob = new Map<string, { agentId: string; name: string; n: number; first: number }>();
    for (const r of runs) { const e = byJob.get(r.jobId); if (e) e.n++; else byJob.set(r.jobId, { agentId: r.agentId, name: r.name, n: 1, first: r.minute }); }
    return { d, total: runs.length, jobs: [...byJob.values()] };
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [cursor, agents, enabled, showCron]);

  const dayRuns = runsOn(selected).sort((a, b) => a.minute - b.minute);
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const isToday = sameDay(selected, today);
  const isPast = selected < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const status = (r: Run) => {
    if (!(isPast || (isToday && r.minute <= nowMin))) return "scheduled";
    return hash(r.jobId + selected.toDateString() + r.minute) % 25 === 0 ? "failed" : "success";
  };
  const badge = { scheduled: "bg-sky-500/15 text-sky-700 dark:text-sky-300", success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", failed: "bg-red-500/15 text-red-700 dark:text-red-300" };
  const badgeText = { scheduled: "Terjadwal", success: "Berhasil", failed: "Gagal" };
  const nav = (delta: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-auto p-4 xl:grid-cols-[1fr_380px]">
      <section className={`${card} flex min-h-0 flex-col p-4`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => nav(-1)} aria-label="Bulan sebelumnya" className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">←</button>
            <h2 className="min-w-[10rem] text-center text-base font-semibold">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h2>
            <button onClick={() => nav(1)} aria-label="Bulan berikutnya" className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">→</button>
            <button onClick={() => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(new Date(today.getFullYear(), today.getMonth(), today.getDate())); }} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">Hari ini</button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sumber data kalender">
            <button onClick={() => setShowCron((v) => !v)} aria-pressed={showCron} className={`rounded-full px-3 py-1 text-xs font-medium ${showCron ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>⚙ Cron agen</button>
            <button onClick={() => setShowPosts((v) => !v)} aria-pressed={showPosts} className={`rounded-full px-3 py-1 text-xs font-medium ${showPosts ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>📣 Posting Repliz{postsLoading ? " …" : ` (${posts.length})`}</button>
          </div>
        </div>
        <div className="mb-3"><AgentFilter ids={AGENT_META.map((a) => a.id)} selected={agents} onToggle={(id) => setAgents((s) => toggleIn(s, id))} onClear={() => setAgents([])} /></div>
        {postsNote && showPosts && <p className="mb-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">Repliz: {postsNote}</p>}
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-xs dark:border-slate-700 dark:bg-slate-700" role="grid" aria-label="Kalender jadwal">
          {DAYS.map((d) => <div key={d} className="bg-slate-50 py-1.5 text-center font-semibold text-slate-500 dark:bg-slate-800">{d}</div>)}
          {cellInfo.map(({ d, total, jobs: js }) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const sel = sameDay(d, selected);
            return (
              <button key={d.toISOString()} onClick={() => setSelected(d)} aria-label={`${d.getDate()} ${MONTHS[d.getMonth()]}, ${total} eksekusi`} aria-pressed={sel}
                className={`flex min-h-[100px] flex-col items-stretch gap-0.5 p-1.5 text-left transition ${inMonth ? "bg-white dark:bg-slate-900" : "bg-slate-50 text-slate-400 dark:bg-slate-900/60"} ${sel ? "outline outline-2 -outline-offset-2 outline-indigo-500" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                <span className={`mb-0.5 inline-flex h-5 w-5 items-center justify-center self-start rounded-full text-[11px] font-semibold ${sameDay(d, today) ? "bg-indigo-600 text-white" : ""}`}>{d.getDate()}</span>
                {js.slice(0, showPosts && postsByDay.has(dayKey(d)) ? 2 : 3).map((j) => (
                  <span key={j.name} className="flex items-center gap-1 truncate text-[10px] text-slate-700 dark:text-slate-300">
                    <AgentDot id={j.agentId} size={6} /><span className="truncate">{j.n > 1 ? `${j.n}× ` : `${hhmm(j.first)} `}{j.name}</span>
                  </span>
                ))}
                {js.length > (showPosts && postsByDay.has(dayKey(d)) ? 2 : 3) && <span className="text-[10px] font-medium text-slate-500">+{js.length - (showPosts && postsByDay.has(dayKey(d)) ? 2 : 3)} lagi</span>}
                {showPosts && (() => {
                  const list = postsByDay.get(dayKey(d));
                  if (!list) return null;
                  const c = { pending: 0, process: 0, success: 0, error: 0 } as Record<PostStatus, number>;
                  for (const p of list) if (p.status in c) c[p.status as PostStatus]++;
                  return (
                    <span className="mt-auto flex flex-wrap gap-0.5" aria-label={`${list.length} posting Repliz`}>
                      {(Object.keys(c) as PostStatus[]).filter((k) => c[k] > 0).map((k) => (
                        <span key={k} className={`rounded px-1 text-[10px] font-semibold tabular-nums ${POST_STYLE[k].pill}`} title={`${POST_STYLE[k].label}: ${c[k]}`}>{POST_STYLE[k].sym}{c[k]}</span>
                      ))}
                    </span>
                  );
                })()}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex min-h-0 flex-col gap-4">
        <section className={`${card} p-4`}>
          <h2 className="mb-1 text-sm font-semibold">{selected.getDate()} {MONTHS[selected.getMonth()]} {selected.getFullYear()}</h2>
          <p className="mb-3 text-xs text-slate-500">{dayRuns.length} eksekusi cron{showPosts ? ` · ${(postsByDay.get(dayKey(selected)) ?? []).length} posting Repliz` : ""}</p>
          {showPosts && (postsByDay.get(dayKey(selected)) ?? []).length > 0 && (
            <ul className="mb-3 max-h-72 space-y-1.5 overflow-y-auto pr-1" aria-label="Posting Repliz hari ini">
              {(postsByDay.get(dayKey(selected)) ?? []).slice(0, 100).map((p) => {
                const st = POST_STYLE[(p.status as PostStatus) in POST_STYLE ? (p.status as PostStatus) : "pending"];
                return (
                  <li key={p.id} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs dark:bg-slate-800/70">
                    <p className="flex items-center gap-2">
                      <span className="w-11 shrink-0 font-mono text-slate-500">{hhmmDate(p.scheduleAt)}</span>
                      <span title={plat(p.platform).name}>{plat(p.platform).icon}</span>
                      <span className="min-w-0 flex-1 truncate">{p.title || "(tanpa judul)"}<span className="text-slate-500"> · {p.account}</span></span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.pill}`}>{st.label}</span>
                    </p>
                    {p.errorMessage && <p className="mt-1 text-red-700 dark:text-red-300">⚠ {p.errorMessage}</p>}
                  </li>
                );
              })}
            </ul>
          )}
          <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {dayRuns.slice(0, 80).map((r, i) => {
              const s = status(r);
              return (
                <li key={r.jobId + r.minute + i} className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs dark:bg-slate-800/70">
                  <span className="w-11 shrink-0 font-mono text-slate-500">{hhmm(r.minute)}</span>
                  <AgentDot id={r.agentId} />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge[s]}`}>{badgeText[s]}</span>
                </li>
              );
            })}
            {dayRuns.length > 80 && <li className="text-center text-[11px] text-slate-500">…dan {dayRuns.length - 80} eksekusi lainnya</li>}
            {dayRuns.length === 0 && <li className="text-xs text-slate-500">Tidak ada eksekusi cron pada hari ini.</li>}
          </ul>
        </section>

        <section className={`${card} min-h-0 flex-1 overflow-y-auto p-4`}>
          <h2 className="mb-3 text-sm font-semibold">Job terjadwal ({jobs.length})</h2>
          <ul className="space-y-2">
            {jobs.map((j) => {
              const nx = nextRun(specs.get(j.id)!, new Date());
              return (
                <li key={j.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-medium"><AgentDot id={j.agentId} /><span className="truncate">{j.name}</span></p>
                      <p className="text-[11px] text-slate-500">{agentMeta(j.agentId).name} · <code className="font-mono">{j.cron}</code></p>
                    </div>
                    <button role="switch" aria-checked={enabled[j.id]} aria-label={`Aktifkan ${j.name}`} onClick={() => setEnabled((e) => ({ ...e, [j.id]: !e[j.id] }))}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition ${enabled[j.id] ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${enabled[j.id] ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{j.description}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{enabled[j.id] && nx ? `Berikutnya: ${nx.getDate()} ${MONTHS[nx.getMonth()].slice(0, 3)} ${hhmm(nx.getHours() * 60 + nx.getMinutes())}` : "Dinonaktifkan"}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
