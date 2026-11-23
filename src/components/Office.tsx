"use client";
import { Html } from "@react-three/drei";
import { BED_X, BED_Z, B_CX, B_D, B_W, DESKS, DESK_COLS, DESK_ROWS, FLOOR_H, POOL, ZONES, zoneById } from "@/lib/layout";
import type { Theme } from "@/store/useMissionStore";
import { useMissionStore } from "@/store/useMissionStore";
import { QUALITY } from "@/lib/quality";
import { Box, BarStool, CurvedMonitor, DiningChair, ErgoChair, HangingPlant, Led, Plant, Shelf, Sofa, WallScreen, type V3 } from "./props";

const H = FLOOR_H;

interface Pal {
  dark: boolean; wall: string; wallSide: string; floor: string; edge: string; desk: string; glass: string; glassE: string;
  rug: string; wood: string; sofa: string; neonA: string; neonB: string; plinth: string;
}
const LIGHT: Pal = { dark: false, wall: "#f6f7f9", wallSide: "#eef0f4", floor: "#ebedf1", edge: "#cdd2da", desk: "#ffffff", glass: "#dff0ff", glassE: "#a9d4f7", rug: "#c9d1de", wood: "#d9c7a3", sofa: "#9aa6b8", neonA: "#38bdf8", neonB: "#22c55e", plinth: "#59606d" };
const DARK: Pal = { dark: true, wall: "#3b4766", wallSide: "#44506f", floor: "#34405e", edge: "#242c44", desk: "#dfe4ec", glass: "#17314f", glassE: "#38bdf8", rug: "#1c2842", wood: "#6b5a45", sofa: "#586377", neonA: "#38bdf8", neonB: "#34d399", plinth: "#10162a" };

function Label({ p, children }: { p: V3; children: React.ReactNode }) {
  const focused = useMissionStore((s) => s.focus !== "all"); // di tampilan "Semua" label ruangan disembunyikan agar tidak ramai
  if (!focused) return null;
  return (
    <Html position={p} center distanceFactor={20} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div className="whitespace-nowrap rounded-md bg-slate-900/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">{children}</div>
    </Html>
  );
}

/** Meja panjang putih + monitor lengkung + kursi ergonomis */
function Desk({ x, z, pal, agentColor, active, glow, seed }: { x: number; z: number; pal: Pal; agentColor: string; active: boolean; glow: boolean; seed: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0.75, 0]} s={[2.22, 0.06, 0.98]} c={pal.desk} cast />
      <Box p={[-1.07, 0.37, 0]} s={[0.05, 0.74, 0.86]} c="#aeb6c3" /><Box p={[1.07, 0.37, 0]} s={[0.05, 0.74, 0.86]} c="#aeb6c3" />
      <Led p={[0, 0.69, 0.47]} s={[2.1, 0.02, 0.02]} c={pal.neonA} glow={glow} />
      <CurvedMonitor p={[0, 0.78, -0.27]} active={active} color={agentColor} seed={seed} />
      <Box p={[0, 0.8, 0.13]} s={[0.5, 0.02, 0.17]} c="#e5e7eb" /><Box p={[0.45, 0.8, 0.14]} s={[0.06, 0.02, 0.1]} c="#e5e7eb" />
      <ErgoChair p={[0, 0, 1.0]} />
    </group>
  );
}

/** Lantai berwarna per zona (menggantikan dinding sekat agar tampilan tetap lapang) */
function ZoneFloor({ id, color }: { id: string; color: string }) {
  const z = ZONES.find((q) => q.id === id)!;
  return <Box p={[(z.x0 + z.x1) / 2, 0.012, (z.z0 + z.z1) / 2]} s={[z.x1 - z.x0, 0.02, z.z1 - z.z0]} c={color} />;
}

