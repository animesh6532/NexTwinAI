"use client";

import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense, useMemo, useRef, useState } from "react";
import type { Group, Mesh } from "three";
import type { DigitalTwinState, Machine } from "../types/nextwin";
import { StatusPill } from "./data-states";
import { 
  Maximize2, 
  Settings, 
  Zap, 
  AlertOctagon, 
  Heart, 
  Wrench, 
  HelpCircle,
  Play,
  TrendingUp,
  Cpu,
  ChevronRight,
  X
} from "lucide-react";

function statusColor(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("critical") || normalized.includes("emergency")) return "#EF4444";
  if (normalized.includes("warning")) return "#F59E0B";
  if (normalized.includes("maintenance")) return "#3B82F6";
  return "#10B981";
}

/* ========================================================
   3D COMPONENT 1: Animated Factory Scene (Hero)
   ======================================================== */

export function IndustrialHeroScene() {
  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white industrial-grid shadow-lg shadow-slate-100/50 md:h-[500px]">
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Scene: Assembly Bay
        </div>
        <div className="rounded-full bg-white/90 border border-slate-200 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm">
          Fibers: 120 Nodes Active
        </div>
      </div>

      <Canvas camera={{ position: [5, 4, 6], fov: 42 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 8, 5]} intensity={1.5} />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        <Suspense fallback={null}>
          <InteractiveFactoryModel />
        </Suspense>
      </Canvas>
    </div>
  );
}

function InteractiveFactoryModel() {
  const ref = useRef<Group>(null);
  
  useFrame((state, delta) => {
    if (ref.current) {
      // Gentle auto-rotation
      ref.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group ref={ref}>
      <FactoryStructure status="#2563EB" />
    </group>
  );
}

function FactoryStructure({ status }: { status: string }) {
  // Moving pistons and cogs
  const pistonRef1 = useRef<Mesh>(null);
  const pistonRef2 = useRef<Mesh>(null);
  const cogRef1 = useRef<Mesh>(null);
  const cogRef2 = useRef<Mesh>(null);
  const robotRef = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pistonRef1.current) pistonRef1.current.position.y = 0.2 + Math.sin(t * 4.5) * 0.35;
    if (pistonRef2.current) pistonRef2.current.position.y = 0.2 + Math.cos(t * 4.5) * 0.35;
    if (cogRef1.current) cogRef1.current.rotation.z = t * 1.5;
    if (cogRef2.current) cogRef2.current.rotation.z = -t * 1.5;
    if (robotRef.current) {
      robotRef.current.rotation.y = Math.sin(t * 1.8) * 0.45;
      robotRef.current.rotation.z = Math.cos(t * 1.2) * 0.15;
    }
  });

  return (
    <group position={[0, -0.6, 0]}>
      {/* Factory Base plate */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[4.8, 0.1, 3.8]} />
        <meshStandardMaterial color="#F1F5F9" metalness={0.15} roughness={0.65} />
      </mesh>

      {/* Assembly Conveyor */}
      <mesh position={[0, 0.2, 0.8]}>
        <boxGeometry args={[3.8, 0.12, 0.6]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Conveyor legs */}
      {[-1.5, 0, 1.5].map((x) => (
        <mesh key={x} position={[x, 0.08, 0.8]}>
          <cylinderGeometry args={[0.06, 0.06, 0.2]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      ))}

      {/* Robot Base tower */}
      <group position={[0, 0.05, -0.6]} ref={robotRef}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.35, 0.4, 0.6, 16]} />
          <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.2} />
        </mesh>
        {/* Arm segment 1 */}
        <mesh position={[0, 0.85, 0.2]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.18, 0.8, 0.18]} />
          <meshStandardMaterial color="#2563EB" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Arm joint */}
        <mesh position={[0, 1.25, 0.4]}>
          <sphereGeometry args={[0.16]} />
          <meshStandardMaterial color="#F59E0B" />
        </mesh>
        {/* Arm segment 2 */}
        <mesh position={[0, 1.55, 0.2]} rotation={[-0.7, 0, 0]}>
          <boxGeometry args={[0.14, 0.7, 0.14]} />
          <meshStandardMaterial color="#2563EB" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* End effector laser tool */}
        <mesh position={[0, 1.85, -0.1]}>
          <cylinderGeometry args={[0.08, 0.08, 0.2]} />
          <meshStandardMaterial color="#0F172A" />
        </mesh>
        <mesh position={[0, 1.95, -0.1]}>
          <sphereGeometry args={[0.06]} />
          <meshStandardMaterial color={status} emissive={status} emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Large Spinning Cogs */}
      <group position={[-1.6, 0.4, -0.8]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.4]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh ref={cogRef1} position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.1, 8]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>
      
      <group position={[-2.2, 0.4, -0.2]}>
        <mesh ref={cogRef2} position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.08, 8]} />
          <meshStandardMaterial color="#64748B" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>

      {/* Piston block */}
      <group position={[1.6, 0.1, -0.6]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.8, 0.5, 0.8]} />
          <meshStandardMaterial color="#334155" metalness={0.5} />
        </mesh>
        {/* Piston shaft 1 */}
        <mesh position={[-0.2, 0.4, 0]} ref={pistonRef1}>
          <cylinderGeometry args={[0.08, 0.08, 0.7]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Piston shaft 2 */}
        <mesh position={[0.2, 0.4, 0]} ref={pistonRef2}>
          <cylinderGeometry args={[0.08, 0.08, 0.7]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    </group>
  );
}

