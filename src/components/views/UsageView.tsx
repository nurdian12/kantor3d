"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AGENT_META, agentMeta, chartColor } from "@/lib/agentsMeta";
import { generateUsage } from "@/lib/mockData";
import { useMissionStore } from "@/store/useMissionStore";
import { AgentFilter, Seg, card, fmtTokens, toggleIn } from "./ui";

type Range = "24h" | "7d" | "30d";
const RANGES = [["24h", "24 jam terakhir"], ["7d", "7 hari"], ["30d", "30 hari"]] as const;
const CFG: Record<Range, { n: number; bucketH: number; unit: string }> = {
  "24h": { n: 24, bucketH: 1, unit: "jam" },
  "7d": { n: 28, bucketH: 6, unit: "6 jam" },
  "30d": { n: 30, bucketH: 24, unit: "hari" },
};
const HOUR = 3_600_000;
const PRICE_IN = 3, PRICE_OUT = 15; // USD per 1M token (asumsi)
const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function align(t: number, bucketH: number) {
  const d = new Date(t);
  d.setMinutes(0, 0, 0);
  if (bucketH === 24) d.setHours(0);
  else d.setHours(d.getHours() - (d.getHours() % bucketH));
  return d.getTime();
}
const label = (t: number, range: Range) => {
  const d = new Date(t);
  if (range === "24h") return `${String(d.getHours()).padStart(2, "0")}:00`;
  if (range === "7d") return `${DOW[d.getDay()]} ${String(d.getHours()).padStart(2, "0")}:00`;
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};
const axisLabel = (t: number, i: number, range: Range) => {
  const d = new Date(t);
  if (range === "24h") return i % 4 === 0 ? label(t, range) : "";
  if (range === "7d") return d.getHours() === 0 ? `${DOW[d.getDay()]} ${d.getDate()}` : "";
  return i % 5 === 0 ? label(t, range) : "";
};
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => f <= x) ?? 10) * p;
}
/** Persegi dengan ujung atas membulat (anchor di baseline) */
function topRound(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

interface Bucket { start: number; vals: number[]; total: number }

function StackedBars({ buckets, ids, colors, range }: { buckets: Bucket[]; ids: string[]; colors: string[]; range: Range }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 300, m = { l: 46, r: 8, t: 8, b: 24 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = niceMax(Math.max(...buckets.map((b) => b.total), 1));
  const ticks = Array.from({ length: 5 }, (_, i) => (max / 4) * i);
  const band = iw / buckets.length;
  const bw = Math.max(3, Math.min(28, band * 0.7));
  const y = (v: number) => m.t + ih - (v / max) * ih;
  const GAP = 2;

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      <svg width={W} height={H} role="img" aria-label="Grafik batang bertumpuk konsumsi token per agen">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="stroke-slate-200 dark:stroke-slate-700/70" strokeWidth={1} />
            <text x={m.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[10px] dark:fill-slate-400">{fmtTokens(t)}</text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const cx = m.l + band * i + band / 2;
          let acc = 0;
          const segs = b.vals.map((v, k) => {
            const y0 = y(acc), y1 = y(acc + v);
            acc += v;
            return { k, v, y0, y1 };
          }).filter((s) => s.v > 0);
          const topIdx = segs.length - 1;
          return (
            <g key={b.start}>
              {hover === i && <rect x={m.l + band * i} y={m.t} width={band} height={ih} className="fill-slate-500/10" />}
              {segs.map((s, j) => {
                // segmen pertama menempel baseline; sisanya disusutkan 2px di bawah agar ada celah antar segmen
                const h = Math.max(0.5, s.y0 - s.y1 - (j === 0 ? 0 : GAP));
                return j === topIdx
                  ? <path key={s.k} d={topRound(cx - bw / 2, s.y1, bw, h, 4)} fill={colors[s.k]} />
                  : <rect key={s.k} x={cx - bw / 2} y={s.y1} width={bw} height={h} fill={colors[s.k]} />;
              })}
              <text x={cx} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[10px] dark:fill-slate-400">{axisLabel(b.start, i, range)}</text>
              {/* area hover lebih besar dari marka */}
              <rect x={m.l + band * i} y={m.t} width={band} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />
            </g>
          );
        })}
        <line x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} className="stroke-slate-300 dark:stroke-slate-600" />
      </svg>
      {hover !== null && (() => {
        const b = buckets[hover];
        const cx = m.l + band * hover + band / 2;
        const flip = cx > W * 0.6;
        return (
          <div className="pointer-events-none absolute top-2 z-10 w-56 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:border-slate-600 dark:bg-slate-900/95"
            style={{ left: flip ? undefined : cx + 14, right: flip ? W - cx + 14 : undefined }}>
            <p className="mb-1.5 font-semibold text-slate-800 dark:text-slate-100">{label(b.start, range)}{range !== "24h" && range !== "30d" ? ` (+${CFG[range].bucketH} jam)` : ""}</p>
            <ul className="space-y-1">
              {b.vals.map((v, k) => (
                <li key={ids[k]} className="flex items-center justify-between gap-3 text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[k] }} />{agentMeta(ids[k]).name}</span>
                  <span className="tabular-nums">{fmtTokens(v)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100"><span>Total</span><span className="tabular-nums">{fmtTokens(b.total)}</span></p>
          </div>
        );
      })()}
    </div>
  );
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

export default function UsageView() {
  const theme = useMissionStore((s) => s.theme);
  const [range, setRange] = useState<Range>("7d");
  const [sel, setSel] = useState<string[]>([]);
  const [asTable, setAsTable] = useState(false);
  const data = useMemo(() => generateUsage(), []);

  const ids = AGENT_META.map((a) => a.id).filter((id) => sel.length === 0 || sel.includes(id));
  const colors = ids.map((id) => chartColor(id, theme)); // warna mengikuti entitas, bukan peringkat/jumlah seri
  const { n, bucketH } = CFG[range];
  const bucketMs = bucketH * HOUR;

  const { buckets, perAgent, totalIn, totalOut, prevTotal } = useMemo(() => {
    const endStart = align(Date.now(), bucketH);
    const firstStart = endStart - (n - 1) * bucketMs;
    const spanMs = n * bucketMs;
    const bs: Bucket[] = Array.from({ length: n }, (_, i) => ({ start: firstStart + i * bucketMs, vals: ids.map(() => 0), total: 0 }));
    const per: Record<string, { input: number; output: number }> = Object.fromEntries(ids.map((id) => [id, { input: 0, output: 0 }]));
    let tin = 0, tout = 0, prev = 0;
    for (const r of data) {
      const k = ids.indexOf(r.agentId);
      if (k < 0) continue;
      if (r.t >= firstStart) {
        const idx = Math.floor((r.t - firstStart) / bucketMs);
        if (idx >= 0 && idx < n) {
          const v = r.input + r.output;
          bs[idx].vals[k] += v; bs[idx].total += v;
          per[r.agentId].input += r.input; per[r.agentId].output += r.output;
          tin += r.input; tout += r.output;
        }
      } else if (r.t >= firstStart - spanMs) prev += r.input + r.output;
    }
    return { buckets: bs, perAgent: per, totalIn: tin, totalOut: tout, prevTotal: prev };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, range, sel]);

  const total = totalIn + totalOut;
  const cost = (totalIn * PRICE_IN + totalOut * PRICE_OUT) / 1e6;
  const delta = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;
  const peak = buckets.reduce((a, b) => (b.total > a.total ? b : a), buckets[0]);
  const hours = n * bucketH;
  const rows = ids.map((id) => ({ id, ...perAgent[id], total: perAgent[id].input + perAgent[id].output })).sort((a, b) => b.total - a.total);
  const rowMax = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="h-full space-y-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AgentFilter ids={AGENT_META.map((a) => a.id)} selected={sel} onToggle={(id) => setSel((s) => toggleIn(s, id))} onClear={() => setSel([])} />
        <Seg label="Rentang waktu" value={range} onChange={setRange} options={RANGES} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat title="Total token" value={fmtTokens(total)} sub={`${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}% vs periode sebelumnya`} />
        <Stat title="Input / Output" value={`${fmtTokens(totalIn)} / ${fmtTokens(totalOut)}`} sub={`Rasio output ${(totalOut / Math.max(totalIn, 1) * 100).toFixed(0)}% dari input`} />
        <Stat title="Estimasi biaya" value={`$${cost.toFixed(cost >= 100 ? 0 : 2)}`} sub={`Asumsi $${PRICE_IN}/1M input · $${PRICE_OUT}/1M output`} />
        <Stat title="Rata-rata / jam" value={fmtTokens(total / hours)} sub={`Puncak: ${label(peak.start, range)} (${fmtTokens(peak.total)})`} />
      </div>

      <section className={`${card} p-4`}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Konsumsi token per {CFG[range].unit}</h2>
            <p className="text-[11px] text-slate-500">Data mock · input + output, ditumpuk per agen</p>
          </div>
          <Seg label="Bentuk tampilan" value={asTable ? "tabel" : "grafik"} onChange={(v) => setAsTable(v === "tabel")} options={[["grafik", "Grafik"], ["tabel", "Tabel"]] as const} />
        </div>
        {/* Legenda selalu tampil untuk >= 2 seri: identitas tidak bergantung pada warna saja */}
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300" aria-label="Legenda">
          {ids.map((id, k) => <li key={id} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[k] }} />{agentMeta(id).name}</li>)}
        </ul>
        {asTable ? (
          <div className="max-h-[320px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs tabular-nums">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800"><tr><th className="p-2 text-left">Waktu</th>{ids.map((id) => <th key={id} className="p-2 text-right">{agentMeta(id).name}</th>)}<th className="p-2 text-right">Total</th></tr></thead>
              <tbody>{[...buckets].reverse().map((b) => (
                <tr key={b.start} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2">{label(b.start, range)}</td>{b.vals.map((v, k) => <td key={k} className="p-2 text-right">{fmtTokens(v)}</td>)}<td className="p-2 text-right font-semibold">{fmtTokens(b.total)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : <StackedBars buckets={buckets} ids={ids} colors={colors} range={range} />}
      </section>

      <section className={`${card} p-4`}>
        <h2 className="mb-3 text-sm font-semibold">Rincian per agen</h2>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 text-xs sm:grid-cols-[11rem_1fr_9rem]">
              <span className="truncate font-medium text-slate-700 dark:text-slate-200">{agentMeta(r.id).name}</span>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-r-full rounded-l-sm" style={{ width: `${(r.total / rowMax) * 100}%`, background: chartColor(r.id, theme) }} /></div>
              <span className="text-right tabular-nums text-slate-700 dark:text-slate-300">{fmtTokens(r.total)} <span className="text-slate-500">({total ? ((r.total / total) * 100).toFixed(0) : 0}%)</span></span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
