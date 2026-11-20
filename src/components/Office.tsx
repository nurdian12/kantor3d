"use client";
import { Html } from "@react-three/drei";
import { BALCONY, DESKS, FLOOR_H, STAIRS } from "@/lib/layout";
import type { Theme } from "@/store/useMissionStore";
import { useMissionStore } from "@/store/useMissionStore";

type V3 = [number, number, number];

function Box({ p, s, c, o, e, cast = true }: { p: V3; s: V3; c: string; o?: number; e?: string; cast?: boolean }) {
  return (
    <mesh position={p} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} transparent={o !== undefined} opacity={o ?? 1} emissive={e ?? "#000"} emissiveIntensity={e ? 0.9 : 0} />
    </mesh>
  );
}

function Plant({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Box p={[0, 0.25, 0]} s={[0.4, 0.5, 0.4]} c="#b45309" />
      <mesh position={[0, 0.85, 0]} castShadow><sphereGeometry args={[0.38, 12, 12]} /><meshStandardMaterial color="#16a34a" /></mesh>
    </group>
  );
}

function Desk({ x, z, color, agentColor, active }: { x: number; z: number; color: string; agentColor: string; active: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0.75, 0]} s={[1.9, 0.07, 0.95]} c={color} />
      <Box p={[-0.85, 0.37, 0]} s={[0.07, 0.74, 0.85]} c="#475569" />
      <Box p={[0.85, 0.37, 0]} s={[0.07, 0.74, 0.85]} c="#475569" />
      {/* monitor */}
      <Box p={[0, 1.2, -0.25]} s={[0.9, 0.55, 0.05]} c="#0f172a" />
      <Box p={[0, 1.2, -0.215]} s={[0.82, 0.47, 0.01]} c={active ? agentColor : "#1e293b"} e={active ? agentColor : undefined} cast={false} />
      <Box p={[0, 0.88, -0.25]} s={[0.1, 0.2, 0.1]} c="#334155" />
      <Box p={[0, 0.8, 0.12]} s={[0.55, 0.03, 0.18]} c="#94a3b8" />
      {/* kursi */}
      <group position={[0, 0, 1.0]}>
        <Box p={[0, 0.4, 0.1]} s={[0.6, 0.08, 0.6]} c="#1e293b" />
        <Box p={[0, 0.75, 0.38]} s={[0.55, 0.65, 0.07]} c="#1e293b" />
        <Box p={[0, 0.2, 0.1]} s={[0.08, 0.4, 0.08]} c="#64748b" />
      </group>
    </group>
  );
}

function Stairs() {
  const n = 16;
  const z0 = STAIRS.bottom[2];
  const z1 = STAIRS.top[2];
  const dz = (z0 - z1) / n;
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const h = ((i + 1) * FLOOR_H) / n;
        const z = z0 - (i + 0.5) * dz;
        return <Box key={i} p={[STAIRS.bottom[0], h / 2, z]} s={[1.1, h, dz]} c={i % 2 ? "#cbd5e1" : "#e2e8f0"} />;
      })}
      {/* pegangan */}
      <Box p={[-7.55, 2.9, (z0 + z1) / 2]} s={[0.05, 0.05, 5.4]} c="#94a3b8" cast={false} />
    </group>
  );
}

function Label({ p, children }: { p: V3; children: React.ReactNode }) {
  return (
    <Html position={p} center distanceFactor={14} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div className="whitespace-nowrap rounded-md bg-slate-900/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">{children}</div>
    </Html>
  );
}

