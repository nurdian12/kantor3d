"use client";
import { useMemo } from "react";
import * as THREE from "three";

export type V3 = [number, number, number];

/** Kotak dasar. `e` = warna emisif (neon); `tm=false` agar neon tidak dipucatkan tone-mapping */
export function Box({ p, s, c, o, e, ei = 0.9, cast = false, r, tm = true }: { p: V3; s: V3; c: string; o?: number; e?: string; ei?: number; cast?: boolean; r?: V3; tm?: boolean }) {
  return (
    <mesh position={p} rotation={r} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} transparent={o !== undefined} opacity={o ?? 1} emissive={e ?? "#000"} emissiveIntensity={e ? ei : 0} toneMapped={tm && !e} roughness={0.75} />
    </mesh>
  );
}

// ---------- tekstur layar prosedural (kode / dasbor / grafik) ----------
const texCache = new Map<string, THREE.CanvasTexture>();
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function screenTexture(kind: "code" | "dash" | "chart", seed = 1): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const key = kind + seed; const hit = texCache.get(key); if (hit) return hit;
  const W = 512, H = 256, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d")!; const R = rng(seed * 977);
  g.fillStyle = "#0a1020"; g.fillRect(0, 0, W, H);
  if (kind === "code") {
    g.fillStyle = "#111a33"; g.fillRect(0, 0, W, 22); ["#f87171", "#fbbf24", "#4ade80"].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(14 + i * 16, 11, 4, 0, 7); g.fill(); });
    const cols = ["#7dd3fc", "#86efac", "#fca5a5", "#fde68a", "#c4b5fd", "#94a3b8"];
    for (let i = 0; i < 17; i++) { let x = 38 + Math.floor(R() * 3) * 22; g.fillStyle = "#475569"; g.fillRect(10, 34 + i * 13, 14, 5);
      for (let j = 0; j < 1 + Math.floor(R() * 4); j++) { const w = 20 + R() * 90; g.fillStyle = cols[Math.floor(R() * cols.length)]; g.fillRect(x, 34 + i * 13, w, 6); x += w + 8; } }
  } else if (kind === "dash") {
    for (let i = 0; i < 4; i++) { g.fillStyle = "#16213f"; g.fillRect(14 + i * 122, 14, 110, 56); g.fillStyle = ["#38bdf8", "#4ade80", "#fbbf24", "#a78bfa"][i]; g.fillRect(24 + i * 122, 28, 50, 8); g.fillStyle = "#e2e8f0"; g.fillRect(24 + i * 122, 46, 78, 14); }
    for (let i = 0; i < 24; i++) { const h = 20 + R() * 110; g.fillStyle = i % 3 ? "#6366f1" : "#22c55e"; g.fillRect(16 + i * 20, 240 - h, 13, h); }
  } else {
    g.strokeStyle = "#1e2a4a"; g.lineWidth = 1; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, i * 42); g.lineTo(W, i * 42); g.stroke(); }
    ["#38bdf8", "#4ade80", "#fbbf24"].forEach((col, k) => { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); let y = 150 - k * 30; for (let x = 0; x <= W; x += 16) { y = Math.max(30, Math.min(230, y + (R() - 0.5) * 36)); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); });
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(key, t); return t;
}

/** Layar datar di dinding (bingkai gelap + tekstur) */
export function WallScreen({ p, w, h, kind, seed = 1, on = true }: { p: V3; w: number; h: number; kind: "code" | "dash" | "chart"; seed?: number; on?: boolean }) {
  const tex = useMemo(() => screenTexture(kind, seed), [kind, seed]);
  return (
    <group position={p}>
      <Box p={[0, 0, 0]} s={[w + 0.14, h + 0.14, 0.06]} c="#0f172a" />
      <mesh position={[0, 0, 0.04]}><planeGeometry args={[w, h]} /><meshStandardMaterial color="#000" emissive="#ffffff" emissiveMap={tex} emissiveIntensity={on ? 1.15 : 0.25} toneMapped={false} /></mesh>
    </group>
  );
}

