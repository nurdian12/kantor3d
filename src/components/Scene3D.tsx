"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Office } from "./Office";
import { Character, agentObjects } from "./Character";
import { FLOOR_H } from "@/lib/layout";
import { useMissionStore, type Focus } from "@/store/useMissionStore";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const PRESETS: Record<Focus, { pos: [number, number, number]; target: [number, number, number] }> = {
  all: { pos: [8, 6, 19], target: [0, 3.2, 0] },
  // Lantai 1: dari atas-depan agar kedua baris meja terlihat (lantai 2 disembunyikan)
  "1": { pos: [0, 14.5, 12.5], target: [0, 0.2, 0.4] },
  "2": { pos: [1.5, 10, 21], target: [1, 4, 1] },
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
    const o = agentObjects.get(selectedId);
    const st = useMissionStore.getState();
    if (o && st.focus !== "all" && (st.focus === "1") !== (o.position.y < FLOOR_H / 2)) st.setFocus("all");
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
    const p = PRESETS[focus];
    camera.position.lerpVectors(a.from, new THREE.Vector3(...p.pos), k);
    c.target.lerpVectors(a.fromT, new THREE.Vector3(...p.target), k);
    c.update();
  });
  return null;
}

export default function Scene3D({ active = true }: { active?: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const agents = useMissionStore((s) => s.agents);
  const theme = useMissionStore((s) => s.theme);
  const select = useMissionStore((s) => s.select);
  const dark = theme === "dark";
  return (
    <Canvas frameloop={active ? "always" : "never"} shadows camera={{ position: [8, 6, 19], fov: 42 }} onPointerMissed={() => select(null)} dpr={[1, 2]}>
      <color attach="background" args={[dark ? "#121a33" : "#e8eef7"]} />
      <fog attach="fog" args={[dark ? "#121a33" : "#e8eef7", 40, 80]} />
      <ambientLight intensity={dark ? 1.1 : 1.1} />
      <directionalLight position={[10, 18, 14]} intensity={dark ? 1.3 : 1.7} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={dark ? "#1a2342" : "#cfd8e6"} />
      </mesh>
      <Office theme={theme} />
      {agents.map((a) => <Character key={a.id} agent={a} />)}
      <CameraRig controls={controls} />
      <OrbitControls ref={controls} target={[0, 3.2, 0]} maxPolarAngle={Math.PI / 2.1} minDistance={8} maxDistance={45} enablePan />
    </Canvas>
  );
}
