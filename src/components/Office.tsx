"use client";
import { Html } from "@react-three/drei";
import { B_CX, B_W, BALCONY, BILLIARD, DESKS, FLOORS, FLOOR_H, FLOOR_INFO, STAIR_X, floorVisible, flightEndZ, flightStartZ, floorY, landingZ } from "@/lib/layout";
import type { Theme } from "@/store/useMissionStore";
import { useMissionStore } from "@/store/useMissionStore";
import { QUALITY } from "@/lib/quality";
import { Box, BarStool, CurvedMonitor, ErgoChair, HangingPlant, Led, Plant, Sofa, WallScreen, type V3 } from "./props";

const H = FLOOR_H;

interface Pal {
  dark: boolean; wall: string; wallSide: string; floor: string; floorG: string; edge: string; desk: string; glass: string; glassE: string;
  rug: string; wood: string; sofa: string; neonA: string; neonB: string; stair: string; stair2: string;
}
const LIGHT: Pal = { dark: false, wall: "#f6f7f9", wallSide: "#eef0f4", floor: "#ebedf1", floorG: "#e3e6ec", edge: "#cdd2da", desk: "#ffffff", glass: "#dff0ff", glassE: "#a9d4f7", rug: "#c9d1de", wood: "#d9c7a3", sofa: "#9aa6b8", neonA: "#38bdf8", neonB: "#22c55e", stair: "#e5e7eb", stair2: "#f3f4f6" };
const DARK: Pal = { dark: true, wall: "#3b4766", wallSide: "#44506f", floor: "#34405e", floorG: "#2f3a56", edge: "#242c44", desk: "#dfe4ec", glass: "#17314f", glassE: "#38bdf8", rug: "#1c2842", wood: "#6b5a45", sofa: "#586377", neonA: "#38bdf8", neonB: "#34d399", stair: "#9aa5b8", stair2: "#b4bdcc" };

/** Tangga k: lantai k -> k+1 (koordinat lokal grup lantai k). Anak tangga tipis + penyangga miring + pegangan. */
function Flight({ k, pal }: { k: number; pal: Pal }) {
  const n = 22, zs = flightStartZ(k), ze = flightEndZ(k), dz = (ze - zs) / n;
  const len = Math.hypot(H, ze - zs), tilt = -Math.atan(H / (ze - zs));
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <Box key={i} p={[STAIR_X, ((i + 1) * H) / n - 0.1, zs + (i + 0.5) * dz]} s={[1.1, 0.2, Math.abs(dz) + 0.02]} c={i % 2 ? pal.stair : pal.stair2} />
      ))}
      <Box p={[STAIR_X, H / 2 - 0.35, (zs + ze) / 2]} s={[0.9, 0.2, len]} c="#8b95a7" r={[tilt, 0, 0]} />
      <Box p={[-7.6, H / 2 + 0.7, (zs + ze) / 2]} s={[0.05, 0.05, len]} c="#b6bfcd" r={[tilt, 0, 0]} />
    </group>
  );
}

function Label({ p, children }: { p: V3; children: React.ReactNode }) {
  const focused = useMissionStore((s) => s.focus !== "all"); // di tampilan "Semua" label ruangan disembunyikan agar tidak ramai
  if (!focused) return null;
  return (
    <Html position={p} center distanceFactor={20} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div className="whitespace-nowrap rounded-md bg-slate-900/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">{children}</div>
    </Html>
  );
}

