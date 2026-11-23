"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Office } from "./Office";
import { Character, agentObjects } from "./Character";
import { B_CX, zoneById } from "@/lib/layout";
import { useMissionStore, type Focus } from "@/store/useMissionStore";
import { DOWNGRADE_BELOW, QUALITY, QUALITY_ORDER } from "@/lib/quality";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type Cam = { pos: [number, number, number]; target: [number, number, number] };
/** Kamera isometrik: memandang dari sudut gedung (arah 45°) dengan lensa panjang (fov 20) agar perspektif nyaris datar seperti render referensi. */
const along = (t: [number, number, number], d: [number, number, number], dist: number): [number, number, number] => {
  const v = new THREE.Vector3(...d).normalize().multiplyScalar(dist); return [t[0] + v.x, t[1] + v.y, t[2] + v.z];
};
const presetFor = (f: Focus): Cam => {
  if (f === "all") { const t: [number, number, number] = [B_CX, 0.6, 0]; return { pos: along(t, [1, 0.6, 1.15], 104), target: t }; }
  const z = zoneById(f), t: [number, number, number] = [(z.x0 + z.x1) / 2, 0.5, (z.z0 + z.z1) / 2];
  return { pos: along(t, [0.9, 0.95, 1], f === "work" ? 70 : 46), target: t };
};

/** Animasi halus kamera ke preset saat fokus berubah; setelah itu kontrol bebas kembali ke pengguna */
function CameraRig({ controls }: { controls: React.RefObject<OrbitControlsImpl | null> }) {
  const focus = useMissionStore((s) => s.focus);
  const anim = useRef({ t: 1, from: new THREE.Vector3(), fromT: new THREE.Vector3(), first: true });
  useEffect(() => { anim.current.t = 0; anim.current.first = true; }, [focus]);
  // --- ikuti agen terpilih ---
  const selectedId = useMissionStore((s) => s.selectedId);
  const follow = useMissionStore((s) => s.follow);
  const approach = useRef(0); // detik sisa fase "mendekat" (zoom otomatis)
  useEffect(() => {
    if (!selectedId) return;
    approach.current = 2.5;
    // bila agen ada di lantai yang disembunyikan, tampilkan semua lantai
  }, [selectedId]);
  const tmp = useRef({ d: new THREE.Vector3(), dir: new THREE.Vector3() });

  useFrame(({ camera }, dt) => {
    const a = anim.current, c = controls.current;
    if (c && a.t >= 1 && follow && selectedId) {
      const o = agentObjects.get(selectedId);
      if (o) {
        const { d, dir } = tmp.current;
        const k = 1 - Math.exp(-dt * 5);
        d.copy(o.position).add(new THREE.Vector3(0, 1.0, 0)).sub(c.target).multiplyScalar(k);
        c.target.add(d);
        camera.position.add(d); // pertahankan sudut & jarak pandang pengguna
        if (approach.current > 0) {
          approach.current -= dt;
          dir.copy(camera.position).sub(c.target);
          const len = dir.length();
          dir.setLength(len + (34 - len) * k);
          camera.position.copy(c.target).add(dir);
        }
        c.update();
      }
    }
    if (!c || a.t >= 1) return;
    if (a.first) { a.from.copy(camera.position); a.fromT.copy(c.target); a.first = false; }
    a.t = Math.min(1, a.t + dt / 1.1);
    const k = 1 - Math.pow(1 - a.t, 3);
    const p = presetFor(focus);
    camera.position.lerpVectors(a.from, new THREE.Vector3(...p.pos), k);
    c.target.lerpVectors(a.fromT, new THREE.Vector3(...p.target), k);
    c.update();
  });
  return null;
}