/** Monitor lengkung: potongan silinder yang cekungnya menghadap +z (ke pengguna) */
export function CurvedMonitor({ p, active, color = "#38bdf8", seed = 1 }: { p: V3; active: boolean; color?: string; seed?: number }) {
  const R = 1.9, arc = 1.5 / R;
  const tex = useMemo(() => screenTexture("code", seed), [seed]);
  const geo = useMemo(() => new THREE.CylinderGeometry(R, R, 0.5, 20, 1, true, Math.PI - arc / 2, arc), [arc]);
  const bez = useMemo(() => new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.56, 20, 1, true, Math.PI - arc / 2 - 0.02, arc + 0.04), [arc]);
  return (
    <group position={p}>
      <mesh geometry={bez} position={[0, 0.5, R]}><meshStandardMaterial color="#0b1020" side={THREE.DoubleSide} roughness={0.5} /></mesh>
      <mesh geometry={geo} position={[0, 0.5, R]}>
        <meshStandardMaterial color="#000" emissive={active ? "#ffffff" : "#243049"} emissiveMap={tex} emissiveIntensity={active ? 1.0 : 0.35} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <Box p={[0, 0.12, 0.02]} s={[0.08, 0.5, 0.08]} c="#cbd5e1" />
      <Box p={[0, -0.14, 0.12]} s={[0.55, 0.02, 0.28]} c="#cbd5e1" />
      {active && <Box p={[0, 0.5 + 0.34, 0.05]} s={[0.9, 0.025, 0.02]} c={color} e={color} ei={1.4} />}
    </group>
  );
}

export function ErgoChair({ p = [0, 0, 0] as V3 }: { p?: V3 }) {
  return (
    <group position={p}>
      <Box p={[0, 0.45, 0.1]} s={[0.6, 0.09, 0.58]} c="#374151" />
      <Box p={[0, 0.88, 0.4]} s={[0.54, 0.74, 0.06]} c="#4b5563" />
      <Box p={[0, 1.3, 0.42]} s={[0.34, 0.16, 0.05]} c="#374151" />
      <Box p={[-0.33, 0.62, 0.15]} s={[0.04, 0.04, 0.34]} c="#1f2937" /><Box p={[0.33, 0.62, 0.15]} s={[0.04, 0.04, 0.34]} c="#1f2937" />
      <mesh position={[0, 0.22, 0.1]}><cylinderGeometry args={[0.035, 0.035, 0.4, 8]} /><meshStandardMaterial color="#9ca3af" /></mesh>
      <mesh position={[0, 0.05, 0.1]}><cylinderGeometry args={[0.34, 0.34, 0.04, 5]} /><meshStandardMaterial color="#6b7280" /></mesh>
    </group>
  );
}

export function BarStool({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.86, 0]}><cylinderGeometry args={[0.2, 0.2, 0.07, 14]} /><meshStandardMaterial color="#1f2937" /></mesh>
      <mesh position={[0, 0.42, 0]}><cylinderGeometry args={[0.025, 0.025, 0.84, 8]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.22, 0.22, 0.03, 14]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
      <mesh position={[0, 0.3, 0]}><torusGeometry args={[0.16, 0.012, 6, 16]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
    </group>
  );
}

/** Tanaman berdaun lebar (monstera): pot putih + daun elips */
export function Plant({ p, big = false }: { p: V3; big?: boolean }) {
  const k = big ? 1.45 : 1;
  return (
    <group position={p} scale={k}>
      <mesh position={[0, 0.22, 0]} castShadow><cylinderGeometry args={[0.2, 0.16, 0.44, 12]} /><meshStandardMaterial color="#f3f4f6" roughness={0.6} /></mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2, h = 0.75 + (i % 3) * 0.16;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.24, h, Math.cos(a) * 0.24]} rotation={[-0.6, a, 0.2]} scale={[0.4 + (i % 2) * 0.08, 0.05, 0.62]} castShadow>
            <sphereGeometry args={[0.5, 9, 6]} /><meshStandardMaterial color={i % 2 ? "#15803d" : "#22a655"} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Tanaman gantung (sulur hijau panjang dari rak) */