/** Meja panjang putih (tiap meja = satu segmen bangku) + monitor lengkung + kursi ergonomis */
function Desk({ x, z, pal, agentColor, active, glow, seed, last }: { x: number; z: number; pal: Pal; agentColor: string; active: boolean; glow: boolean; seed: number; last: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0.75, 0]} s={[2.22, 0.06, 0.98]} c={pal.desk} cast />
      <Box p={[-1.07, 0.37, 0]} s={[0.05, 0.74, 0.86]} c="#aeb6c3" /><Box p={[1.07, 0.37, 0]} s={[0.05, 0.74, 0.86]} c="#aeb6c3" />
      <Led p={[0, 0.69, 0.47]} s={[2.1, 0.02, 0.02]} c={pal.neonA} glow={glow} />
      <CurvedMonitor p={[0, 0.78, -0.27]} active={active} color={agentColor} seed={seed} />
      <Box p={[0, 0.8, 0.13]} s={[0.5, 0.02, 0.17]} c="#e5e7eb" /><Box p={[0.45, 0.8, 0.14]} s={[0.06, 0.02, 0.1]} c="#e5e7eb" />
      <ErgoChair p={[0, 0, 1.0]} />
      {last && (<><Box p={[1.42, 0.34, -0.1]} s={[0.32, 0.62, 0.52]} c="#111827" /><Led p={[1.42, 0.34, 0.17]} s={[0.04, 0.5, 0.02]} c={pal.neonB} glow={glow} /></>)}
    </group>
  );
}

/** Ruang billiard (sayap kanan lantai 2): meja biliar, rak tongkat, papan dart, bar mini, lampu gantung neon */
function BilliardRoom({ pal, glow }: { pal: Pal; glow: boolean }) {
  const [tx, tz] = BILLIARD.table, wood = pal.dark ? "#5a4636" : "#8a5a2b";
  const balls = ["#facc15", "#3b82f6", "#ef4444", "#7c3aed", "#f97316", "#16a34a", "#92400e", "#111827", "#f8fafc"];
  return (
    <group>
      <Box p={[(BILLIARD.minX + BILLIARD.maxX) / 2, 0.012, 0]} s={[BILLIARD.maxX - BILLIARD.minX, 0.02, 8]} c={pal.dark ? "#1a2a2a" : "#6b7280"} />
      <Box p={[BILLIARD.minX - 0.2, 1.1, -2.4]} s={[0.1, 2.2, 3.2]} c={pal.glass} o={0.4} />
      <Box p={[tx, 0.82, tz]} s={[3.2, 0.16, 1.8]} c={wood} cast />
      <Box p={[tx, 0.91, tz]} s={[2.8, 0.03, 1.4]} c={pal.dark ? "#0f5a3a" : "#16a34a"} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => <Box key={a + "" + b} p={[tx + a * 1.4, 0.4, tz + b * 0.75]} s={[0.22, 0.8, 0.22]} c={wood} />)}
      {[[-1.4, -0.7], [0, -0.7], [1.4, -0.7], [-1.4, 0.7], [0, 0.7], [1.4, 0.7]].map(([a, b], i) => <Box key={i} p={[tx + a, 0.94, tz + b]} s={[0.17, 0.02, 0.17]} c="#0b0b0b" />)}
      {balls.map((c, i) => <mesh key={i} position={[tx + 0.5 + (i % 3) * 0.13, 0.97, tz - 0.13 + Math.floor(i / 3) * 0.13]}><sphereGeometry args={[0.055, 10, 8]} /><meshStandardMaterial color={c} roughness={0.35} /></mesh>)}
      <mesh position={[tx - 0.7, 0.97, tz]}><sphereGeometry args={[0.055, 10, 8]} /><meshStandardMaterial color="#ffffff" roughness={0.35} /></mesh>
      <Box p={[tx, 2.55, tz]} s={[2.6, 0.08, 0.5]} c="#111827" /><Led p={[tx, 2.5, tz]} s={[2.5, 0.03, 0.4]} c="#fde68a" glow={glow} />
      <Box p={[tx - 1.2, 2.0, tz]} s={[0.02, 1.1, 0.02]} c="#64748b" /><Box p={[tx + 1.2, 2.0, tz]} s={[0.02, 1.1, 0.02]} c="#64748b" />
      <Box p={[13.8, 1.1, -2.6]} s={[0.12, 1.5, 0.5]} c={wood} />{[0, 1, 2].map((i) => <Box key={i} p={[13.7, 1.1, -2.8 + i * 0.2]} s={[0.04, 1.4, 0.04]} c="#d6c7a8" />)}
      <mesh position={[12.4, 2.1, -3.93]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.32, 0.32, 0.05, 20]} /><meshStandardMaterial color="#111827" emissive="#ef4444" emissiveIntensity={0.45} /></mesh>
      <Box p={[10.4, 1.5, -3.92]} s={[1.8, 0.5, 0.05]} c="#ec4899" e="#ec4899" ei={0.9} />
      <Box p={[13.4, 0.55, 2.8]} s={[1.0, 1.1, 0.7]} c={wood} cast /><BarStool p={[12.4, 0, 3.2]} /><BarStool p={[13.4, 0, 3.4]} />
      <Plant p={[8.8, 0, -3.4]} big /><Plant p={[13.5, 0, -3.4]} />
      <Label p={[11.2, 2.9, 0.4]}>Billiard</Label>
    </group>
  );
}

