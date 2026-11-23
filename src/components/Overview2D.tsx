"use client";
import { BED_X, BED_Z, BUILDING, DESKS, POOL, ZONES } from "@/lib/layout";
import { useMissionStore, statusLabel } from "@/store/useMissionStore";
import { spotFor } from "./Character";

const W = BUILDING.maxX - BUILDING.minX; // 46
const D = BUILDING.maxZ - BUILDING.minZ; // 14
const px = (x: number) => `${((x - BUILDING.minX) / W) * 100}%`;
const pz = (z: number) => `${((z - BUILDING.minZ) / D) * 100}%`;
const statusBg = { working: "bg-emerald-500", idle: "bg-sky-500", error: "bg-red-500" } as const;

/** Denah satu lantai: 7 zona, meja, dan posisi tiap agen (bergeser halus mengikuti status) */
export default function Overview2D() {
  const agents = useMissionStore((s) => s.agents);
  const visiting = useMissionStore((s) => s.visiting);
  const select = useMissionStore((s) => s.select);
  const selectedId = useMissionStore((s) => s.selectedId);
  return (
    <div className="h-full overflow-auto p-4">
      <section className="min-w-[760px] rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Denah kantor · 1 lantai
          <span className="ml-auto text-[11px] font-normal text-slate-500">{agents.filter((a) => a.status !== "idle").length} bekerja · {agents.filter((a) => a.status === "idle").length} istirahat</span>
        </h2>
        <div className="relative w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800" style={{ aspectRatio: `${W} / ${D}` }}>
          {ZONES.map((z) => (
            <div key={z.id} className={`absolute rounded-lg border border-dashed border-slate-400/50 p-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 ${z.tint}`}
              style={{ left: px(z.x0), top: pz(z.z0), width: `${((z.x1 - z.x0) / W) * 100}%`, height: `${((z.z1 - z.z0) / D) * 100}%` }}>{z.name}</div>
          ))}
          {DESKS.map((d, i) => (
            <div key={i} className="absolute -translate-x-1/2 rounded-md border border-slate-400/60 bg-white/70 text-center text-[9px] leading-[22px] text-slate-500 dark:bg-slate-700/60 dark:text-slate-300"
              style={{ left: px(d.pos[0]), top: pz(d.pos[2] - 1.7), width: "4.2%", height: "6%" }}>{i + 1}</div>
          ))}
          {BED_X.map((x) => <div key={x} className="absolute -translate-x-1/2 rounded border border-rose-300/60 bg-white/60 dark:bg-slate-600/40" style={{ left: px(x), top: pz(BED_Z - 1.3), width: "3.2%", height: "18%" }} />)}
          <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded border border-emerald-500/60 bg-emerald-500/30" style={{ left: px(POOL.x), top: pz(POOL.z), width: "6.4%", height: "12%" }} />
          {agents.map((a) => {
            const p = spotFor(a, visiting).pos;
            const orchestrating = visiting?.agentId && a.id === "manager" && a.status !== "idle";
            return (
              <button key={a.id} onClick={() => select(a.id)} title={`${a.name} — ${statusLabel(a.status)}${orchestrating ? " (menangani agen lain)" : ""}`}
                className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-lg ring-2 transition-all duration-1000 ease-in-out ${selectedId === a.id ? "ring-white" : "ring-white/40"}`}
                style={{ left: px(p[0]), top: pz(p[2]), background: a.color }}>
                {a.name.slice(0, 2)}
                <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white ${statusBg[a.status]} ${a.status === "error" ? "animate-pulse" : ""}`} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