/* ========================================================
   3D COMPONENT 2: Premium Machine Explorer (Zoom / Pan / Explode / Overlays)
   ======================================================== */

type Machine3DMode = "default" | "exploded" | "health" | "anomaly" | "energy" | "maintenance";

export function MachineModelScene({ 
  state, 
  mode = "default",
  type
}: { 
  state?: DigitalTwinState; 
  mode?: Machine3DMode;
  type?: string;
}) {
  const [rotation, setRotation] = useState<[number, number]>([0.3, 0.5]);
  const [zoom, setZoom] = useState<number>(1.2);
  const [pan, setPan] = useState<[number, number]>([0, -0.2]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  function handleMouseDown(e: React.MouseEvent) {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotation([rotation[0] + dy * 0.005, rotation[1] + dx * 0.005]);
    setDragStart({ x: e.clientX, y: e.clientY });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function handleWheel(e: React.WheelEvent) {
    setZoom(prev => Math.max(0.6, Math.min(2.5, prev - e.deltaY * 0.001)));
  }

  const activeColor = useMemo(() => statusColor(state?.status), [state]);

  return (
    <div 
      className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white industrial-grid shadow-lg shadow-slate-100/50 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-1 font-mono-tech text-[10px] text-slate-400 font-bold uppercase tracking-wider pointer-events-none">
        <div>ORBIT: Drag Left Mouse</div>
        <div>ZOOM: Scroll Wheel</div>
        <div>SCALE: {Math.round(zoom * 100)}%</div>
      </div>

      <div className="absolute left-4 top-4 z-10 pointer-events-none">
        <span className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          Active Render: {mode.toUpperCase()}
        </span>
      </div>

      {/* Floating HUD Telemetry Overlay */}
      {state && (
        <div className="absolute left-4 bottom-4 z-10 p-4.5 rounded-2xl border border-slate-200/70 bg-white/95 backdrop-blur-md shadow-lg flex flex-col gap-3 min-w-[220px] pointer-events-none transition-all">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
            <span className="font-mono-tech text-[9px] font-black text-slate-400 uppercase tracking-widest">{state.machine_id} TELEMETRY</span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[8px] font-mono-tech text-blue-600 font-bold uppercase">HUD OVERLAY</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
            <div className="border border-slate-100/60 rounded-xl p-2 bg-slate-50/50">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">OEE Health</span>
              <span className="font-mono-tech font-black text-slate-800 text-xs mt-0.5 block">{state.health_score}%</span>
            </div>
            <div className="border border-slate-100/60 rounded-xl p-2 bg-slate-50/50">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Load Draw</span>
              <span className="font-mono-tech font-black text-[#0EA5E9] text-xs mt-0.5 block">{state.energy_usage} kW</span>
            </div>
            <div className="border border-slate-100/60 rounded-xl p-2 bg-slate-50/50">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Failure Risk</span>
              <span className="font-mono-tech font-black text-amber-500 text-xs mt-0.5 block">{Math.round(state.failure_probability * 100)}%</span>
            </div>
            <div className="border border-slate-100/60 rounded-xl p-2 bg-slate-50/50">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Anomaly Rating</span>
              <span className="font-mono-tech font-black text-red-500 text-xs mt-0.5 block">{state.anomaly_score}</span>
            </div>
          </div>
          
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Machine Status:</span>
            <span className="font-black" style={{ color: activeColor }}>{state.status.toUpperCase()}</span>
          </div>
        </div>
      )}

      <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
        <ambientLight intensity={mode === "energy" ? 0.4 : 0.8} />
        <directionalLight position={[5, 10, 5]} intensity={1.3} />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        <Suspense fallback={null}>
          <group position={[pan[0], pan[1], 0]} rotation={[rotation[0], rotation[1], 0]} scale={[zoom, zoom, zoom]}>
            <MachineInteractiveGeometry mode={mode} systemColor={activeColor} type={type} />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}

function MachineInteractiveGeometry({ 
  mode, 
  systemColor,
  type
}: { 
  mode: Machine3DMode; 
  systemColor: string; 
  type?: string;
}) {
  const explodeOffset = mode === "exploded" ? 0.75 : 0;
  const mType = (type || "").toLowerCase();

  // Animation references
  const spindleRef = useRef<Mesh>(null);
  const pressRef = useRef<Mesh>(null);
  const latheRef = useRef<Mesh>(null);
  const toolPostRef = useRef<Group>(null);
  const rollerRef1 = useRef<Mesh>(null);
  const rollerRef2 = useRef<Mesh>(null);
  const conveyorItemsRef = useRef<Group>(null);
  const robotRef = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // CNC spindle cutter rotation
    if (spindleRef.current) spindleRef.current.rotation.y = t * 6;
    
    // Hydraulic Press head vertical translation
    if (pressRef.current) pressRef.current.position.y = 0.8 + Math.sin(t * 3.5) * 0.4 - explodeOffset * 0.5;
    
    // Lathe chuck rotation and tool post horizontal translation
    if (latheRef.current) latheRef.current.rotation.x = t * 6;
    if (toolPostRef.current) toolPostRef.current.position.x = 0.1 + Math.sin(t * 1.5) * 0.25;
    
    // Conveyor rollers rotation and item translations
    if (rollerRef1.current) rollerRef1.current.rotation.x = t * 4;
    if (rollerRef2.current) rollerRef2.current.rotation.x = t * 4;
    if (conveyorItemsRef.current) {
      conveyorItemsRef.current.children.forEach((child, idx) => {
        const speed = 0.6;
        const startX = -1.2 + idx * 0.8;
        let currentX = startX + (t * speed) % 2.4;
        if (currentX > 1.2) currentX -= 2.4;
        child.position.x = currentX;
      });
    }

    // Robot arm welding idle motion
    if (robotRef.current) {
      robotRef.current.rotation.y = Math.sin(t * 1.8) * 0.45;
      robotRef.current.rotation.z = Math.cos(t * 1.2) * 0.15;
    }
  });

  const isHealth = mode === "health";
  const isAnomaly = mode === "anomaly";
  const isEnergy = mode === "energy";
  const isMaintenance = mode === "maintenance";

  const baseMatProps = {
    metalness: 0.55,
    roughness: 0.35,
    color: isHealth ? "#3B82F6" : isEnergy ? "#1E293B" : "#475569",
    emissive: isAnomaly ? "#EF4444" : isEnergy ? "#2563EB" : "#000000",
    emissiveIntensity: isAnomaly ? 0.65 : isEnergy ? 0.75 : 0
  };

  const jointMatProps = {
    metalness: 0.45,
    roughness: 0.25,
    color: isMaintenance ? "#F59E0B" : isHealth ? "#F59E0B" : "#94A3B8",
    emissive: isAnomaly ? "#EF4444" : "#000000",
    emissiveIntensity: isAnomaly ? 0.8 : 0
  };

  const toolMatProps = {
    metalness: 0.75,
    roughness: 0.15,
    color: isHealth ? "#EF4444" : systemColor,
    emissive: isAnomaly ? "#EF4444" : "#000000",
    emissiveIntensity: isAnomaly ? 1.0 : 0
  };

  // Render function helper based on type
  const renderModelGeometry = () => {
    // 1. ROBOTIC WELDER / ROBOT ARM
    if (mType.includes("robot") || mType.includes("arm") || mType.includes("weld")) {
      return (
        <group ref={robotRef}>
          <mesh position={[0, -0.4, 0]}>
            <cylinderGeometry args={[1.0, 1.05, 0.25, 24]} />
            <meshStandardMaterial {...baseMatProps} />
          </mesh>
          <mesh position={[0, 0.1 + explodeOffset * 0.3, 0]}>
            <cylinderGeometry args={[0.42, 0.45, 0.7, 16]} />
            <meshStandardMaterial {...baseMatProps} />
          </mesh>
          <mesh position={[0, 0.6 + explodeOffset * 0.6, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.35, 12]} />
            <meshStandardMaterial {...jointMatProps} />
          </mesh>
          <mesh position={[0.2 * explodeOffset, 1.1 + explodeOffset * 0.9, 0.15 * explodeOffset]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.22, 0.8, 0.22]} />
            <meshStandardMaterial {...baseMatProps} />
          </mesh>
          <mesh position={[0.4 * explodeOffset, 1.55 + explodeOffset * 1.3, 0.3 * explodeOffset]}>
            <sphereGeometry args={[0.18]} />
            <meshStandardMaterial {...jointMatProps} />
          </mesh>
          <mesh position={[0.6 * explodeOffset, 1.85 + explodeOffset * 1.6, 0.4 * explodeOffset]} rotation={[0, 0, 0.3]}>
            <boxGeometry args={[0.16, 0.7, 0.16]} />
            <meshStandardMaterial {...baseMatProps} />
          </mesh>
          <group position={[0.2 - explodeOffset * 0.8, 2.2 + explodeOffset * 1.9, 0.1 - explodeOffset * 0.8]}>
            <mesh>
              <boxGeometry args={[0.3, 0.2, 0.3]} />
              <meshStandardMaterial {...toolMatProps} />
            </mesh>
            <mesh position={[-0.1, 0.15, 0]}>
              <boxGeometry args={[0.06, 0.12, 0.06]} />
              <meshStandardMaterial {...toolMatProps} />
            </mesh>
            <mesh position={[0.1, 0.15, 0]}>
              <boxGeometry args={[0.06, 0.12, 0.06]} />
              <meshStandardMaterial {...toolMatProps} />
            </mesh>
          </group>
        </group>
      );
    }

    // 2. CNC MACHINE
    if (mType.includes("cnc") || mType.includes("mill") || mType.includes("machining")) {
      return (
        <group>
          <mesh position={[0, -0.4, 0]}>
            <boxGeometry args={[2.2, 0.3, 1.6]} />
            <meshStandardMaterial {...baseMatProps} />
          </mesh>
          <mesh position={[-0.8 - explodeOffset * 0.4, 0.5, 0]}>
            <boxGeometry args={[0.3, 1.4, 1.4]} />
            <meshStandardMaterial {...baseMatProps} />
          </mesh>
          <mesh position={[0.1, -0.15 - explodeOffset * 0.3, 0]}>
            <boxGeometry args={[1.3, 0.12, 1.0]} />
            <meshStandardMaterial {...jointMatProps} />
          </mesh>
          <mesh position={[0.1, 0.05 - explodeOffset * 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.18, 0.18, 0.4, 16]} />
            <meshStandardMaterial color="#BCCCDC" metalness={0.8} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.95 + explodeOffset * 0.6, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial {...baseMatProps} />
          </mesh>
          <group position={[0, 0.58 + explodeOffset * 0.4, 0]} ref={spindleRef}>
            <mesh>
              <cylinderGeometry args={[0.12, 0.08, 0.25, 12]} />
              <meshStandardMaterial {...toolMatProps} />
            </mesh>
            <mesh position={[0, -0.16, 0]}>
              <cylinderGeometry args={[0.02, 0.06, 0.1, 8]} />
              <meshStandardMaterial {...toolMatProps} />
            </mesh>
          </group>
        </group>
      );
    }

    // 3. HYDRAULIC PRESS
    if (mType.includes("press") || mType.includes("stamping") || mType.includes("stamp")) {
      return (
        <group>
          <mesh position={[0, -0.4, 0]}>
            <boxGeometry args={[2.0, 0.35, 1.5]} />
            <meshStandardMaterial {...baseMatProps} />
          </mesh>
          {[-0.8, 0.8].map((x, idx) => (
            [-0.55, 0.55].map((z, jdx) => (
              <mesh key={`${idx}-${jdx}`} position={[x + x * explodeOffset * 0.4, 0.4, z + z * explodeOffset * 0.4]}>
                <cylinderGeometry args={[0.08, 0.08, 1.3, 12]} />
                <meshStandardMaterial {...jointMatProps} />
              </mesh>
            ))
          ))}
          <mesh position={[0, 1.15 + explodeOffset * 0.8, 0]}>
            <boxGeometry args={[2.0, 0.35, 1.5]} />
            <meshStandardMaterial {...baseMatProps} />
          </mesh>
          <mesh position={[0, 0.8 + explodeOffset * 0.6, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.45, 16]} />
            <meshStandardMaterial {...baseMatProps} />
          </mesh>
          <group ref={pressRef}>
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[1.7, 0.18, 1.2]} />
              <meshStandardMaterial {...toolMatProps} />
            </mesh>
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.5, 16]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        </group>
      );
    }

    // 4. CONVEYOR
    if (mType.includes("conveyor") || mType.includes("belt") || mType.includes("feed")) {
      return (
        <group>
          {/* Conveyor Bed */}
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[3.2, 0.25, 0.8]} />
            <meshStandardMaterial {...baseMatProps} />
          </mesh>
          {/* Belt Top layer */}
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[3.0, 0.05, 0.76]} />
            <meshStandardMaterial color="#1E293B" roughness={0.9} />
          </mesh>
          {/* Support Legs */}
          {[-1.3, 0, 1.3].map((x, idx) => (
            <group key={idx} position={[x, -0.65, 0]}>
              <mesh position={[-0.2, 0, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.7, 12]} />
                <meshStandardMaterial {...jointMatProps} />
              </mesh>
              <mesh position={[0.2, 0, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.7, 12]} />
                <meshStandardMaterial {...jointMatProps} />
              </mesh>
            </group>
          ))}
          {/* Conveyor end rollers */}
          <mesh position={[-1.55, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]} ref={rollerRef1}>
            <cylinderGeometry args={[0.13, 0.13, 0.78, 16]} />
            <meshStandardMaterial {...toolMatProps} />
          </mesh>
          <mesh position={[1.55, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]} ref={rollerRef2}>
            <cylinderGeometry args={[0.13, 0.13, 0.78, 16]} />
            <meshStandardMaterial {...toolMatProps} />
          </mesh>
          {/* Conveyed payload objects moving */}
          <group ref={conveyorItemsRef}>
            <mesh position={[-1.0, 0.12, 0]}>
              <boxGeometry args={[0.28, 0.28, 0.28]} />
              <meshStandardMaterial color={systemColor} />
            </mesh>
            <mesh position={[0.0, 0.12, 0]}>
              <boxGeometry args={[0.28, 0.28, 0.28]} />
              <meshStandardMaterial color={systemColor} />
            </mesh>
            <mesh position={[1.0, 0.12, 0]}>
              <boxGeometry args={[0.28, 0.28, 0.28]} />
              <meshStandardMaterial color={systemColor} />
            </mesh>
          </group>
        </group>
      );
    }

    // 5. LATHE MACHINE (Explicit Lathe design and also default fallback)
    return (
      <group>
        <mesh position={[0, -0.45, 0]}>
          <boxGeometry args={[2.5, 0.25, 0.9]} />
          <meshStandardMaterial {...baseMatProps} />
        </mesh>
        <mesh position={[-0.9 - explodeOffset * 0.5, 0.05, 0]}>
          <boxGeometry args={[0.7, 0.75, 0.8]} />
          <meshStandardMaterial {...baseMatProps} />
        </mesh>
        <group position={[-0.55 - explodeOffset * 0.3, 0.15, 0]} ref={latheRef}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.28, 0.28, 0.16, 16]} />
            <meshStandardMaterial {...toolMatProps} />
          </mesh>
          <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.45, 12]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
        <group position={[0.1, -0.15, 0]} ref={toolPostRef}>
          <mesh>
            <boxGeometry args={[0.5, 0.35, 0.75]} />
            <meshStandardMaterial {...jointMatProps} />
          </mesh>
          <mesh position={[0, 0.25, -0.15]}>
            <boxGeometry args={[0.06, 0.18, 0.06]} />
            <meshStandardMaterial {...toolMatProps} />
          </mesh>
        </group>
        <mesh position={[0.95 + explodeOffset * 0.5, 0.0, 0]}>
          <boxGeometry args={[0.45, 0.65, 0.6]} />
          <meshStandardMaterial {...baseMatProps} />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {/* 3D Glowing Health Ring at the base of every model */}
      <mesh position={[0, -0.68, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.35, 0.05, 8, 48]} />
        <meshStandardMaterial color={systemColor} emissive={systemColor} emissiveIntensity={2.2} />
      </mesh>
      
      {renderModelGeometry()}
    </group>
  );
}

