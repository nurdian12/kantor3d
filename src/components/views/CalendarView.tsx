"use client";
import { useEffect, useMemo, useState } from "react";
import type { SchedulePost } from "@/lib/repliz";
import { card, plat } from "./ui";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

type PostStatus = "pending" | "process" | "success" | "error";
const STATUS: Record<PostStatus, { label: string; pill: string; sym: string }> = {
  pending: { label: "Terjadwal", pill: "bg-sky-500/15 text-sky-700 dark:text-sky-300", sym: "⏳" },
  process: { label: "Diproses", pill: "bg-amber-500/15 text-amber-700 dark:text-amber-300", sym: "⚙" },
  success: { label: "Tayang", pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", sym: "✓" },
  error: { label: "Gagal", pill: "bg-red-500/15 text-red-700 dark:text-red-300", sym: "✗" },
};
const stOf = (s: string) => STATUS[(s as PostStatus) in STATUS ? (s as PostStatus) : "pending"];

export default function CalendarView() {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [posts, setPosts] = useState<SchedulePost[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<PostStatus[]>([]);

  // grid 6 minggu mulai Minggu
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  const gridStartMs = gridStart.getTime();

  useEffect(() => {
    let stale = false;
    setLoading(true);
    const from = new Date(gridStartMs), to = new Date(gridStartMs + 42 * 86_400_000);
    fetch(`/api/repliz/schedule?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, j: await r.json() }))
      .then(({ ok, j }) => {
        if (stale) return;
        if (ok) { setPosts(j.posts); setNote(j.truncated ? `Menampilkan ${j.posts.length} dari ${j.total} posting (dibatasi).` : null); }
        else { setPosts([]); setNote(j.message ?? "Gagal memuat jadwal Repliz."); }
      })
      .catch(() => { if (!stale) { setPosts([]); setNote("Tidak dapat menghubungi server."); } })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [gridStartMs]);

  const platformList = useMemo(() => [...new Set(posts.map((p) => p.platform))].sort(), [posts]);
  const filtered = useMemo(() => posts.filter((p) => (platforms.length === 0 || platforms.includes(p.platform)) && (statuses.length === 0 || statuses.includes(p.status as PostStatus))), [posts, platforms, statuses]);
  const byDay = useMemo(() => {
    const m = new Map<string, SchedulePost[]>();
    for (const p of filtered) { const k = dayKey(new Date(p.scheduleAt)); (m.get(k) ?? m.set(k, []).get(k)!).push(p); }
    for (const l of m.values()) l.sort((a, b) => +new Date(a.scheduleAt) - +new Date(b.scheduleAt));
    return m;
  }, [filtered]);

  const dayPosts = byDay.get(dayKey(selected)) ?? [];
  const month = useMemo(() => {
    const c = { pending: 0, process: 0, success: 0, error: 0 } as Record<PostStatus, number>;
    for (const p of filtered) { const d = new Date(p.scheduleAt); if (d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear() && p.status in c) c[p.status as PostStatus]++; }
    return c;
  }, [filtered, cursor]);
  const nav = (delta: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const toggle = <T extends string>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-auto p-4 xl:grid-cols-[1fr_400px]">
      <section className={`${card} flex min-h-0 flex-col p-4`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => nav(-1)} aria-label="Bulan sebelumnya" className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">←</button>
            <h2 className="min-w-[10rem] text-center text-base font-semibold">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h2>
            <button onClick={() => nav(1)} aria-label="Bulan berikutnya" className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">→</button>
            <button onClick={() => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(new Date(today.getFullYear(), today.getMonth(), today.getDate())); }} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">Hari ini</button>
          </div>
          <p className="text-xs text-slate-500">Sumber: Repliz (baca-saja){loading ? " · memuat…" : ` · ${filtered.length} posting`}</p>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter kalender">
          {(Object.keys(STATUS) as PostStatus[]).map((k) => (
            <button key={k} onClick={() => setStatuses((s) => toggle(s, k))} aria-pressed={statuses.includes(k)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${statuses.includes(k) ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900" : STATUS[k].pill}`}>{STATUS[k].sym} {STATUS[k].label} ({month[k]})</button>
          ))}
          <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
          {platformList.map((p) => (
            <button key={p} onClick={() => setPlatforms((s) => toggle(s, p))} aria-pressed={platforms.includes(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${platforms.includes(p) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{plat(p).icon} {plat(p).name}</button>
          ))}
        </div>
        {note && <p className="mb-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">Repliz: {note}</p>}

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-xs dark:border-slate-700 dark:bg-slate-700" role="grid" aria-label="Kalender jadwal posting">
          {DAYS.map((d) => <div key={d} className="bg-slate-50 py-1.5 text-center font-semibold text-slate-500 dark:bg-slate-800">{d}</div>)}
          {cells.map((d) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const sel = sameDay(d, selected);
            const list = byDay.get(dayKey(d)) ?? [];
            const c = { pending: 0, process: 0, success: 0, error: 0 } as Record<PostStatus, number>;
            for (const p of list) if (p.status in c) c[p.status as PostStatus]++;
            const pf = [...new Set(list.map((p) => p.platform))];
            return (
              <button key={d.toISOString()} onClick={() => setSelected(d)} aria-label={`${d.getDate()} ${MONTHS[d.getMonth()]}, ${list.length} posting`} aria-pressed={sel}
                className={`flex min-h-[88px] flex-col items-stretch gap-1 p-1.5 text-left transition ${inMonth ? "bg-white dark:bg-slate-900" : "bg-slate-50 text-slate-400 dark:bg-slate-900/60"} ${sel ? "outline outline-2 -outline-offset-2 outline-indigo-500" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                <span className={`inline-flex h-5 w-5 items-center justify-center self-start rounded-full text-[11px] font-semibold ${sameDay(d, today) ? "bg-indigo-600 text-white" : ""}`}>{d.getDate()}</span>
                {list.length > 0 && (
                  <>
                    <span className="flex flex-wrap gap-0.5 text-[11px]" aria-hidden>{pf.slice(0, 5).map((p) => <span key={p} title={plat(p).name}>{plat(p).icon}</span>)}</span>
                    <span className="mt-auto flex flex-wrap gap-0.5">
                      {(Object.keys(c) as PostStatus[]).filter((k) => c[k] > 0).map((k) => (
                        <span key={k} className={`rounded px-1 text-[10px] font-semibold tabular-nums ${STATUS[k].pill}`} title={`${STATUS[k].label}: ${c[k]}`}>{STATUS[k].sym}{c[k]}</span>
                      ))}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className={`${card} flex min-h-0 flex-col p-4`}>
        <h2 className="text-sm font-semibold">{selected.getDate()} {MONTHS[selected.getMonth()]} {selected.getFullYear()}</h2>
        <p className="mb-3 text-xs text-slate-500">{dayPosts.length} posting</p>
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1" aria-label="Posting pada hari terpilih">
          {dayPosts.slice(0, 150).map((p) => {
            const st = stOf(p.status);
            return (
              <li key={p.id} className="rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800/70">
                <p className="flex items-center gap-2">
                  <span className="w-11 shrink-0 font-mono text-slate-500">{hhmm(p.scheduleAt)}</span>
                  <span title={plat(p.platform).name}>{plat(p.platform).icon}</span>
                  <span className="min-w-0 flex-1 truncate">{p.title || "(tanpa judul)"}<span className="text-slate-500"> · {p.account}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.pill}`}>{st.label}</span>
                </p>
                {p.errorMessage && <p className="mt-1 text-red-700 dark:text-red-300">⚠ {p.errorMessage}</p>}
              </li>
            );
          })}
          {dayPosts.length > 150 && <li className="text-center text-[11px] text-slate-500">…dan {dayPosts.length - 150} posting lainnya</li>}
          {dayPosts.length === 0 && <li className="text-xs text-slate-500">{loading ? "Memuat…" : "Tidak ada posting pada hari ini."}</li>}
        </ul>
      </section>
    </div>
  );
}