export function Office({ theme }: { theme: Theme }) {
  const dark = theme === "dark";
  const agents = useMissionStore((s) => s.agents);
  const floor1 = dark ? "#475577" : "#e7dcc8";
  const floor2 = dark ? "#53628c" : "#f1e7d3";
  const wall = dark ? "#34426b" : "#f8fafc";
  const wallSide = dark ? "#4a5a8a" : "#e2e8f0";
  const desk = dark ? "#8a6a45" : "#c89b6a";
  const H = FLOOR_H;
  const showF2 = useMissionStore((s) => s.focus !== "1");

  return (
    <group>
      {/* slab lantai */}
      <Box p={[0, -0.15, 0]} s={[16.4, 0.3, 8.4]} c={floor1} />
      {showF2 && <group>
      <Box p={[1, H - 0.15, 0]} s={[14, 0.3, 8]} c={floor2} />
      <Box p={[-7, H - 0.15, -3]} s={[2, 0.3, 2]} c={floor2} />
      {/* dek balkon */}
      <Box p={[(BALCONY.minX + BALCONY.maxX) / 2, H - 0.15, (BALCONY.minZ + BALCONY.maxZ) / 2]} s={[BALCONY.maxX - BALCONY.minX, 0.3, BALCONY.maxZ - BALCONY.minZ]} c={dark ? "#3a4a52" : "#b9a88a"} />
      {/* railing balkon */}
      <Box p={[6.1, H + 0.5, 6]} s={[3.8, 0.05, 0.05]} c="#94a3b8" cast={false} />
      <Box p={[8, H + 0.5, 1]} s={[0.05, 0.05, 10]} c="#94a3b8" cast={false} />
      <Box p={[4.2, H + 0.5, 5]} s={[0.05, 0.05, 2]} c="#94a3b8" cast={false} />
      <Box p={[6.1, H + 0.25, 6]} s={[3.8, 0.03, 0.03]} c="#94a3b8" cast={false} />
      <Box p={[8, H + 0.25, 1]} s={[0.03, 0.03, 10]} c="#94a3b8" cast={false} />
      <Plant p={[7.4, H, 4.5]} />
      <Plant p={[4.8, H, 4.5]} />

      </group>}

      {/* dinding belakang, kiri, kanan (cutaway: depan terbuka) */}
      <Box p={[0, H, -4.1]} s={[16.4, H * 2, 0.2]} c={wall} />
      <Box p={[-8.1, H, 0]} s={[0.2, H * 2, 8.4]} c={wallSide} o={0.55} />
      <Box p={[8.1, H / 2, 0]} s={[0.2, H, 8.4]} c={wallSide} o={0.55} />
      {/* kaca jendela lantai 1 */}
      <Box p={[3.2, 2.3, -3.98]} s={[3, 1.4, 0.06]} c={dark ? "#7dd3fc" : "#bae6fd"} e={dark ? "#38bdf8" : undefined} cast={false} />
      <Box p={[-1.2, 2.3, -3.98]} s={[3, 1.4, 0.06]} c={dark ? "#7dd3fc" : "#bae6fd"} e={dark ? "#38bdf8" : undefined} cast={false} />
      {/* logo dinding */}
      <Box p={[-4.6, 2.5, -3.97]} s={[2.2, 0.7, 0.05]} c="#6366f1" e="#6366f1" cast={false} />

      {/* ===== LANTAI 1: workstation ===== */}
      {DESKS.map((d, i) => {
        const a = agents.find((x) => x.deskIndex % DESKS.length === i && x.status === "working") ?? agents.find((x) => x.deskIndex % DESKS.length === i);
        return <Desk key={i} x={d.pos[0]} z={d.pos[2] - 1.1} color={desk} agentColor={a?.color ?? "#64748b"} active={a?.status === "working"} />;
      })}
      <Box p={[6.8, 0.6, 2.2]} s={[2.2, 0.5, 0.9]} c={dark ? "#475569" : "#94a3b8"} />
      <Plant p={[-6.4, 0, -3.4]} />
      <Plant p={[7.2, 0, -3.4]} />
      <Box p={[-3, 0.01, 1.5]} s={[4, 0.02, 2.4]} c={dark ? "#3b4a78" : "#d6c4a5"} cast={false} />
      <Label p={[0, 0.5, 4.7]}>Lantai 1 · Workstation</Label>
      <Stairs />

      {showF2 && <group>
      {/* ===== LANTAI 2 ===== */}
      <Label p={[-1.5, H + 0.5, 4.4]}>Lantai 2 · Lounge / Kamar / Balkon</Label>
      {/* lounge */}
      <Box p={[-3.4, H + 0.25, -3.5]} s={[3, 0.5, 0.9]} c="#7c3aed" />
      <Box p={[-3.4, H + 0.75, -3.85]} s={[3, 0.6, 0.25]} c="#6d28d9" />
      <Box p={[-4.85, H + 0.45, -3.5]} s={[0.25, 0.9, 0.9]} c="#6d28d9" />
      <Box p={[-1.95, H + 0.45, -3.5]} s={[0.25, 0.9, 0.9]} c="#6d28d9" />
      <Box p={[-3.4, H + 0.01, -1.4]} s={[3.4, 0.02, 2.2]} c={dark ? "#4c3d8f" : "#fca5a5"} cast={false} />
      <Box p={[-3.4, H + 0.25, -1.4]} s={[1.2, 0.08, 0.7]} c="#d6b88a" />
      <Box p={[-3.4, H + 0.12, -1.4]} s={[1.1, 0.24, 0.6]} c="#a07a4a" />
      <Box p={[-3.4, H + 2.0, -3.96]} s={[2.2, 1.2, 0.08]} c="#0f172a" />
      <Box p={[-3.4, H + 2.0, -3.9]} s={[2.06, 1.06, 0.02]} c="#38bdf8" e="#0ea5e9" cast={false} />
      <Plant p={[-5.4, H, -3.4]} />
      <Label p={[-3.4, H + 2.3, -2.2]}>Lounge</Label>
      {/* partisi kamar */}
      <Box p={[-1.1, H + 1.1, -2.4]} s={[0.12, 2.2, 3.2]} c={wallSide} o={0.5} />
      <Box p={[3.9, H + 1.1, -2.4]} s={[0.12, 2.2, 3.2]} c={wallSide} o={0.5} />
      {/* dua tempat tidur */}
      {[0.2, 2.6].map((bx) => (
        <group key={bx}>
          <Box p={[bx, H + 0.25, -2.4]} s={[1.5, 0.5, 2.7]} c="#475569" />
          <Box p={[bx, H + 0.55, -2.4]} s={[1.4, 0.14, 2.6]} c="#f1f5f9" />
          <Box p={[bx, H + 0.72, -3.35]} s={[0.9, 0.18, 0.5]} c="#e2e8f0" />
          <Box p={[bx, H + 0.9, -3.9]} s={[1.6, 1.3, 0.1]} c="#92400e" />
        </group>
      ))}
      <Box p={[1.4, H + 0.3, -3.5]} s={[0.4, 0.6, 0.5]} c="#92400e" />
      <Box p={[1.4, H + 0.9, -3.5]} s={[0.1, 0.4, 0.1]} c="#fde68a" e="#fbbf24" cast={false} />
      <Label p={[1.4, H + 2.4, -2.2]}>Kamar Tidur</Label>
      {/* balkon */}
      <Box p={[6.2, H + 0.3, 5.2 - 0.9]} s={[1.6, 0.04, 1.0]} c="#0ea5e9" cast={false} />
      <Label p={[6.1, H + 2.0, 4.6]}>Balkon</Label>

      </group>}

      {/* pencahayaan interior */}
      <pointLight position={[-3.4, H + 2.5, -1]} intensity={dark ? 14 : 3} color="#fbbf24" distance={7} />
      <pointLight position={[1.4, H + 2.5, -2]} intensity={dark ? 10 : 2} color="#fda4af" distance={6} />
      <pointLight position={[0, 3.4, 0]} intensity={dark ? 18 : 4} color="#e0f2fe" distance={12} />
    </group>
  );
}
