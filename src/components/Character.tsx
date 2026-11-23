"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Agent, Pose } from "@/lib/types";
import { DESKS, IDLE_SPOTS, routeTo, type Spot } from "@/lib/layout";
import { useMissionStore, statusLabel } from "@/store/useMissionStore";

const SPEED = 2.6;
/** Registri objek 3D tiap agen (dipakai kamera untuk mengikuti agen) */
export const agentObjects = new Map<string, THREE.Object3D>();
type V3 = [number, number, number];

export function spotFor(agent: Agent, visiting?: { agentId: string } | null): Spot {
  // Idle -> spot istirahat (tidur/duduk/billiard/berkeliling); Working & Error -> meja kerja.
  if (agent.status === "idle") return IDLE_SPOTS[agent.idleIndex % IDLE_SPOTS.length];
  // Orkestrator (Nova) yang sedang bekerja mendatangi meja agen yang ditangani: berdiri di belakang kursi, menghadap agen
  if (agent.id === "manager" && visiting && visiting.agentId !== agent.id) {
    const other = useMissionStore.getState().agents.find((x) => x.id === visiting.agentId);
    if (other && other.status !== "idle") {
      const d = DESKS[other.deskIndex % DESKS.length];
      return { pos: [d.pos[0] + 0.9, 0, d.pos[2] + 1.7], rotY: Math.PI, pose: "stand", label: `Menangani ${other.name}` };
    }
  }
  return DESKS[agent.deskIndex % DESKS.length];
}

const statusColor = { working: "#22c55e", idle: "#38bdf8", error: "#ef4444" } as const;