export function HangingPlant({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <Box p={[0, 0, 0]} s={[1.5, 0.08, 0.4]} c="#d6c7a8" />
      {Array.from({ length: 9 }, (_, i) => <Box key={i} p={[-0.65 + i * 0.16, -0.3 - (i % 3) * 0.14, 0.05 * ((i % 2) * 2 - 1)]} s={[0.07, 0.6 + (i % 3) * 0.28, 0.05]} c={i % 2 ? "#16a34a" : "#22c55e"} />)}
    </group>
  );
}

/** Strip LED neon + halo cahaya (halo hanya bila `glow`) */
export function Led({ p, s, c, glow }: { p: V3; s: V3; c: string; glow: boolean }) {
  return (
    <group>
      <Box p={p} s={s} c={c} e={c} ei={1.6} />
      {glow && <Box p={p} s={[s[0] > 0.2 ? s[0] : 0.34, s[1] > 0.2 ? s[1] : 0.34, s[2] > 0.2 ? s[2] : 0.34]} c={c} e={c} ei={1} o={0.16} />}
    </group>
  );
}

/** Sofa abu-abu modular */
export function Sofa({ p, n = 3, color = "#9aa6b8", rotY = 0 }: { p: V3; n?: number; color?: string; rotY?: number }) {
  const w = n * 0.95;
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <Box p={[0, 0.2, 0]} s={[w + 0.3, 0.4, 0.95]} c="#6b7686" />
      {Array.from({ length: n }, (_, i) => <Box key={i} p={[-w / 2 + 0.475 + i * 0.95, 0.5, 0.04]} s={[0.9, 0.22, 0.78]} c={color} />)}
      <Box p={[0, 0.8, -0.4]} s={[w + 0.3, 0.6, 0.16]} c={color} />
      <Box p={[-(w + 0.3) / 2 + 0.08, 0.55, 0]} s={[0.16, 0.5, 0.95]} c="#6b7686" /><Box p={[(w + 0.3) / 2 - 0.08, 0.55, 0]} s={[0.16, 0.5, 0.95]} c="#6b7686" />
    </group>
  );
}

/** Kursi makan/rapat sederhana: pengguna menghadap +z pada rotY=0 (sandaran di -z) */
export function DiningChair({ p, rotY = 0, color = "#9aa6b8" }: { p: V3; rotY?: number; color?: string }) {
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <Box p={[0, 0.4, 0]} s={[0.52, 0.08, 0.52]} c={color} />
      <Box p={[0, 0.72, -0.24]} s={[0.5, 0.56, 0.06]} c={color} />
      {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([x, z], i) => <Box key={i} p={[x, 0.18, z]} s={[0.04, 0.36, 0.04]} c="#6b7280" />)}
    </group>
  );
}

/** Rak buku / lemari pajangan */
export function Shelf({ p, w = 2, h = 2.2, rotY = 0 }: { p: V3; w?: number; h?: number; rotY?: number }) {
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <Box p={[0, h / 2, 0]} s={[w, h, 0.4]} c="#d6c7a8" cast />
      {[0.35, 0.95, 1.55].filter((y) => y < h).map((y) => <group key={y}>
        <Box p={[0, y, 0.12]} s={[w - 0.1, 0.04, 0.3]} c="#b79f78" />
        {Array.from({ length: Math.floor(w / 0.32) }, (_, i) => <Box key={i} p={[-w / 2 + 0.25 + i * 0.3, y + 0.17, 0.12]} s={[0.12, 0.28 + (i % 3) * 0.05, 0.22]} c={["#6366f1", "#f59e0b", "#10b981", "#ec4899"][i % 4]} />)}
      </group>)}
    </group>
  );
}