function WorkZone({ pal, glow, agents }: { pal: Pal; glow: boolean; agents: ReturnType<typeof useMissionStore.getState>["agents"] }) {
  return (
    <>
      {DESKS.map((d, i) => {
        const a = agents.find((x) => x.deskIndex % DESKS.length === i && x.status === "working") ?? agents.find((x) => x.deskIndex % DESKS.length === i);
        return <Desk key={i} x={d.pos[0]} z={d.pos[2] - 1.1} pal={pal} agentColor={a?.color ?? "#64748b"} active={a?.status === "working"} glow={glow} seed={i + 1} />;
      })}
      <WallScreen p={[-5, 2.9, -6.9]} w={3.8} h={1.5} kind="code" seed={2} /><WallScreen p={[0.2, 2.9, -6.9]} w={3.8} h={1.5} kind="chart" seed={3} /><WallScreen p={[5.4, 2.9, -6.9]} w={3.8} h={1.5} kind="dash" seed={5} />
      {/* meja berdiri kolaboratif */}
      <Box p={[8.8, 1.05, 6.2]} s={[2.2, 0.06, 0.9]} c={pal.desk} cast /><Box p={[7.9, 0.52, 6.2]} s={[0.05, 1.04, 0.7]} c="#aeb6c3" /><Box p={[9.7, 0.52, 6.2]} s={[0.05, 1.04, 0.7]} c="#aeb6c3" />
      <Led p={[8.8, 0.99, 6.66]} s={[2.1, 0.02, 0.02]} c={pal.neonB} glow={glow} />
      <BarStool p={[8.2, 0, 7.0]} /><BarStool p={[9.4, 0, 7.0]} />
      <Box p={[9.9, 1.0, -6.3]} s={[0.9, 2.0, 0.9]} c="#1e293b" cast /><Led p={[9.9, 1.4, -5.83]} s={[0.7, 0.06, 0.02]} c={pal.neonB} glow={glow} /><Led p={[9.9, 1.0, -5.83]} s={[0.7, 0.06, 0.02]} c={pal.neonA} glow={glow} />
      <Plant p={[-9.6, 0, -6.3]} big /><Plant p={[-9.6, 0, 6.3]} big /><Plant p={[10.0, 0, 6.3]} big /><HangingPlant p={[-8.2, 2.6, -6.7]} />
      <Label p={[0, 0.6, 7.4]}>Area Kerja · 14 Divisi</Label>
    </>
  );
}

function MeetingRoom({ pal }: { pal: Pal }) {
  const xs = [-14.3, -13.2, -12.1];
  return (
    <>
      <ZoneFloor id="meet" color={pal.dark ? "#2b3552" : "#dfe3ee"} />
      <Box p={[-10.4, 1.3, -4.7]} s={[0.08, 2.6, 4.6]} c={pal.glass} o={0.4} /><Box p={[-13.2, 1.3, -0.4]} s={[5.6, 2.6, 0.08]} c={pal.glass} o={0.4} />
      <Box p={[-13.2, 0.74, -3.7]} s={[3.6, 0.07, 1.4]} c={pal.wood} cast /><Box p={[-14.6, 0.36, -3.7]} s={[0.1, 0.72, 1.0]} c="#aeb6c3" /><Box p={[-11.8, 0.36, -3.7]} s={[0.1, 0.72, 1.0]} c="#aeb6c3" />
      {xs.map((x) => <group key={x}><DiningChair p={[x, 0, -5.2]} rotY={0} /><DiningChair p={[x, 0, -2.2]} rotY={Math.PI} /></group>)}
      <WallScreen p={[-13.2, 2.3, -6.9]} w={3.6} h={1.6} kind="dash" seed={11} />
      <Plant p={[-15.4, 0, -6.2]} big />
      <Label p={[-13.2, 2.9, -3.7]}>Ruang Rapat</Label>
    </>
  );
}

function Lobby({ pal, glow }: { pal: Pal; glow: boolean }) {
  return (
    <>
      <ZoneFloor id="lobby" color={pal.dark ? "#2a3a4c" : "#e1ecf2"} />
      <Box p={[-13.2, 0.55, 5.6]} s={[3.4, 1.1, 0.8]} c={pal.dark ? "#cfd6e2" : "#ffffff"} cast /><Box p={[-13.2, 1.14, 5.6]} s={[3.5, 0.06, 0.9]} c={pal.wood} />
      <Led p={[-13.2, 0.5, 5.2]} s={[3.2, 0.06, 0.03]} c={pal.neonA} glow={glow} />
      <Box p={[-13.2, 2.4, 6.9]} s={[2.4, 0.5, 0.05]} c="#06b6d4" e="#06b6d4" ei={0.8} />
      <Box p={[-13.5, 0.01, 1.8]} s={[4, 0.02, 2.6]} c={pal.rug} /><Sofa p={[-13.5, 0, 1.1]} n={3} color={pal.sofa} />
      <Box p={[-13.5, 0.22, 2.4]} s={[1.3, 0.08, 0.7]} c={pal.wood} /><Box p={[-13.5, 0.1, 2.4]} s={[1.1, 0.2, 0.5]} c="#9ca3af" />
      <Plant p={[-15.4, 0, 0.7]} big /><Plant p={[-15.4, 0, 6.3]} /><HangingPlant p={[-15.2, 2.7, 3.5]} />
      <Label p={[-13.2, 2.9, 3.5]}>Lobi & Resepsionis</Label>
    </>
  );
}