function Limb({ w = 0.14, len, color, refObj, pos }: { w?: number; len: number; color: string; refObj: React.RefObject<THREE.Group | null>; pos: V3 }) {
  return (
    <group ref={refObj} position={pos}>
      <mesh position={[0, -len / 2, 0]} castShadow>
        <boxGeometry args={[w, len, w]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

export function Character({ agent }: { agent: Agent }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const select = useMissionStore((s) => s.select);
  useEffect(() => {
    const o = root.current;
    if (o) agentObjects.set(agent.id, o);
    return () => { agentObjects.delete(agent.id); };
  }, [agent.id]);
  const [tagShown, setTagShown] = useState(false);
  const hovered = useRef(false);
  const selected = useMissionStore((s) => s.selectedId === agent.id);

  const visiting = useMissionStore((s) => s.visiting);
  const spot = spotFor(agent, visiting);
  const st = useRef({
    init: false,
    path: [] as V3[],
    pose: "stand" as Pose,
    poseBlend: 0, // 0 = berdiri, 1 = pose target (sit/lie)
    targetKey: "",
    walking: false,
    wIdx: 0,
    nextMove: 0,
  });

  // posisi awal langsung di spot
  const startPos = useMemo(() => spot.pos, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const s = st.current;
    const t = state.clock.elapsedTime;
    if (!s.init) {
      g.position.set(...spot.pos);
      g.rotation.y = spot.rotY;
      s.pose = spot.pose;
      s.poseBlend = 1;
      s.targetKey = agent.status === "idle" ? "idle" : visiting && agent.id === "manager" ? "visit:" + visiting.agentId : "desk";
      s.init = true;
    }
    const key = agent.status === "idle" ? "idle:" + agent.idleIndex : visiting && agent.id === "manager" ? "visit:" + visiting.agentId : "desk";
    if (key !== s.targetKey) {
      s.targetKey = key;
      s.path = routeTo([g.position.x, 0, g.position.z], spot);
      s.wIdx = 0; s.nextMove = 0;
      s.poseBlend = 0; // berdiri dulu sebelum jalan
    }
    // spot berkeliling: setelah berhenti beberapa detik, lanjut ke titik berikutnya
    if (spot.wander && s.path.length === 0) {
      if (s.nextMove === 0) s.nextMove = t + 2.5 + ((agent.idleIndex * 37) % 30) / 10;
      else if (t >= s.nextMove) {
        s.wIdx = (s.wIdx + 1) % spot.wander.length;
        s.path.push(spot.wander[s.wIdx]);
        s.nextMove = 0;
      }
    }

    // gerak sepanjang waypoint
    s.walking = s.path.length > 0;
    if (s.walking) {
      const target = new THREE.Vector3(...s.path[0]);
      const dir = target.clone().sub(g.position);
      const dist = dir.length();
      const step = SPEED * dt;
      if (dist <= step) {
        g.position.copy(target);
        s.path.shift();
      } else {
        dir.normalize();
        g.position.addScaledVector(dir, step);
        const yaw = Math.atan2(dir.x, dir.z);
        let d = yaw - g.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        g.rotation.y += d * Math.min(1, dt * 10);
      }
    } else {
      // sampai: putar ke arah spot lalu ambil pose
      let d = spot.rotY - g.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      g.rotation.y += d * Math.min(1, dt * 8);
      s.pose = spot.pose;
      s.poseBlend = Math.min(1, s.poseBlend + dt * 3);
    }

    const show = true;
    g.visible = show;
    // label nama (HTML) hanya saat berguna: di tampilan "Semua" cukup untuk agen yang bekerja/error/terpilih, agar tidak ramai & ringan
    const wantTag = show && (agent.status === "error" || hovered.current || useMissionStore.getState().selectedId === agent.id); // label hanya bila perlu: error, dipilih, atau disorot kursor
    if (wantTag !== tagShown) setTagShown(wantTag); // Html drei tidak mengikuti visible induk

    // animasi pose
    const b = body.current!;
    const pb = s.walking ? 0 : s.poseBlend;
    const sit = s.pose === "sit" ? pb : 0;
    const lie = s.pose === "lie" ? pb : 0;
    const swing = s.walking ? Math.sin(t * 9) * 0.7 : 0;
    const typing = !s.walking && agent.status === "working" ? Math.sin(t * 14) * 0.06 : 0;
    const breathe = !s.walking ? Math.sin(t * 2) * 0.015 : 0;

    b.position.y = -0.1 * sit + 0.62 * lie + (s.walking ? Math.abs(Math.sin(t * 9)) * 0.05 : breathe);
    b.rotation.x = -Math.PI / 2 * lie;
    legL.current!.rotation.x = -Math.PI / 2 * sit + swing;
    legR.current!.rotation.x = -Math.PI / 2 * sit - swing;
    const armFwd = agent.status === "working" && sit > 0 ? -1.25 * sit : 0;
    armL.current!.rotation.x = armFwd + (armFwd ? typing : -swing);
    armR.current!.rotation.x = armFwd + (armFwd ? -typing : swing);

    if (ring.current) {
      const m = ring.current.material as THREE.MeshBasicMaterial;
      const pulse = agent.status === "error" ? 0.5 + Math.sin(t * 6) * 0.35 : selected ? 0.8 : 0.35;
      m.opacity = pulse;
      ring.current.scale.setScalar(agent.status === "error" ? 1 + Math.sin(t * 6) * 0.1 : 1);
    }
  });

  const skin = "#f1c8a5";
  const sc = statusColor[agent.status];

  return (
    <group ref={root} position={startPos} onClick={(e) => { e.stopPropagation(); select(agent.id); }}
      onPointerOver={(e) => { e.stopPropagation(); hovered.current = true; document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { hovered.current = false; document.body.style.cursor = ""; }}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.45, 0.58, 32]} />
        <meshBasicMaterial color={sc} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <group ref={body}>
        {/* torso */}
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[0.46, 0.7, 0.26]} />
          <meshStandardMaterial color={agent.color} />
        </mesh>
        {/* kepala */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <sphereGeometry args={[0.2, 20, 20]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, 1.58, -0.03]}>
          <sphereGeometry args={[0.205, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#2b2b3a" />
        </mesh>
        {/* mata */}
        <mesh position={[-0.07, 1.52, 0.18]}><sphereGeometry args={[0.025, 8, 8]} /><meshBasicMaterial color="#111" /></mesh>
        <mesh position={[0.07, 1.52, 0.18]}><sphereGeometry args={[0.025, 8, 8]} /><meshBasicMaterial color="#111" /></mesh>
        <Limb refObj={legL} len={0.6} color="#334155" pos={[-0.12, 0.6, 0]} />
        <Limb refObj={legR} len={0.6} color="#334155" pos={[0.12, 0.6, 0]} />
        <Limb refObj={armL} len={0.62} w={0.12} color={agent.color} pos={[-0.3, 1.27, 0]} />
        <Limb refObj={armR} len={0.62} w={0.12} color={agent.color} pos={[0.3, 1.27, 0]} />
      </group>
      {tagShown && <Html position={[0, 2.25 + 0, 0]} center distanceFactor={22} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-slate-900/85 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: sc, boxShadow: `0 0 8px ${sc}` }} />
          {agent.name}
          <span className="opacity-60">· {statusLabel(agent.status)}</span>
          {agent.status === "error" && <span className="font-bold text-red-400">⚠</span>}
        </div>
      </Html>}
    </group>
  );
}
