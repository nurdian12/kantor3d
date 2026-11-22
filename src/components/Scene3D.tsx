"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Office } from "./Office";
import { Character, agentObjects } from "./Character";
import { FLOORS, FLOOR_H, floorOfY, floorY } from "@/lib/layout";
import { useMissionStore, type Focus } from "@/store/useMissionStore";
import { DOWNGRADE_BELOW, QUALITY, QUALITY_ORDER } from "@/lib/quality";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type Cam = { pos: [number, number, number]; target: [number, number, number] };
/** Semua lantai: pandangan menyamping agar kelima lantai terlihat; fokus lantai n: dari atas-depan ke lantai n (lantai di atasnya disembunyikan) */
const MID = (FLOORS * FLOOR_H) / 2;
const presetFor = (f: Focus): Cam =>
  f === "all"
    ? { pos: [13, MID + 4, 30], target: [0, MID - 0.5, 0] }
    : Number(f) === FLOORS
      // lantai 5: sasaran digeser ke kanan-depan agar dek rooftop (tempat banyak agen) ikut terbingkai
      ? { pos: [2.6, floorY(5) + 16.5, 15.5], target: [2.6, floorY(5) + 0.3, 1.8] }
      : { pos: [0, floorY(Number(f)) + 14.3, 12.5], target: [0, floorY(Number(f)) + 0.3, 0.4] };

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
    const o = agentObjects.get(selectedId);
    const st = useMissionStore.getState();
    if (o && st.focus !== "all" && floorOfY(o.position.y) !== Number(st.focus)) st.setFocus("all"); // agen di lantai yang disembunyikan
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
          dir.setLength(len + (11 - len) * k);
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
  return (
    // Canvas TIDAK dibuat ulang saat kualitas berubah (teardown label Html drei memicu error removeChild).
    // Antialias hanya bisa ditentukan saat dibuat, jadi dipakai nilai awal; dpr/bayangan/FPS/lampu berubah langsung.
    <Canvas frameloop={!active ? "never" : q.fps ? "demand" : "always"} shadows={q.shadows} camera={{ position: presetFor("all").pos, fov: 38 }}
      onPointerMissed={() => select(null)} dpr={q.dpr} gl={{ antialias, powerPreference: "high-performance" }}>
      {active && q.fps > 0 && <FrameLimiter fps={q.fps} />}
      {active && <FpsGuard />}
      <color attach="background" args={[dark ? "#121a33" : "#e8eef7"]} />
      <fog attach="fog" args={[dark ? "#121a33" : "#e8eef7", 60, 130]} />
      <ambientLight intensity={dark ? 1.1 : 1.1} />
      <directionalLight ref={light} position={[16, 34, 24]} intensity={dark ? 1.3 : 1.7} castShadow={q.shadows} shadow-mapSize={[q.shadowMap || 512, q.shadowMap || 512]}
        shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={28} shadow-camera-bottom={-12} shadow-camera-far={110} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={dark ? "#1a2342" : "#cfd8e6"} />
      </mesh>
      <Office theme={theme} />
      {agents.map((a) => <Character key={a.id} agent={a} />)}
      <CameraRig controls={controls} />
      <OrbitControls ref={controls} target={presetFor("all").target} maxPolarAngle={Math.PI / 2.1} minDistance={8} maxDistance={80} enablePan />
    </Canvas>
  );
}