/* ========================================================
   DIGITAL TWIN: Factory Layout SVG Flow diagram & Slide Over
   ======================================================== */

export function DigitalTwinBoard({ 
  states, 
  machines 
}: { 
  states: DigitalTwinState[]; 
  machines: Machine[];
}) {
  const machineMap = useMemo(() => new Map(machines.map((m) => [m.id, m])), [machines]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Position nodes in a logical factory conveyor floor pipeline
  const nodePositions: Record<string, { x: number; y: number; name: string }> = {
    "M_001": { x: 120, y: 150, name: "Stage A: Feeding Conveyor" },
    "M_002": { x: 380, y: 150, name: "Stage B1: CNC Mill Unit" },
    "M_003": { x: 380, y: 320, name: "Stage B2: Stamping Press" },
    "M_004": { x: 640, y: 220, name: "Stage C: Robotic Assembly" },
    "M_005": { x: 900, y: 220, name: "Stage D: Testing & Sorting" }
  };

  const selectedState = useMemo(() => 
    states.find(s => s.machine_id === selectedNode),
    [states, selectedNode]
  );
  
  const selectedMachine = useMemo(() => 
    selectedNode ? machineMap.get(selectedNode) : null,
    [machineMap, selectedNode]
  );

  const avgOee = useMemo(() => {
    if (!states.length) return 98;
    return Math.round(states.reduce((acc, s) => acc + s.health_score, 0) / states.length);
  }, [states]);

  const totalEnergy = useMemo(() => {
    return Math.round(states.reduce((acc, s) => acc + s.energy_usage, 0));
  }, [states]);

  const anomalyCount = useMemo(() => {
    return states.filter(s => s.anomaly_score > 0.4 || s.status.toLowerCase().includes("critical")).length;
  }, [states]);

  const warningCount = useMemo(() => {
    return states.filter(s => s.status.toLowerCase().includes("warning")).length;
  }, [states]);

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xl">
      <div className="border-b border-slate-200 bg-white/50 px-6 py-5 flex items-center justify-between">
        <div>
          <div className="metric-label">Factory Spatial Model</div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">Conveyor Material Flow Route</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
            Live Material Flows
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Spatial Floor */}
        <div className="flex-1 relative w-full overflow-x-auto p-6 bg-slate-50/20 border-r border-slate-100">
          <div className="min-w-[1080px] h-[450px] relative">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker
                  id="flow-arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3B82F6" />
                </marker>
              </defs>
              {/* Pulsating Material Flow Pipelines */}
              {/* Feed to Milling */}
              <path 
                d="M 120 150 L 380 150" 
                fill="none" 
                stroke="#E2E8F0" 
                strokeWidth="10" 
                strokeLinecap="round"
              />
              <path 
                d="M 120 150 L 380 150" 
                fill="none" 
                stroke="#3B82F6" 
                strokeWidth="4" 
                marker-end="url(#flow-arrow)"
                className="conveyor-flow-line"
              />

              {/* Feed to Stamping */}
              <path 
                d="M 120 150 L 220 150 L 220 320 L 380 320" 
                fill="none" 
                stroke="#E2E8F0" 
                strokeWidth="10" 
                strokeLinecap="round"
              />
              <path 
                d="M 120 150 L 220 150 L 220 320 L 380 320" 
                fill="none" 
                stroke="#3B82F6" 
                strokeWidth="4" 
                marker-end="url(#flow-arrow)"
                className="conveyor-flow-line"
              />

              {/* Milling to Assembler */}
              <path 
                d="M 380 150 L 510 150 L 510 220 L 640 220" 
                fill="none" 
                stroke="#E2E8F0" 
                strokeWidth="10" 
                strokeLinecap="round"
              />
              <path 
                d="M 380 150 L 510 150 L 510 220 L 640 220" 
                fill="none" 
                stroke="#3B82F6" 
                strokeWidth="4" 
                marker-end="url(#flow-arrow)"
                className="conveyor-flow-line"
              />

              {/* Stamping to Assembler */}
              <path 
                d="M 380 320 L 510 320 L 510 220 L 640 220" 
                fill="none" 
                stroke="#E2E8F0" 
                strokeWidth="10" 
                strokeLinecap="round"
              />
              <path 
                d="M 380 320 L 510 320 L 510 220 L 640 220" 
                fill="none" 
                stroke="#3B82F6" 
                strokeWidth="4" 
                marker-end="url(#flow-arrow)"
                className="conveyor-flow-line"
              />

              {/* Assembler to Tester */}
              <path 
                d="M 640 220 L 900 220" 
                fill="none" 
                stroke="#E2E8F0" 
                strokeWidth="10" 
                strokeLinecap="round"
              />
              <path 
                d="M 640 220 L 900 220" 
                fill="none" 
                stroke="#3B82F6" 
                strokeWidth="4" 
                marker-end="url(#flow-arrow)"
                className="conveyor-flow-line"
              />
            </svg>

            {/* Machine nodes */}
            {states.map((state) => {
              const mInfo = nodePositions[state.machine_id] || { x: 500, y: 200, name: "Production Node" };
              const mMeta = machineMap.get(state.machine_id);
              const color = statusColor(state.status);
              const active = selectedNode === state.machine_id;

              return (
                <button
                  key={state.machine_id}
                  onClick={() => setSelectedNode(state.machine_id)}
                  className={`absolute flex flex-col justify-between p-4 rounded-xl border w-64 bg-white text-left transition-all z-10 ${
                    active 
                      ? "border-blue-600 shadow-xl shadow-blue-100 ring-2 ring-blue-600/10 scale-105" 
                      : "border-slate-200/80 shadow-md hover:border-blue-400 hover:shadow-lg"
                  }`}
                  style={{
                    left: mInfo.x - 128,
                    top: mInfo.y - 64,
                  }}
                >
                  {/* Node Status Glow and ID */}
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono-tech text-[10px] font-bold text-slate-400">{state.machine_id}</span>
                    <div className="flex items-center gap-1.5">
                      <span 
                        className={`h-2.5 w-2.5 rounded-full ${
                          color === "#EF4444" ? "pulse-glow-red" : 
                          color === "#F59E0B" ? "pulse-glow-amber" : "pulse-glow-green"
                        }`} 
                        style={{ backgroundColor: color }} 
                      />
                      <span className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color }}>{state.status}</span>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="mt-2.5">
                    <div className="text-xs font-bold text-slate-800 line-clamp-1">{mMeta?.name || state.machine_id}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{mInfo.name}</div>
                  </div>

                  {/* Visual input/output ports for high-tech spatial topology look */}
                  <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-400 border border-white shadow-inner z-20" />
                  <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-400 border border-white shadow-inner z-20" />

                  {/* Micro Metric gauges */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-4 gap-1 text-center">
                    <div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Health</div>
                      <div className="text-xs font-mono-tech font-black text-slate-800 mt-0.5">{state.health_score}%</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Risk</div>
                      <div className="text-xs font-mono-tech font-black text-slate-800 mt-0.5">{Math.round(state.failure_probability * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Load</div>
                      <div className="text-xs font-mono-tech font-black text-slate-800 mt-0.5">{state.energy_usage}kW</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Anomaly</div>
                      <div className="text-xs font-mono-tech font-black text-red-500 mt-0.5">{state.anomaly_score}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="w-full lg:w-80 bg-slate-50/50 p-6 flex flex-col justify-between border-t lg:border-t-0 border-slate-200">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech mb-4">
              Factory Diagnostics
            </div>
            
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Avg OEE Index</span>
                <div className="text-2xl font-black text-blue-600 font-mono-tech mt-1">{avgOee}%</div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${avgOee}%` }} />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Total Power Draw</span>
                <div className="text-2xl font-black text-slate-800 font-mono-tech mt-1">{totalEnergy} kW</div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-1">Sum of active machines</div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Telemetry Integrity</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Anomalies</span>
                    <span className={`text-sm font-mono-tech font-extrabold block mt-0.5 ${anomalyCount > 0 ? "text-red-500" : "text-emerald-500"}`}>
                      {anomalyCount}
                    </span>
                  </div>
                  <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Warnings</span>
                    <span className={`text-sm font-mono-tech font-extrabold block mt-0.5 ${warningCount > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                      {warningCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4 text-[9px] font-bold text-slate-400 uppercase tracking-wide font-mono-tech leading-relaxed">
            <span className="h-1.5 w-1.5 inline-block rounded-full bg-emerald-500 animate-pulse mr-1.5" />
            Conveyor pipelines active (60 Hz)
          </div>
        </div>
      </div>

      {/* Slide-over Side Drawer Overlay */}
      <AnimatePresence>
        {selectedNode && selectedState && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/10 backdrop-blur-xs z-25 flex justify-end"
            onClick={() => setSelectedNode(null)}
          >
            <motion.div 
              initial={{ x: 380 }}
              animate={{ x: 0 }}
              exit={{ x: 380 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-sm bg-white border-l border-slate-200 shadow-2xl h-full flex flex-col justify-between"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-slate-100 p-5 flex items-center justify-between">
                <div>
                  <div className="font-mono-tech text-[10px] font-bold text-slate-400">TELEMETRY DECK</div>
                  <h3 className="text-lg font-extrabold text-slate-800 mt-1">{selectedMachine?.name || selectedNode}</h3>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="icon-button rounded-full"
                  aria-label="Close telemetry deck"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Health Indicator panel */}
                <div className="rounded-xl border border-slate-150 p-4 flex items-center justify-between">
                  <div>
                    <div className="metric-label">Status Report</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-800">{selectedState.status.toUpperCase()}</span>
                      <StatusPill status={selectedState.status} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="metric-label">OEE Index</div>
                    <div className="text-lg font-black text-blue-600 font-mono-tech">{selectedState.health_score}%</div>
                  </div>
                </div>

                {/* Telemetry metrics list */}
                <div className="grid grid-cols-2 gap-3">
                  <DrawerStat label="Failure Risk" value={`${Math.round(selectedState.failure_probability * 100)}%`} icon={AlertOctagon} tone="amber" />
                  <DrawerStat label="Power Load" value={`${selectedState.energy_usage} kW`} icon={Zap} tone="blue" />
                  <DrawerStat label="Anomaly Index" value={selectedState.anomaly_score} icon={Heart} tone="red" />
                  <DrawerStat label="Status Priority" value={selectedState.health_score > 85 ? "Low" : "HIGH"} icon={Wrench} tone="slate" />
                </div>

                {/* Detailed Information specs */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2.5 text-xs font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Machine UUID:</span>
                    <span className="font-mono-tech font-bold text-slate-700">{selectedState.machine_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Device Type:</span>
                    <span className="text-slate-700 font-bold uppercase">{selectedMachine?.type || "Robot Extruder"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Facility Location:</span>
                    <span className="text-slate-700 font-bold">{selectedMachine?.location || "Bay 2 - Assembly Line"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Telemetry Cycle:</span>
                    <span className="text-slate-700 font-bold">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 p-5 bg-slate-50/50 flex gap-2">
                <Link 
                  href={`/machines/${selectedNode}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-md shadow-slate-300 hover:bg-slate-800"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>3D Explorer Portal</span>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DrawerStat({ 
  label, 
  value, 
  icon: Icon,
  tone
}: { 
  label: string; 
  value: React.ReactNode; 
  icon: any; 
  tone: "blue" | "green" | "amber" | "red" | "slate";
}) {
  const iconColors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-700"
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3.5 flex flex-col justify-between min-h-24">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className={`p-1.5 rounded-lg ${iconColors[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="text-lg font-extrabold text-slate-800 font-mono-tech mt-2">{value}</div>
    </div>
  );
}
