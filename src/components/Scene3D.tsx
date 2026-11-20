"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Office } from "./Office";
import { Character } from "./Character";
import { useMissionStore } from "@/store/useMissionStore";

export default function Scene3D({ active = true }: { active?: boolean }) {
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
      <OrbitControls target={[0, 3.2, 0]} maxPolarAngle={Math.PI / 2.1} minDistance={8} maxDistance={45} enablePan />
    </Canvas>
  );
}
