"use client";
import { Html } from "@react-three/drei";
import { BALCONY, DESKS, FLOORS, FLOOR_H, FLOOR_INFO, STAIR_X, floorVisible, flightEndZ, flightStartZ, floorY, landingZ } from "@/lib/layout";
import type { Theme } from "@/store/useMissionStore";
import { useMissionStore } from "@/store/useMissionStore";
import { QUALITY } from "@/lib/quality";

type V3 = [number, number, number];
const H = FLOOR_H;

function Box({ p, s, c, o, e, cast = false, r }: { p: V3; s: V3; c: string; o?: number; e?: string; cast?: boolean; r?: V3 }) {
  return (
    <mesh position={p} rotation={r} castShadow={cast} receiveShadow>
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
      <Box p={[0, 1.2, -0.25]} s={[0.9, 0.55, 0.05]} c="#0f172a" />
      <Box p={[0, 1.2, -0.215]} s={[0.82, 0.47, 0.01]} c={active ? agentColor : "#1e293b"} e={active ? agentColor : undefined} cast={false} />
      <Box p={[0, 0.88, -0.25]} s={[0.1, 0.2, 0.1]} c="#334155" />
      <Box p={[0, 0.8, 0.12]} s={[0.55, 0.03, 0.18]} c="#94a3b8" />
      <group position={[0, 0, 1.0]}>
        <Box p={[0, 0.4, 0.1]} s={[0.6, 0.08, 0.6]} c="#1e293b" />
        <Box p={[0, 0.75, 0.38]} s={[0.55, 0.65, 0.07]} c="#1e293b" />
        <Box p={[0, 0.2, 0.1]} s={[0.08, 0.4, 0.08]} c="#64748b" />
      </group>
    </group>
  );
}

/** Tangga k: lantai k -> k+1 (koordinat lokal grup lantai k). Anak tangga tipis + penyangga miring + pegangan. */
function Flight({ k }: { k: number }) {
  const n = 16, zs = flightStartZ(k), ze = flightEndZ(k), dz = (ze - zs) / n;
  const len = Math.hypot(H, ze - zs), tilt = -Math.atan(H / (ze - zs));
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <Box key={i} p={[STAIR_X, ((i + 1) * H) / n - 0.1, zs + (i + 0.5) * dz]} s={[1.1, 0.2, Math.abs(dz) + 0.02]} c={i % 2 ? "#cbd5e1" : "#e2e8f0"} />
      ))}
      <Box p={[STAIR_X, H / 2 - 0.35, (zs + ze) / 2]} s={[0.9, 0.2, len]} c="#94a3b8" r={[tilt, 0, 0]} />
      <Box p={[-7.6, H / 2 + 0.7, (zs + ze) / 2]} s={[0.05, 0.05, len]} c="#94a3b8" cast={false} r={[tilt, 0, 0]} />
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

interface Pal { dark: boolean; floor: string; wallSide: string; desk: string; glass: string; glassE?: string }