/** Batasi FPS: di mode "demand" render hanya dipicu ticker ini (dan oleh OrbitControls saat digeser) */
function FrameLimiter({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = setInterval(invalidate, 1000 / fps);
    return () => clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

/** Ukur FPS nyata; bila rendah turunkan kualitas satu tingkat (sekali per jendela 3 detik) */
function FpsGuard() {
  const setFps = useMissionStore((s) => s.setFps);
  const st = useRef({ frames: 0, start: performance.now(), hidden: false, warm: 0 });
  useEffect(() => {
    const onVis = () => { st.current.hidden = true; st.current.start = performance.now(); st.current.frames = 0; };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  useFrame(() => {
    const s = st.current;
    s.frames++;
    const now = performance.now();
    if (now - s.start < 3000) return;
    const fps = (s.frames * 1000) / (now - s.start);
    const skip = s.hidden || document.hidden;
    s.frames = 0; s.start = now; s.hidden = false; s.warm++;
    if (skip) return;
    setFps(Math.round(fps));
    const m = useMissionStore.getState();
    // jendela pertama = pemanasan (kompilasi shader), diabaikan
    if (s.warm < 2 || !m.autoQuality) return;
    const i = QUALITY_ORDER.indexOf(m.quality);
    if (fps < DOWNGRADE_BELOW[m.quality] && i < QUALITY_ORDER.length - 1) {
      const next = QUALITY_ORDER[i + 1];
      m.setQuality(next, true, `Kualitas diturunkan otomatis ke "${QUALITY[next].label}" (FPS ${Math.round(fps)})`);
    }
  });
  return null;
}

/** Tanah: bidang abu lembut dengan sorot lebih terang di tengah + bayangan kabur di bawah gedung (tekstur kanvas, tanpa biaya bayangan realtime) */
function Ground({ dark }: { dark: boolean }) {
  const [glow, blob] = useMemo(() => {
    if (typeof document === "undefined") return [null, null];
    const mk = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const glow = mk(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, "rgba(255,255,255,0.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 256, 256); });
    const blob = mk(256, 256, (g) => { g.filter = "blur(14px)"; g.fillStyle = "rgba(10,14,28,0.62)"; g.beginPath(); g.roundRect(52, 76, 152, 104, 10); g.fill(); });
    return [glow, blob];
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}><planeGeometry args={[900, 900]} /><meshStandardMaterial color={dark ? "#0f1729" : "#a8acb3"} roughness={1} /></mesh>
      {glow && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.69, 0]}><planeGeometry args={[260, 260]} /><meshBasicMaterial map={glow} transparent opacity={dark ? 0.12 : 0.9} depthWrite={false} toneMapped={false} /></mesh>}
      {blob && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.68, 0.4]}><planeGeometry args={[78, 40]} /><meshBasicMaterial map={blob} transparent opacity={dark ? 0.55 : 0.8} depthWrite={false} toneMapped={false} /></mesh>}
    </group>
  );
}

export default function Scene3D({ active = true }: { active?: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const agents = useMissionStore((s) => s.agents);
  const theme = useMissionStore((s) => s.theme);
  const select = useMissionStore((s) => s.select);
  const quality = useMissionStore((s) => s.quality);
  const q = QUALITY[quality];
  const [antialias] = useState(() => q.antialias); // nilai awal saja
  const light = useRef<THREE.DirectionalLight>(null);
  // ukuran shadow-map berubah -> buang peta lama agar dibuat ulang dengan ukuran baru
  useEffect(() => { const sh = light.current?.shadow; if (sh?.map) { sh.map.dispose(); sh.map = null; } }, [q.shadowMap, q.shadows]);
  const dark = theme === "dark";
  // ?clean=1: tanpa karakter (untuk render presentasi arsitektur)
  const [clean] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("clean"));
  return (
    // Canvas TIDAK dibuat ulang saat kualitas berubah (teardown label Html drei memicu error removeChild).
    // Antialias hanya bisa ditentukan saat dibuat, jadi dipakai nilai awal; dpr/bayangan/FPS/lampu berubah langsung.
    <Canvas frameloop={!active ? "never" : q.fps ? "demand" : "always"} shadows={q.shadows} camera={{ position: presetFor("all").pos, fov: 20, near: 2, far: 700 }}
      onPointerMissed={() => select(null)} dpr={q.dpr} gl={{ antialias, powerPreference: "high-performance" }}>
      {active && q.fps > 0 && <FrameLimiter fps={q.fps} />}
      {active && <FpsGuard />}
      <color attach="background" args={[dark ? "#0b1020" : "#a3a7ae"]} />
      <fog attach="fog" args={[dark ? "#0b1020" : "#a3a7ae", 220, 560]} />
      <hemisphereLight args={[dark ? "#9db4e6" : "#ffffff", dark ? "#1b2540" : "#aeb4bf", dark ? 1.0 : 1.2]} />
      <ambientLight intensity={dark ? 0.25 : 0.25} />
      <directionalLight ref={light} position={[60, 110, 74]} intensity={dark ? 0.9 : 1.5} castShadow={q.shadows} shadow-mapSize={[q.shadowMap || 512, q.shadowMap || 512]}
        shadow-camera-left={-52} shadow-camera-right={52} shadow-camera-top={44} shadow-camera-bottom={-30} shadow-camera-far={320} />
      <Ground dark={dark} />
      <Office theme={theme} />
      {!clean && agents.map((a) => <Character key={a.id} agent={a} />)}
      <CameraRig controls={controls} />
      <OrbitControls ref={controls} target={presetFor("all").target} maxPolarAngle={Math.PI / 2.1} minDistance={16} maxDistance={300} enablePan />
    </Canvas>
  );
}
