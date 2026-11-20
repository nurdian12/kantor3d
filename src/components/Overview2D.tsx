"use client";
import { BALCONY, BUILDING, DESKS, IDLE_SPOTS } from "@/lib/layout";
import { useMissionStore, statusLabel } from "@/store/useMissionStore";
import { spotFor } from "./Character";

const W = BUILDING.maxX - BUILDING.minX; // 16
const D = BUILDING.maxZ - BUILDING.minZ; // 8
const pct = (v: number, min: number, total: number) => `${((v - min) / total) * 100}%`;
const statusBg = { working: "bg-emerald-500", idle: "bg-sky-500", error: "bg-red-500" } as const;

function Zone({ x, z, w, d, label, tint }: { x: number; z: number; w: number; d: number; label: string; tint: string }) {
  return (
    <div className={`absolute rounded-lg border border-dashed border-slate-400/50 p-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 ${tint}`}
      style={{ left: pct(x, BUILDING.minX, W), top: pct(z, BUILDING.minZ, D), width: `${(w / W) * 100}%`, height: `${(d / D) * 100}%` }}>
      {label}
    </div>
  );
}

function Plan({ floor, title }: { floor: 1 | 2; title: string }) {
  const agents = useMissionStore((s) => s.agents);
  const select = useMissionStore((s) => s.select);
  const selectedId = useMissionStore((s) => s.selectedId);
  const here = agents.filter((a) => spotFor(a).floor === floor);
  const extra = floor === 2 ? 2 : 0; // ruang untuk dek balkon
  const totalD = D + extra;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800" style={{ aspectRatio: `${W} / ${totalD}` }}>
        <div className="absolute left-0 top-0 w-full" style={{ height: `${(D / totalD) * 100}%` }}>
          {floor === 1 ? (
            <>
              <Zone x={-6} z={-4} w={14} d={8} label="Area Workstation" tint="bg-amber-100/50 dark:bg-amber-400/10" />
              {DESKS.map((d, i) => (
                <div key={i} className="absolute -translate-x-1/2 rounded-md border border-slate-400/60 bg-white/70 text-center text-[9px] leading-[22px] text-slate-500 dark:bg-slate-700/60 dark:text-slate-300"
                  style={{ left: pct(d.pos[0], BUILDING.minX, W), top: pct(d.pos[2] - 1.7, BUILDING.minZ, D), width: "12%", height: "14%" }}>
                  Meja {i + 1}
                </div>
              ))}
            </>
          ) : (
            <>
              <Zone x={-6} z={-4} w={4.8} d={8} label="Lounge" tint="bg-violet-200/50 dark:bg-violet-400/10" />
              <Zone x={-1.2} z={-4} w={5.1} d={8} label="Kamar Tidur" tint="bg-rose-200/50 dark:bg-rose-400/10" />
            </>
          )}
          <Zone x={-8} z={-4} w={2} d={8} label="Tangga" tint="bg-slate-300/50 dark:bg-slate-500/20" />
        </div>
        {floor === 2 && (
          <div className="absolute rounded-lg border border-dashed border-sky-400/60 bg-sky-200/40 p-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-800 dark:bg-sky-400/10 dark:text-sky-200"
            style={{ left: pct(BALCONY.minX, BUILDING.minX, W), top: `${((BALCONY.minZ - BUILDING.minZ) / totalD) * 100}%`, width: `${((BALCONY.maxX - BALCONY.minX) / W) * 100}%`, height: `${((BALCONY.maxZ - BALCONY.minZ) / totalD) * 100}%` }}>
            Balkon
          </div>
        )}
        {here.map((a) => {
          const p = spotFor(a).pos;
          return (
            <button key={a.id} onClick={() => select(a.id)} title={`${a.name} — ${statusLabel(a.status)}`}
              className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-lg ring-2 transition-all duration-700 ease-in-out ${selectedId === a.id ? "ring-white" : "ring-white/40"}`}
              style={{ left: pct(p[0], BUILDING.minX, W), top: `${((p[2] - BUILDING.minZ) / totalD) * 100}%`, background: a.color }}>
              {a.name.split(" ").map((w) => w[0]).join("")}
              <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white ${statusBg[a.status]} ${a.status === "error" ? "animate-pulse" : ""}`} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Overview2D() {
  // referensi IDLE_SPOTS menjaga layout & 2D tetap sinkron
  void IDLE_SPOTS;
  return (
    <div className="grid h-full grid-cols-1 content-start items-start gap-4 overflow-auto p-4 xl:grid-cols-2">
      <Plan floor={2} title="Lantai 2 — Lounge, Kamar Tidur & Balkon (Idle)" />
      <Plan floor={1} title="Lantai 1 — Workstation (Working / Error)" />
    </div>
  );
}