/** Perabot khas tiap lantai (koordinat lokal; y=0 adalah lantai) */
function FloorProps({ n, pal }: { n: number; pal: Pal }) {
  const { dark } = pal;
  switch (n) {
    case 1: // Lobi & Komunitas: meja resepsionis, sofa tunggu
      return (
        <>
          <Box p={[5.6, 0.55, 2.4]} s={[3.2, 1.1, 0.8]} c={dark ? "#0e7490" : "#67e8f9"} />
          <Box p={[5.6, 1.14, 2.4]} s={[3.3, 0.08, 0.9]} c={dark ? "#cbd5e1" : "#ffffff"} />
          <Box p={[-3.6, 0.3, 2.7]} s={[2.6, 0.6, 0.9]} c="#0891b2" />
          <Box p={[-3.6, 0.8, 3.1]} s={[2.6, 0.7, 0.2]} c="#0e7490" />
          <Box p={[-3.6, 0.01, 1.7]} s={[3.6, 0.02, 2.4]} c={dark ? "#164e63" : "#a5f3fc"} cast={false} />
          <Plant p={[-5.7, 0, -3.4]} /><Plant p={[7.2, 0, -3.4]} />
        </>
      );
    case 2: // Studio Konten: ring light, kamera, backdrop
      return (
        <>
          <Box p={[5.8, 0.9, 1.8]} s={[0.06, 1.8, 0.06]} c="#94a3b8" />
          <mesh position={[5.8, 1.85, 1.8]} castShadow><torusGeometry args={[0.38, 0.05, 12, 28]} /><meshStandardMaterial color="#ffffff" emissive="#fff7d6" emissiveIntensity={1.2} /></mesh>
          <Box p={[5.8, 0.55, 0.7]} s={[0.05, 1.1, 0.05]} c="#94a3b8" />
          <Box p={[5.8, 1.2, 0.7]} s={[0.4, 0.28, 0.3]} c="#0f172a" />
          <Box p={[7.1, 1.5, -1.0]} s={[0.1, 3, 3.2]} c={dark ? "#b45309" : "#fcd34d"} />
          <Box p={[-5.6, 0.6, 2.4]} s={[1.2, 1.2, 1.2]} c="#64748b" /><Plant p={[-5.7, 0, -3.4]} />
        </>
      );
    case 3: // Riset & Analitik: dinding data, rak server
      return (
        <>
          {DESKS.filter((d) => d.floor === 3).map((d, i) => <Box key={i} p={[d.pos[0], 2.65, -3.9]} s={[2.3, 1.1, 0.08]} c="#0f172a" />)}
          {DESKS.filter((d) => d.floor === 3).map((d, i) => <Box key={"s" + i} p={[d.pos[0], 2.65, -3.85]} s={[2.15, 0.95, 0.02]} c={i % 2 ? "#8b5cf6" : "#10b981"} e={i % 2 ? "#8b5cf6" : "#10b981"} cast={false} />)}
          <Box p={[7.1, 1.0, -3.0]} s={[0.9, 2.0, 0.9]} c="#1e293b" /><Box p={[7.1, 1.4, -2.54]} s={[0.7, 0.08, 0.02]} c="#22c55e" e="#22c55e" cast={false} />
          <Plant p={[-5.7, 0, -3.4]} />
        </>
      );
    case 4: // Ruang Kontrol: layar kalender besar, meja rapat
      return (
        <>
          <Box p={[0.5, 2.55, -3.93]} s={[9, 2.1, 0.08]} c="#0f172a" />
          <Box p={[0.5, 2.55, -3.88]} s={[8.8, 1.9, 0.02]} c="#6366f1" e="#4f46e5" cast={false} />
          <Box p={[1, 0.72, 2.6]} s={[3.4, 0.1, 1.3]} c={dark ? "#8a6a45" : "#c89b6a"} />
          <Box p={[-0.2, 0.36, 2.6]} s={[0.1, 0.72, 0.9]} c="#475569" /><Box p={[2.2, 0.36, 2.6]} s={[0.1, 0.72, 0.9]} c="#475569" />
          {[-0.3, 1, 2.3].map((x) => <Box key={x} p={[x, 0.42, 3.55]} s={[0.55, 0.08, 0.5]} c="#1e293b" />)}
          <Plant p={[-5.7, 0, -3.4]} /><Plant p={[7.2, 0, 3.4]} />
        </>
      );
    default: // Lantai 5: lounge, kamar tidur, rooftop
      return (
        <>
          <Box p={[-3.4, 0.25, -3.5]} s={[3, 0.5, 0.9]} c="#7c3aed" />
          <Box p={[-3.4, 0.75, -3.85]} s={[3, 0.6, 0.25]} c="#6d28d9" />
          <Box p={[-4.85, 0.45, -3.5]} s={[0.25, 0.9, 0.9]} c="#6d28d9" />
          <Box p={[-1.95, 0.45, -3.5]} s={[0.25, 0.9, 0.9]} c="#6d28d9" />
          <Box p={[-3.4, 0.01, -1.4]} s={[3.4, 0.02, 2.2]} c={dark ? "#4c3d8f" : "#fca5a5"} cast={false} />
          <Box p={[-3.4, 0.25, -1.4]} s={[1.2, 0.08, 0.7]} c="#d6b88a" /><Box p={[-3.4, 0.12, -1.4]} s={[1.1, 0.24, 0.6]} c="#a07a4a" />
          <Box p={[-3.4, 2.0, -3.96]} s={[2.2, 1.2, 0.08]} c="#0f172a" /><Box p={[-3.4, 2.0, -3.9]} s={[2.06, 1.06, 0.02]} c="#38bdf8" e="#0ea5e9" cast={false} />
          <Plant p={[-5.4, 0, -3.4]} />
          <Label p={[-3.4, 2.3, -2.2]}>Lounge</Label>
          <Box p={[-1.1, 1.1, -2.4]} s={[0.12, 2.2, 3.2]} c={pal.wallSide} o={0.5} /><Box p={[3.9, 1.1, -2.4]} s={[0.12, 2.2, 3.2]} c={pal.wallSide} o={0.5} />
          {[0.2, 2.6].map((bx) => (
            <group key={bx}>
              <Box p={[bx, 0.25, -2.4]} s={[1.5, 0.5, 2.7]} c="#475569" /><Box p={[bx, 0.55, -2.4]} s={[1.4, 0.14, 2.6]} c="#f1f5f9" />
              <Box p={[bx, 0.72, -3.35]} s={[0.9, 0.18, 0.5]} c="#e2e8f0" /><Box p={[bx, 0.9, -3.9]} s={[1.6, 1.3, 0.1]} c="#92400e" />
            </group>
          ))}
          <Box p={[1.4, 0.3, -3.5]} s={[0.4, 0.6, 0.5]} c="#92400e" /><Box p={[1.4, 0.9, -3.5]} s={[0.1, 0.4, 0.1]} c="#fde68a" e="#fbbf24" cast={false} />
          <Label p={[1.4, 2.4, -2.2]}>Kamar Tidur</Label>
          {/* dek rooftop */}
          <Box p={[(BALCONY.minX + BALCONY.maxX) / 2, -0.15, (BALCONY.minZ + BALCONY.maxZ) / 2]} s={[BALCONY.maxX - BALCONY.minX, 0.3, BALCONY.maxZ - BALCONY.minZ]} c={dark ? "#3a4a52" : "#b9a88a"} />
          <Box p={[6.1, 0.5, 6]} s={[3.8, 0.05, 0.05]} c="#94a3b8" cast={false} /><Box p={[8, 0.5, 1]} s={[0.05, 0.05, 10]} c="#94a3b8" cast={false} /><Box p={[4.2, 0.5, 5]} s={[0.05, 0.05, 2]} c="#94a3b8" cast={false} />
          <Box p={[6.1, 0.25, 6]} s={[3.8, 0.03, 0.03]} c="#94a3b8" cast={false} /><Box p={[8, 0.25, 1]} s={[0.03, 0.03, 10]} c="#94a3b8" cast={false} />
          <Plant p={[7.4, 0, 4.5]} /><Plant p={[4.8, 0, 4.5]} />
          <Box p={[6.2, 0.3, 4.3]} s={[1.6, 0.04, 1.0]} c="#0ea5e9" cast={false} />
          <Label p={[6.1, 2.0, 4.6]}>Rooftop</Label>
        </>
      );
  }
}

