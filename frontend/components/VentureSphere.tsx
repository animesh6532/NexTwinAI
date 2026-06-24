"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const agents = [
  { name: "Validator", color: "#2563EB", angle: 0 },
  { name: "Research", color: "#10B981", angle: 1.05 },
  { name: "Planner", color: "#7C3AED", angle: 2.1 },
  { name: "Finance", color: "#0F766E", angle: 3.15 },
  { name: "Pitch", color: "#DB2777", angle: 4.2 },
  { name: "Architecture", color: "#EA580C", angle: 5.25 },
];

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function VentureOrbit() {
  const group = useRef<THREE.Group>(null);
  const reducedMotion = useReducedMotion();

  const lineGeometry = useMemo(() => {
    const points = agents.flatMap((agent) => {
      const x = Math.cos(agent.angle) * 2.2;
      const z = Math.sin(agent.angle) * 2.2;
      return [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, 0.2 * Math.sin(agent.angle * 2), z)];
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(points);
    return geometry;
  }, []);

  useFrame((_, delta) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y += delta * 0.18;
    group.current.rotation.x = Math.sin(Date.now() * 0.00035) * 0.08;
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.72, 48, 48]} />
        <meshStandardMaterial color="#2563EB" roughness={0.72} metalness={0.06} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.55, 0.01, 8, 96]} />
        <meshBasicMaterial color="#94A3B8" transparent opacity={0.45} />
      </mesh>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#94A3B8" transparent opacity={0.35} />
      </lineSegments>
      {agents.map((agent) => {
        const x = Math.cos(agent.angle) * 2.2;
        const z = Math.sin(agent.angle) * 2.2;
        const y = 0.2 * Math.sin(agent.angle * 2);
        return (
          <mesh key={agent.name} position={[x, y, z]}>
            <sphereGeometry args={[0.16, 24, 24]} />
            <meshStandardMaterial color={agent.color} roughness={0.5} metalness={0.08} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function VentureSphere() {
  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-lg border border-border bg-card">
      <Canvas camera={{ position: [0, 2.1, 5.8], fov: 42 }} dpr={[1, 1.8]}>
        <ambientLight intensity={1.4} />
        <directionalLight position={[3, 4, 5]} intensity={1.7} />
        <pointLight position={[-3, -2, 4]} intensity={0.9} color="#60A5FA" />
        <VentureOrbit />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-4 bottom-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {agents.map((agent) => (
          <div key={agent.name} className="flex items-center gap-2 rounded-md border border-border bg-background/85 px-2.5 py-1.5 text-[10px] font-semibold text-textSecondary backdrop-blur">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: agent.color }} />
            {agent.name} Agent
          </div>
        ))}
      </div>
    </div>
  );
}