function Lounge({ pal, glow }: { pal: Pal; glow: boolean }) {
  return (
    <>
      <ZoneFloor id="lounge" color={pal.dark ? "#33284f" : "#e8e1f2"} />
      <Box p={[15.4, 0.014, -4.4]} s={[6.4, 0.02, 4.6]} c={pal.rug} />
      <Sofa p={[15.4, 0, -2.7]} n={3} color={pal.sofa} rotY={Math.PI} />
      <Sofa p={[12.0, 0, -4.4]} n={1} color={pal.sofa} rotY={Math.PI / 2} /><Sofa p={[18.8, 0, -4.4]} n={1} color={pal.sofa} rotY={-Math.PI / 2} />
      <Box p={[15.4, 0.24, -4.6]} s={[1.6, 0.08, 0.9]} c={pal.wood} /><Box p={[15.4, 0.11, -4.6]} s={[1.4, 0.22, 0.7]} c="#9ca3af" />
      <WallScreen p={[15.4, 2.3, -6.9]} w={4.2} h={2.1} kind="chart" seed={13} />
      <Shelf p={[11.6, 0, -6.6]} w={2.2} /><Shelf p={[19.2, 0, -6.6]} w={1.6} />
      <Box p={[18.9, 0.8, -1.2]} s={[0.05, 1.6, 0.05]} c="#9ca3af" /><Box p={[18.9, 1.65, -1.2]} s={[0.4, 0.1, 0.4]} c="#fde68a" e="#fbbf24" ei={1.2} />
      <Led p={[15.4, 0.06, -6.9]} s={[8.8, 0.05, 0.03]} c="#a855f7" glow={glow} />
      <Plant p={[11.2, 0, -1.0]} big /><Plant p={[19.4, 0, -6.2]} />
      <Label p={[15.4, 2.9, -3.6]}>Ruang Duduk</Label>
    </>
  );
}

function Pantry({ pal, glow }: { pal: Pal; glow: boolean }) {
  return (
    <>
      <ZoneFloor id="pantry" color={pal.dark ? "#4a3d2c" : "#efe2c8"} />
      {/* meja makan 4 kursi */}
      <Box p={[14.6, 0.74, 4.6]} s={[3.2, 0.07, 1.3]} c={pal.wood} cast /><Box p={[13.2, 0.36, 4.6]} s={[0.1, 0.72, 1.0]} c="#aeb6c3" /><Box p={[16.0, 0.36, 4.6]} s={[0.1, 0.72, 1.0]} c="#aeb6c3" />
      {[13.6, 15.6].map((x) => <group key={x}><DiningChair p={[x, 0, 3.4]} rotY={0} color="#c9b48a" /><DiningChair p={[x, 0, 5.8]} rotY={Math.PI} color="#c9b48a" /></group>)}
      {/* bar kopi */}
      <Box p={[18.2, 0.55, 0.9]} s={[3.2, 1.1, 0.8]} c={pal.dark ? "#cfd6e2" : "#ffffff"} cast /><Box p={[18.2, 1.14, 0.9]} s={[3.3, 0.06, 0.9]} c={pal.wood} />
      <Led p={[18.2, 0.5, 1.32]} s={[3.0, 0.05, 0.03]} c={pal.neonB} glow={glow} />
      <Box p={[17.4, 1.45, 0.9]} s={[0.5, 0.6, 0.4]} c="#111827" /><Led p={[17.4, 1.5, 1.12]} s={[0.3, 0.06, 0.02]} c="#f59e0b" glow={glow} />
      <BarStool p={[17.2, 0, 2.0]} /><BarStool p={[18.2, 0, 2.0]} /><BarStool p={[19.2, 0, 2.0]} />
      <Box p={[19.6, 1.0, 6.4]} s={[0.9, 2.0, 0.7]} c="#cbd5e1" cast /><Box p={[19.6, 1.5, 6.04]} s={[0.04, 0.5, 0.02]} c="#64748b" />
      <Plant p={[11.3, 0, 6.3]} big /><Plant p={[11.3, 0, 0.8]} /><HangingPlant p={[11.2, 2.6, 3.5]} />
      <Label p={[15.4, 2.6, 3.5]}>Pantry & Kafe</Label>
    </>
  );
}