export function Office({ theme }: { theme: Theme }) {
  const dark = theme === "dark";
  const agents = useMissionStore((s) => s.agents);
  const focus = useMissionStore((s) => s.focus);
  const pointLights = useMissionStore((s) => QUALITY[s.quality].pointLights);
  const decor = useMissionStore((s) => QUALITY[s.quality].decor);
  const pal: Pal = {
    dark, floor: dark ? "#53628c" : "#f1e7d3", wallSide: dark ? "#4a5a8a" : "#e2e8f0", desk: dark ? "#8a6a45" : "#c89b6a",
    glass: dark ? "#7dd3fc" : "#bae6fd", glassE: dark ? "#38bdf8" : undefined,
  };
  const wall = dark ? "#34426b" : "#f8fafc";
  const top = focus === "all" ? FLOORS : Number(focus);        // jumlah lantai yang digambar
  const floors = Array.from({ length: top }, (_, i) => i + 1);

  return (
    <group>
      {/* dinding belakang / kiri / kanan (cutaway: depan terbuka); tinggi mengikuti lantai yang tampil */}
      <Box p={[0, (top * H) / 2, -4.1]} s={[16.4, top * H + 0.2, 0.2]} c={wall} />
      <Box p={[-8.1, (top * H) / 2, 0]} s={[0.2, top * H + 0.2, 8.4]} c={pal.wallSide} o={0.55} />
      <Box p={[8.1, (Math.min(top, FLOORS - 1) * H) / 2, 0]} s={[0.2, Math.min(top, FLOORS - 1) * H, 8.4]} c={pal.wallSide} o={0.55} />

      {floors.filter((n) => floorVisible(focus, n)).map((n) => {
        const info = FLOOR_INFO[n - 1];
        return (
          <group key={n} position={[0, floorY(n), 0]}>
            {/* lantai (slab): lantai 1 = dasar penuh; lantai atas tanpa lubang tangga + bordes di sisi tiba */}
            {n === 1 ? <Box p={[0, -0.15, 0]} s={[16.4, 0.3, 8.4]} c={dark ? "#475577" : "#e7dcc8"} cast /> : (
              <>
                <Box p={[1, -0.15, 0]} s={[14, 0.3, 8]} c={pal.floor} cast />
                <Box p={[-7, -0.15, landingZ(n)]} s={[2, 0.3, 2]} c={pal.floor} cast />
              </>
            )}
            {/* aksen warna lantai + jendela dinding belakang */}
            <Box p={[0, 0.1, -3.96]} s={[16, 0.14, 0.05]} c={info.accent} e={info.accent} cast={false} />
            {n <= 4 && <><Box p={[3.2, 2.3, -3.98]} s={[3, 1.4, 0.06]} c={pal.glass} e={pal.glassE} cast={false} /><Box p={[-1.2, 2.3, -3.98]} s={[3, 1.4, 0.06]} c={pal.glass} e={pal.glassE} cast={false} /></>}
            {/* meja kerja lantai ini */}
            {DESKS.map((d, i) => {
              if (d.floor !== n) return null;
              const a = agents.find((x) => x.deskIndex % DESKS.length === i && x.status === "working") ?? agents.find((x) => x.deskIndex % DESKS.length === i);
              return <Desk key={i} x={d.pos[0]} z={d.pos[2] - 1.1} color={pal.desk} agentColor={a?.color ?? "#64748b"} active={a?.status === "working"} />;
            })}
            {(decor || n === FLOORS) && <FloorProps n={n} pal={pal} />}
            {n < FLOORS && top > n && <Flight k={n} />}
            <Label p={[0, 0.5, 4.7]}>Lantai {n} · {info.name}</Label>
            {pointLights && <pointLight position={[0, 3.2, 0]} intensity={dark ? 16 : 3.5} color={n === 5 ? "#fbbf24" : "#e0f2fe"} distance={12} />}
          </group>
        );
      })}
    </group>
  );
}