/** Perabot khas tiap lantai (koordinat lokal; y=0 adalah lantai) */
function FloorProps({ n, pal, glow }: { n: number; pal: Pal; glow: boolean }) {
  const { dark } = pal;
  const white = dark ? "#cfd6e2" : "#ffffff";
  switch (n) {
    case 1: // Area kerja semua divisi: layar dinding di atas baris belakang, tanaman, label kelompok divisi
      return (
        <>
          <WallScreen p={[-3.4, 3.0, -3.9]} w={3.2} h={1.25} kind="code" seed={2} /><WallScreen p={[0.3, 3.0, -3.9]} w={3.2} h={1.25} kind="chart" seed={3} /><WallScreen p={[4.0, 3.0, -3.9]} w={3.2} h={1.25} kind="dash" seed={5} />
          <Plant p={[-6.4, 0, -3.4]} big /><Plant p={[7.5, 0, -3.4]} big /><Plant p={[7.5, 0, 3.5]} /><HangingPlant p={[7.0, 2.7, -3.7]} />
          {/* sayap kanan: pantry kopi + lounge tamu + rak pajangan */}
          <Box p={[11.2, 0.55, -3.3]} s={[4.6, 1.1, 0.8]} c={white} cast /><Box p={[11.2, 1.14, -3.3]} s={[4.7, 0.06, 0.9]} c={pal.wood} />
          <Led p={[11.2, 0.45, -2.88]} s={[4.4, 0.05, 0.03]} c={pal.neonB} glow={glow} />
          <Box p={[9.6, 1.45, -3.4]} s={[0.5, 0.6, 0.4]} c="#111827" /><Led p={[9.6, 1.5, -3.18]} s={[0.3, 0.06, 0.02]} c="#f59e0b" glow={glow} />
          <Box p={[13.3, 1.0, -3.55]} s={[0.9, 2.0, 0.7]} c="#cbd5e1" cast /><Box p={[13.3, 1.5, -3.19]} s={[0.04, 0.5, 0.02]} c="#64748b" />
          <BarStool p={[10.2, 0, -2.5]} /><BarStool p={[11.2, 0, -2.5]} /><BarStool p={[12.2, 0, -2.5]} />
          <WallScreen p={[11.2, 3.3, -3.9]} w={3.6} h={1.1} kind="dash" seed={9} />
          <Box p={[11.2, 0.01, 1.8]} s={[5, 0.02, 3.2]} c={pal.rug} /><Sofa p={[11.2, 0, 3.0]} n={3} color={pal.sofa} rotY={Math.PI} />
          <Sofa p={[9.2, 0, 1.4]} n={1} color={pal.sofa} rotY={Math.PI / 2} /><Sofa p={[13.2, 0, 1.4]} n={1} color={pal.sofa} rotY={-Math.PI / 2} />
          <Box p={[11.2, 0.24, 1.5]} s={[1.5, 0.08, 0.8]} c={pal.wood} /><Box p={[11.2, 0.12, 1.5]} s={[1.3, 0.24, 0.6]} c="#9ca3af" />
          <Plant p={[13.5, 0, 3.4]} big /><Plant p={[8.6, 0, 3.5]} /><HangingPlant p={[9.2, 2.7, -3.7]} />
          <Label p={[11.2, 2.0, 0.2]}>Pantry & Lounge Tamu</Label>
        </>
      );
    default: // Lantai istirahat: lounge, kamar tidur, rooftop
      return (
        <>
          <Box p={[-3.4, 0.01, -1.4]} s={[3.6, 0.02, 2.4]} c={pal.rug} /><Sofa p={[-3.4, 0, -3.5]} n={3} color={pal.sofa} />
          <Box p={[-3.4, 0.25, -1.4]} s={[1.2, 0.08, 0.7]} c={pal.wood} /><Box p={[-3.4, 0.12, -1.4]} s={[1.0, 0.24, 0.5]} c="#9ca3af" />
          <WallScreen p={[-3.4, 2.0, -3.9]} w={2.4} h={1.2} kind="code" seed={7} />
          <Plant p={[-5.7, 0, -3.4]} big /><HangingPlant p={[-1.6, 2.4, -3.7]} />
          <Label p={[-3.4, 2.3, -2.2]}>Lounge</Label>
          <Box p={[-1.1, 1.1, -2.4]} s={[0.12, 2.2, 3.2]} c={pal.glass} o={0.45} /><Box p={[3.9, 1.1, -2.4]} s={[0.12, 2.2, 3.2]} c={pal.glass} o={0.45} />
          {[0.2, 2.6].map((bx) => (
            <group key={bx}>
              <Box p={[bx, 0.2, -2.4]} s={[1.55, 0.4, 2.75]} c={pal.wood} /><Box p={[bx, 0.5, -2.4]} s={[1.45, 0.16, 2.6]} c="#f8fafc" />
              <Box p={[bx, 0.68, -3.35]} s={[0.9, 0.18, 0.5]} c="#e2e8f0" /><Box p={[bx, 0.95, -3.92]} s={[1.65, 1.4, 0.08]} c={pal.wood} />
            </group>
          ))}
          <Box p={[1.4, 0.3, -3.5]} s={[0.4, 0.6, 0.5]} c={pal.wood} /><Box p={[1.4, 0.8, -3.5]} s={[0.1, 0.4, 0.1]} c="#fde68a" e="#fbbf24" ei={1.2} />
          <Label p={[1.4, 2.4, -2.2]}>Kamar Tidur</Label>
          {/* dek rooftop */}
          <Box p={[(BALCONY.minX + BALCONY.maxX) / 2, -0.17, (BALCONY.minZ + BALCONY.maxZ) / 2]} s={[BALCONY.maxX - BALCONY.minX, 0.34, BALCONY.maxZ - BALCONY.minZ]} c={pal.wood} cast />
          <Box p={[6.1, 0.52, 6]} s={[3.8, 0.9, 0.03]} c={pal.glass} o={0.4} /><Box p={[8, 0.52, 1]} s={[0.03, 0.9, 10]} c={pal.glass} o={0.4} /><Box p={[4.2, 0.52, 5]} s={[0.03, 0.9, 2]} c={pal.glass} o={0.4} />
          <Box p={[6.1, 0.98, 6]} s={[3.8, 0.04, 0.05]} c="#cbd5e1" /><Box p={[8, 0.98, 1]} s={[0.05, 0.04, 10]} c="#cbd5e1" />
          <Plant p={[7.5, 0, 3.4]} big /><Plant p={[4.3, 0, 3.4]} />
          <Label p={[6.1, 2.0, 4.6]}>Rooftop</Label>
          <BilliardRoom pal={pal} glow={glow} />
        </>
      );
  }
}