/** Ruang billiard: meja, rak tongkat, papan dart, bar mini, lampu gantung neon */
function PoolRoom({ pal, glow }: { pal: Pal; glow: boolean }) {
  const { x: tx, z: tz } = POOL, wood = pal.dark ? "#5a4636" : "#8a5a2b";
  const balls = ["#facc15", "#3b82f6", "#ef4444", "#7c3aed", "#f97316", "#16a34a", "#92400e", "#111827", "#f8fafc"];
  return (
    <>
      <ZoneFloor id="pool" color={pal.dark ? "#1a2a2a" : "#7b8794"} />
      <Box p={[tx, 0.82, tz]} s={[3.2, 0.16, 1.8]} c={wood} cast /><Box p={[tx, 0.91, tz]} s={[2.8, 0.03, 1.4]} c={pal.dark ? "#0f5a3a" : "#16a34a"} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => <Box key={a + "" + b} p={[tx + a * 1.4, 0.4, tz + b * 0.75]} s={[0.22, 0.8, 0.22]} c={wood} />)}
      {[[-1.4, -0.7], [0, -0.7], [1.4, -0.7], [-1.4, 0.7], [0, 0.7], [1.4, 0.7]].map(([a, b], i) => <Box key={i} p={[tx + a, 0.94, tz + b]} s={[0.17, 0.02, 0.17]} c="#0b0b0b" />)}
      {balls.map((c, i) => <mesh key={i} position={[tx + 0.5 + (i % 3) * 0.13, 0.97, tz - 0.13 + Math.floor(i / 3) * 0.13]}><sphereGeometry args={[0.055, 10, 8]} /><meshStandardMaterial color={c} roughness={0.35} /></mesh>)}
      <mesh position={[tx - 0.7, 0.97, tz]}><sphereGeometry args={[0.055, 10, 8]} /><meshStandardMaterial color="#ffffff" roughness={0.35} /></mesh>
      <Box p={[tx, 2.7, tz]} s={[2.6, 0.08, 0.5]} c="#111827" /><Led p={[tx, 2.65, tz]} s={[2.5, 0.03, 0.4]} c="#fde68a" glow={glow} />
      <Box p={[tx - 1.2, 2.1, tz]} s={[0.02, 1.2, 0.02]} c="#64748b" /><Box p={[tx + 1.2, 2.1, tz]} s={[0.02, 1.2, 0.02]} c="#64748b" />
      <Box p={[29.6, 1.1, -5.0]} s={[0.12, 1.5, 0.5]} c={wood} />{[0, 1, 2].map((i) => <Box key={i} p={[29.5, 1.1, -5.2 + i * 0.2]} s={[0.04, 1.4, 0.04]} c="#d6c7a8" />)}
      <mesh position={[27.4, 2.2, -6.93]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.34, 0.34, 0.05, 20]} /><meshStandardMaterial color="#111827" emissive="#ef4444" emissiveIntensity={0.45} /></mesh>
      <Box p={[22.6, 2.4, -6.9]} s={[2.2, 0.55, 0.05]} c="#ec4899" e="#ec4899" ei={0.9} />
      <Box p={[28.6, 0.55, -1.0]} s={[2.0, 1.1, 0.7]} c={wood} cast /><BarStool p={[28.0, 0, -0.1]} /><BarStool p={[29.2, 0, -0.1]} />
      <Plant p={[21.0, 0, -6.2]} big /><Plant p={[29.4, 0, -6.4]} />
      <Label p={[tx, 3.2, tz]}>Ruang Billiard</Label>
    </>
  );
}

