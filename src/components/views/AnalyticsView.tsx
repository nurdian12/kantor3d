"use client";
import { useMemo } from "react";
import type { AccountStat } from "@/lib/repliz";
import { useMissionStore } from "@/store/useMissionStore";
import { useWorkStore } from "@/store/useWorkStore";
import StackedBars, { type Bucket } from "./StackedBars";
import { card, fmtTokens, plat } from "./ui";

// Slot kategorikal tetap per platform (urutan = urutan slot palet yang sudah divalidasi, tidak dirotasi)
const PLATFORM_ORDER = ["instagram", "tiktok", "youtube", "facebook", "threads"];
const COLORS = { light: ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"], dark: ["#6366f1", "#059669", "#d97706", "#ec4899", "#0891b2"] };
const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const dLabel = (ms: number) => { const d = new Date(ms); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };

function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <span className="text-[10px] text-slate-400">—</span>;
  const max = Math.max(...data, 1), w = 84, h = 22;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`).join(" ");
  return <svg width={w} height={h} aria-hidden><polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Stat({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

export default function AnalyticsView() {
  const stats = useWorkStore((s) => s.stats);
  const err = useWorkStore((s) => s.statsError);
  const loading = useWorkStore((s) => s.statsLoading);
  const fetchStats = useWorkStore((s) => s.fetchStats);
  const theme = useMissionStore((s) => s.theme);
  const colors = COLORS[theme];

  const view = useMemo(() => {
    if (!stats) return null;
    const platforms = PLATFORM_ORDER.filter((p) => stats.accounts.some((a) => a.type === p));
    const dates = [...new Set(stats.accounts.flatMap((a) => a.series.map((x) => x.date)))].sort().slice(-30);
    const buckets: Bucket[] = dates.map((d) => {
      const vals = platforms.map((p) => stats.accounts.filter((a) => a.type === p).reduce((s, a) => s + (a.series.find((x) => x.date === d)?.value ?? 0), 0));
      return { start: Date.parse(d + "T00:00:00Z"), vals, total: vals.reduce((a, b) => a + b, 0) };
    });
    const byPlatform = platforms.map((p) => {
      const list = stats.accounts.filter((a) => a.type === p);
      return { p, accounts: list.length, followers: list.reduce((s, a) => s + (a.followers ?? 0), 0), metricLabel: list[0]?.metricLabel ?? "", metric: list.reduce((s, a) => s + (a.metricTotal ?? 0), 0) };
    });
    return { platforms, buckets, byPlatform, followers: byPlatform.reduce((s, x) => s + x.followers, 0), metric: byPlatform.reduce((s, x) => s + x.metric, 0) };
  }, [stats]);

  if (err && !stats) return (
    <div className="p-4"><div className={`${card} max-w-xl space-y-2 p-5`}>
      <h2 className="text-sm font-semibold">Statistik belum tersedia</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">{err}</p>
      <button onClick={() => fetchStats(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Coba lagi</button>
    </div></div>
  );
  if (!stats || !view) return <p className="p-6 text-sm text-slate-500">{loading ? "Memuat statistik akun (±5 detik)…" : ""}</p>;

  const best = [...view.byPlatform].sort((a, b) => b.metric - a.metric)[0];
  const accts: AccountStat[] = [...stats.accounts].sort((a, b) => (b.metricTotal ?? 0) - (a.metricTotal ?? 0));

  return (
    <div className="h-full space-y-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Sumber: jadwal · statistik 30 hari terakhir · {stats.accounts.length} akun terhubung{stats.failed ? ` (${stats.failed} gagal dimuat)` : ""} · diperbarui {new Date(stats.fetchedAt).toLocaleTimeString("id-ID")}</p>
        <button onClick={() => fetchStats(true)} disabled={loading} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:bg-slate-800">{loading ? "Memuat…" : "↻ Segarkan"}</button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat title="Pengikut / subscriber" value={fmtTokens(view.followers)} sub={`di ${stats.accounts.length} akun`} />
        <Stat title="Views + jangkauan (30 hari)" value={fmtTokens(view.metric)} sub="gabungan; definisi metrik beda per platform" />
        <Stat title="Platform teratas" value={best ? plat(best.p).name : "—"} sub={best ? `${fmtTokens(best.metric)} ${best.metricLabel.toLowerCase()}` : undefined} />
        <Stat title="Hari terpantau" value={String(view.buckets.length)} sub="deret harian dari jadwal" />
      </div>

      <section className={`${card} p-4`}>
        <h2 className="text-sm font-semibold">Views / jangkauan harian per platform</h2>
        <p className="mb-2 text-[11px] text-slate-500">Instagram = jangkauan; TikTok = views video; YouTube, Facebook, Threads = views. Angka antar-platform tidak setara.</p>
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300" aria-label="Legenda">
          {view.platforms.map((p, k) => <li key={p} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[PLATFORM_ORDER.indexOf(p)] }} />{plat(p).name}</li>)}
        </ul>
        <StackedBars buckets={view.buckets} names={view.platforms.map((p) => plat(p).name)} colors={view.platforms.map((p) => colors[PLATFORM_ORDER.indexOf(p)])} fmt={fmtTokens}
          ariaLabel="Grafik batang bertumpuk views dan jangkauan harian per platform" label={dLabel} axisLabel={(t, i) => (i % 5 === 0 ? dLabel(t) : "")} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <section className={`${card} p-4`}>
          <h2 className="mb-3 text-sm font-semibold">Ringkasan per platform</h2>
          <table className="w-full text-xs tabular-nums">
            <thead><tr className="text-left text-slate-500"><th className="pb-2 font-medium">Platform</th><th className="pb-2 text-right font-medium">Akun</th><th className="pb-2 text-right font-medium">Pengikut</th><th className="pb-2 text-right font-medium">Metrik 30 hari</th></tr></thead>
            <tbody>{view.byPlatform.map((r) => (
              <tr key={r.p} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2">{plat(r.p).icon} {plat(r.p).name}</td><td className="py-2 text-right">{r.accounts}</td><td className="py-2 text-right">{fmtTokens(r.followers)}</td>
                <td className="py-2 text-right">{fmtTokens(r.metric)} <span className="text-slate-500">{r.metricLabel.toLowerCase()}</span></td>
              </tr>))}</tbody>
          </table>
        </section>

        <section className={`${card} p-4`}>
          <h2 className="mb-3 text-sm font-semibold">Per akun</h2>
          <ul className="space-y-1.5">
            {accts.map((a) => (
              <li key={a.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800/70">
                <span className="min-w-0"><span className="block truncate font-medium">{plat(a.type).icon} {a.name}</span>
                  <span className="block truncate text-[11px] text-slate-500">{fmtTokens(a.followers ?? 0)} pengikut{a.extras.filter((e) => e.value > 0).slice(0, 2).map((e) => ` · ${e.label} ${fmtTokens(e.value)}`).join("")}</span></span>
                <Spark data={a.series.map((x) => x.value)} color={colors[Math.max(0, PLATFORM_ORDER.indexOf(a.type))]} />
                <span className="w-24 text-right tabular-nums"><span className="font-semibold">{fmtTokens(a.metricTotal ?? 0)}</span><span className="block text-[10px] text-slate-500">{a.metricLabel.toLowerCase()}</span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