export function Office({ theme }: { theme: Theme }) {
  const pal = theme === "dark" ? DARK : LIGHT;
  const agents = useMissionStore((s) => s.agents);
  const focus = useMissionStore((s) => s.focus);
  const pointLights = useMissionStore((s) => QUALITY[s.quality].pointLights);
  const decor = useMissionStore((s) => QUALITY[s.quality].decor);
  const glow = useMissionStore((s) => QUALITY[s.quality].glow);
  const top = focus === "all" ? FLOORS : Number(focus);        // jumlah lantai yang digambar
  const floors = Array.from({ length: top }, (_, i) => i + 1);

  return (
    <group>
      {/* dinding belakang & kiri opak (seperti ruang referensi); kanan terbuka agar bagian dalam terlihat */}
      <Box p={[B_CX, (top * H) / 2, -4.1]} s={[B_W + 0.4, top * H + 0.2, 0.2]} c={pal.wall} />
      <Box p={[-8.1, (top * H) / 2, 0]} s={[0.2, top * H + 0.2, 8.4]} c={pal.wallSide} />
      {/* plinth gelap di dasar gedung */}
      <Box p={[0, -0.5, 0]} s={[16.8, 0.3, 8.8]} c={pal.dark ? "#10162a" : "#59606d"} />

      {floors.filter((n) => floorVisible(focus, n)).map((n) => {
        const info = FLOOR_INFO[n - 1];
        return (
          <group key={n} position={[0, floorY(n), 0]}>
            {/* lantai: slab tebal + tepi depan lebih gelap; bordes tangga di sisi tiba */}
            {n === 1 ? <Box p={[B_CX, -0.17, 0]} s={[B_W + 0.4, 0.34, 8.4]} c={pal.floor} cast /> : (
              <>
                <Box p={[4, -0.17, 0]} s={[20, 0.34, 8]} c={pal.floor} cast />
                <Box p={[-7, -0.17, landingZ(n)]} s={[2, 0.34, 2]} c={pal.floor} cast />
              </>
            )}
            <Box p={[n === 1 ? B_CX : 4, -0.17, n === 1 ? 4.22 : 4.02]} s={[n === 1 ? B_W + 0.4 : 20, 0.34, 0.04]} c={pal.edge} />
            {/* LED neon: dasar dinding belakang & kiri + cove atas dinding belakang */}
            <Led p={[B_CX, 0.1, -3.95]} s={[B_W - 0.1, 0.06, 0.05]} c={info.accent} glow={glow} />
            <Led p={[-7.95, 0.1, 0]} s={[0.05, 0.06, 7.9]} c={info.accent} glow={glow} />
            {n < FLOORS && <Led p={[B_CX, FLOOR_H - 0.22, -3.94]} s={[B_W - 0.1, 0.05, 0.05]} c={pal.neonA} glow={glow} />}
            {/* jendela besar di dinding kiri + sekat */}
            {[-2.6, 0, 2.6].map((z) => <Box key={z} p={[-7.97, 2.0, z]} s={[0.05, 2.4, 2.3]} c={pal.glass} e={pal.glassE} ei={pal.dark ? 0.9 : 0.55} />)}
            {[-1.3, 1.3].map((z) => <Box key={z} p={[-7.95, 1.9, z]} s={[0.09, 3.6, 0.1]} c="#f8fafc" />)}
            {<><Box p={[11.2, 2.3, -3.97]} s={[3.6, 1.4, 0.05]} c={pal.glass} e={pal.glassE} ei={pal.dark ? 0.9 : 0.5} /></>}
            {n === FLOORS && <><Box p={[3.2, 2.3, -3.97]} s={[3, 1.4, 0.05]} c={pal.glass} e={pal.glassE} ei={pal.dark ? 0.9 : 0.5} /><Box p={[-1.2, 2.3, -3.97]} s={[3, 1.4, 0.05]} c={pal.glass} e={pal.glassE} ei={pal.dark ? 0.9 : 0.5} /></>}
            {/* meja kerja lantai ini */}
            {DESKS.map((d, i) => {
              if (d.floor !== n) return null;
              const a = agents.find((x) => x.deskIndex % DESKS.length === i && x.status === "working") ?? agents.find((x) => x.deskIndex % DESKS.length === i);
              return <Desk key={i} x={d.pos[0]} z={d.pos[2] - 1.1} pal={pal} agentColor={a?.color ?? "#64748b"} active={a?.status === "working"} glow={glow && decor} seed={i + 1} last={i % 5 === 4} />;
            })}
            {(decor || n === FLOORS) && <FloorProps n={n} pal={pal} glow={glow} />}
            {n < FLOORS && top > n && <Flight k={n} pal={pal} />}
            <Label p={[0, 0.5, 4.7]}>Lantai {n} · {info.name}</Label>
            {pointLights && <pointLight position={[0, 3.2, 0]} intensity={pal.dark ? 16 : 3.2} color={n === FLOORS ? "#fde8c8" : "#e8f3ff"} distance={13} />}
          </group>
        );
      })}
    </group>
  );
}