function Bedroom({ pal }: { pal: Pal }) {
  const wood = pal.wood;
  return (
    <>
      <ZoneFloor id="bed" color={pal.dark ? "#3a2f45" : "#efe3ea"} />
      <Box p={[25.2, 0.014, 3.8]} s={[8.6, 0.02, 5.4]} c={pal.rug} />
      {BED_X.map((bx) => (
        <group key={bx}>
          <Box p={[bx, 0.2, BED_Z]} s={[1.55, 0.4, 2.75]} c={wood} /><Box p={[bx, 0.5, BED_Z]} s={[1.45, 0.16, 2.6]} c="#f8fafc" />
          <Box p={[bx, 0.68, BED_Z - 0.95]} s={[0.9, 0.18, 0.5]} c="#e2e8f0" /><Box p={[bx, 0.95, BED_Z - 1.42]} s={[1.65, 1.4, 0.08]} c={wood} />
          <Box p={[bx + 1.05, 0.3, BED_Z - 1.2]} s={[0.4, 0.6, 0.4]} c={wood} /><Box p={[bx + 1.05, 0.78, BED_Z - 1.2]} s={[0.1, 0.4, 0.1]} c="#fde68a" e="#fbbf24" ei={1.2} />
        </group>
      ))}
      <Box p={[29.4, 1.2, 6.6]} s={[1.4, 2.4, 0.6]} c={wood} cast /><Plant p={[21.0, 0, 6.3]} big /><Plant p={[29.4, 0, 1.0]} />
      <Box p={[20.45, 1.3, 3.5]} s={[0.06, 2.6, 7]} c={pal.glass} o={0.3} />
      <Label p={[25.2, 2.6, 3.6]}>Kamar Tidur</Label>
    </>
  );
}

export function Office({ theme }: { theme: Theme }) {
  const pal = theme === "dark" ? DARK : LIGHT;
  const agents = useMissionStore((s) => s.agents);
  const pointLights = useMissionStore((s) => QUALITY[s.quality].pointLights);
  const decor = useMissionStore((s) => QUALITY[s.quality].decor);
  const glow = useMissionStore((s) => QUALITY[s.quality].glow);

  return (
    <group>
      {/* dinding belakang & kiri opak; sisi kanan/depan terbuka (potongan isometrik) */}
      <Box p={[B_CX, H / 2, -7.1]} s={[B_W + 0.4, H + 0.2, 0.2]} c={pal.wall} />
      <Box p={[-16.1, H / 2, 0]} s={[0.2, H + 0.2, B_D + 0.4]} c={pal.wallSide} />
      <Box p={[B_CX, -0.5, 0]} s={[B_W + 0.8, 0.3, B_D + 0.8]} c={pal.plinth} />
      {/* lantai + tepi depan */}
      <Box p={[B_CX, -0.17, 0]} s={[B_W + 0.4, 0.34, B_D + 0.4]} c={pal.floor} cast />
      <Box p={[B_CX, -0.17, 7.22]} s={[B_W + 0.4, 0.34, 0.04]} c={pal.edge} />
      {/* LED neon di dasar & cove atas dinding */}
      <Led p={[B_CX, 0.1, -6.95]} s={[B_W - 0.1, 0.06, 0.05]} c="#38bdf8" glow={glow} />
      <Led p={[-15.95, 0.1, 0]} s={[0.05, 0.06, B_D - 0.1]} c="#38bdf8" glow={glow} />
      <Led p={[B_CX, H - 0.22, -6.94]} s={[B_W - 0.1, 0.05, 0.05]} c={pal.neonA} glow={glow} />
      {/* jendela besar: dinding kiri + dinding belakang */}
      {[-4.6, -1.5, 1.6, 4.7].map((z) => <Box key={z} p={[-15.97, 2.0, z]} s={[0.05, 2.2, 2.7]} c={pal.glass} e={pal.glassE} ei={pal.dark ? 0.9 : 0.55} />)}
      {[-14, -8, 12.4, 18.6, 24, 28.4].map((x) => <Box key={x} p={[x, 2.1, -6.97]} s={[3.2, 1.3, 0.05]} c={pal.glass} e={pal.glassE} ei={pal.dark ? 0.9 : 0.5} />)}

      <WorkZone pal={pal} glow={glow && decor} agents={agents} />
      {decor && (
        <>
          <MeetingRoom pal={pal} /><Lobby pal={pal} glow={glow} /><Lounge pal={pal} glow={glow} />
          <Pantry pal={pal} glow={glow} /><PoolRoom pal={pal} glow={glow} /><Bedroom pal={pal} />
        </>
      )}
      {pointLights && ZONES.map((z) => <pointLight key={z.id} position={[(z.x0 + z.x1) / 2, 3.4, (z.z0 + z.z1) / 2]} intensity={pal.dark ? 14 : 3} color={z.id === "bed" || z.id === "lounge" ? "#fde8c8" : "#e8f3ff"} distance={14} />)}
    </group>
  );
}
