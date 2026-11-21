"use client";
import { useEffect, useRef, useState } from "react";

export interface Bucket { start: number; vals: number[]; total: number }

export function niceMax(v: number) {
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

interface Props {
  buckets: Bucket[];
  names: string[];
  colors: string[];
  fmt: (n: number) => string;
  /** judul tooltip */
  label: (start: number) => string;
  /** label sumbu-x (kosong = lewati) */
  axisLabel: (start: number, i: number) => string;
  ariaLabel: string;
}

/** Batang bertumpuk: celah 2px antar segmen, ujung atas membulat 4px, area hover lebih besar dari marka, tooltip */
export default function StackedBars({ buckets, names, colors, fmt, label, axisLabel, ariaLabel }: Props) {
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
      <svg width={W} height={H} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="stroke-slate-200 dark:stroke-slate-700/70" strokeWidth={1} />
            <text x={m.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[10px] dark:fill-slate-400">{fmt(t)}</text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const cx = m.l + band * i + band / 2;
          let acc = 0;
          const segs = b.vals.map((v, k) => { const y0 = y(acc), y1 = y(acc + v); acc += v; return { k, v, y0, y1 }; }).filter((s) => s.v > 0);
          const topIdx = segs.length - 1;
          return (
            <g key={b.start}>
              {hover === i && <rect x={m.l + band * i} y={m.t} width={band} height={ih} className="fill-slate-500/10" />}
              {segs.map((s, j) => {
                const h = Math.max(0.5, s.y0 - s.y1 - (j === 0 ? 0 : GAP));
                return j === topIdx
                  ? <path key={s.k} d={topRound(cx - bw / 2, s.y1, bw, h, 4)} fill={colors[s.k]} />
                  : <rect key={s.k} x={cx - bw / 2} y={s.y1} width={bw} height={h} fill={colors[s.k]} />;
              })}
              <text x={cx} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[10px] dark:fill-slate-400">{axisLabel(b.start, i)}</text>
              <rect x={m.l + band * i} y={m.t} width={band} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
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
            <p className="mb-1.5 font-semibold text-slate-800 dark:text-slate-100">{label(b.start)}</p>
            <ul className="space-y-1">
              {b.vals.map((v, k) => (
                <li key={names[k]} className="flex items-center justify-between gap-3 text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[k] }} />{names[k]}</span>
                  <span className="tabular-nums">{fmt(v)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100"><span>Total</span><span className="tabular-nums">{fmt(b.total)}</span></p>
          </div>
        );
      })()}
    </div>
  );
}
