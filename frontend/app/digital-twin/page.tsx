"use client";

import { RefreshCcw, Server, Activity, AlertTriangle, ShieldCheck, Zap, Layers, Network, Gauge } from "lucide-react";
import { PageFrame } from "../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/data-states";
import { useCoreFactoryData } from "../../hooks/use-nextwin";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Position, 
  Handle,
  type Node,
  type Edge,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

export const dynamic = "force-dynamic";

type ViewMode = "floor" | "line" | "relations" | "oee" | "energy";

// Helper to determine status color
function getStatusColor(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("critical") || normalized.includes("emergency")) return "#EF4444"; // Red
  if (normalized.includes("warning")) return "#F59E0B"; // Yellow
  if (normalized.includes("maintenance")) return "#3B82F6"; // Blue
  return "#10B981"; // Green (Healthy)
}

// Mini SVG radial gauge component for OEE breakdowns
function RadialGauge({ value, size = 52, strokeWidth = 4, color = "#0EA5E9", label }: { value: number; size?: number; strokeWidth?: number; color?: string; label?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - value / 100);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle 
            cx={size / 2} 
            cy={size / 2} 
            r={radius} 
            stroke="#E2E8F0" 
            strokeWidth={strokeWidth} 
            fill="transparent" 
          />
          {/* Progress circle */}
          <circle 
            cx={size / 2} 
            cy={size / 2} 
            r={radius} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round" 
            fill="transparent" 
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono-tech font-black text-slate-800">
          {Math.round(value)}%
        </span>
      </div>
      {label && <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</span>}
    </div>
  );
}

// Custom Shopfloor Zone boundary node (renders in background)
function ZoneNode({ data }: NodeProps) {
  return (
    <div 
      className="border-2 border-dashed border-slate-200 bg-[#F8FAFC]/50 rounded-3xl p-5 flex flex-col justify-between pointer-events-none select-none"
      style={{ width: data.width, height: data.height }}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
        <span className="font-mono-tech text-[10px] font-black uppercase tracking-wider text-slate-400">
          {data.name}
        </span>
        <span className="text-[8px] font-extrabold text-slate-350 uppercase tracking-widest font-mono-tech">
          Production Area
        </span>
      </div>
      <div className="flex-1" />
    </div>
  );
}

// Custom Machine Node Component (w-[360px] - 40% larger than 256px original card)
function MachineNode({ data }: NodeProps) {
  const status = data.status || "Healthy";
  const viewMode = data.viewMode as ViewMode;
  
  const isCritical = status.toLowerCase().includes("critical") || status.toLowerCase().includes("emergency");
  const isWarning = status.toLowerCase().includes("warning");
  const isMaint = status.toLowerCase().includes("maintenance");
  
  const sColor = getStatusColor(status);

  // Status-coded borders and glows (Heatmap visual settings)
  let statusBorder = "border-slate-200";
  let statusBg = "bg-white";
  let statusBadge = "text-emerald-600 bg-emerald-50 border-emerald-250";
  let glowClass = "shadow-[0_4px_12px_rgba(15,23,42,0.03)]";

  if (isCritical) {
    statusBorder = "border-red-300";
    statusBg = "bg-red-50/40";
    statusBadge = "text-red-650 bg-red-50 border-red-200";
    glowClass = "shadow-[0_0_18px_rgba(239,68,68,0.12)] border-red-300";
  } else if (isWarning) {
    statusBorder = "border-amber-300";
    statusBg = "bg-amber-50/40";
    statusBadge = "text-amber-600 bg-amber-50 border-amber-200";
    glowClass = "shadow-[0_0_15px_rgba(245,158,11,0.08)] border-amber-300";
  } else if (isMaint) {
    statusBorder = "border-blue-300";
    statusBg = "bg-blue-50/40";
    statusBadge = "text-blue-600 bg-blue-50 border-blue-200";
    glowClass = "shadow-[0_0_15px_rgba(59,130,246,0.08)] border-blue-300";
  }

  // Calculate sub-metrics deterministically from Overall OEE (health) for OEE View gauges
  const availability = Math.max(70, 96 - (100 - data.health) * 0.4);
  const performance = Math.max(70, 98 - (100 - data.health) * 0.35);
  const quality = Math.max(80, 99 - (100 - data.health) * 0.2);

  return (
    <div className={`p-5 rounded-2xl border transition-all duration-300 w-[360px] ${statusBg} ${statusBorder} ${glowClass}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-slate-300 !border-slate-400" />
      
      {/* Header Info */}
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <span className="font-mono-tech text-[9px] text-slate-400 uppercase tracking-widest block font-bold">{data.id}</span>
          <h4 className="text-sm font-black text-slate-850 mt-0.5 line-clamp-1">{data.name}</h4>
          <span className="text-[10px] text-slate-500 block mt-0.5">{data.type} · {data.location}</span>
        </div>
        <span className={`text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full border tracking-wider shrink-0 mt-0.5 ${statusBadge}`}>
          {status}
        </span>
      </div>

      {/* Render OEE view radial gauges if active */}
      {viewMode === "oee" ? (
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-100 items-center">
          <RadialGauge value={data.health} size={54} color="#0EA5E9" label="OEE" />
          <RadialGauge value={availability} size={42} color="#10B981" label="Avail" />
          <RadialGauge value={performance} size={42} color="#F59E0B" label="Perf" />
          <RadialGauge value={quality} size={42} color="#8B5CF6" label="Qual" />
        </div>
      ) : (
        /* Default metrics block */
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-100 text-[10px] font-medium">
          <div className="flex justify-between items-center bg-slate-50/50 rounded-lg p-2 border border-slate-100">
            <span className="text-slate-400 uppercase font-mono-tech font-bold text-[8px]">OEE Health</span>
            <span className="font-mono-tech font-black text-slate-800">{data.health}%</span>
          </div>
          <div className="flex justify-between items-center bg-slate-50/50 rounded-lg p-2 border border-slate-100">
            <span className="text-slate-400 uppercase font-mono-tech font-bold text-[8px]">Power Load</span>
            <span className={`font-mono-tech font-black ${data.energy > 80 ? "text-red-500 animate-pulse font-black" : "text-slate-800"}`}>
              {data.energy} kW
            </span>
          </div>
          <div className="flex justify-between items-center bg-slate-50/50 rounded-lg p-2 border border-slate-100">
            <span className="text-slate-400 uppercase font-mono-tech font-bold text-[8px]">Failure Risk</span>
            <span className={`font-mono-tech font-black ${data.risk > 0.4 ? "text-amber-600 font-bold" : "text-slate-800"}`}>
              {Math.round(data.risk * 100)}%
            </span>
          </div>
          <div className="flex justify-between items-center bg-slate-50/50 rounded-lg p-2 border border-slate-100">
            <span className="text-slate-400 uppercase font-mono-tech font-bold text-[8px]">Anomaly Score</span>
            <span className={`font-mono-tech font-black ${data.anomaly > 0.4 ? "text-red-550 font-bold" : "text-slate-800"}`}>
              {data.anomaly}
            </span>
          </div>
        </div>
      )}
      
      {isCritical && (
        <div className="absolute -bottom-2 -right-2 bg-red-500 text-white p-1 rounded-full animate-bounce shadow-md">
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-slate-300 !border-slate-400" />
    </div>
  );
}

// Custom Central Gateway Hub Node
function GatewayNode({ data }: NodeProps) {
  return (
    <div className="p-4 rounded-full border-2 border-dashed border-[#0EA5E9] bg-blue-50/70 text-[#0EA5E9] shadow-md w-32 h-32 flex flex-col items-center justify-center text-center hover:scale-105 transition-transform duration-300">
      <Handle type="target" position={Position.Left} className="!bg-[#0EA5E9]" />
      <Server className="h-7 w-7 animate-pulse text-[#0EA5E9]" />
      <h4 className="text-[9px] font-black uppercase mt-1 leading-tight">{data.name}</h4>
      <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{data.status}</span>
      <Handle type="source" position={Position.Right} className="!bg-[#0EA5E9]" />
    </div>
  );
}

// React Flow static definitions defined OUTSIDE to prevent nodeTypes warning/error
const nodeTypes = {
  zoneNode: ZoneNode,
  machineNode: MachineNode,
  gatewayNode: GatewayNode,
};

export default function DigitalTwinPage() {
  const { machines, twin, alerts } = useCoreFactoryData();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [filter, setFilter] = useState<"all" | "healthy" | "warning" | "critical">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("floor");
  const [wsTwinUpdates, setWsTwinUpdates] = useState<Record<string, any>>({});

  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000")
      .replace(/^http/, "ws") + "/api/v1/ws/telemetry";
    
    console.log(`[WS CONNECT] Establishing telemetry stream at: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[WS CONNECTED] Real-time data pipeline established.");
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === "telemetry") {
          const update = payload.data;
          setWsTwinUpdates(prev => ({
            ...prev,
            [update.machine_id]: update
          }));
          queryClient.invalidateQueries({ queryKey: ["digital-twin"] });
        }
      } catch (err) {
        console.error("WS telemetry message parsing failed:", err);
      }
    };

    ws.onerror = (e) => {
      console.warn("WS pipeline socket connection error:", e);
    };

    return () => {
      ws.close();
    };
  }, [queryClient]);

  const rawStates = twin.data || [];
  const machineList = machines.data || [];

  // Data Consistency check: Merging alerts states directly with machine states
  const states = useMemo(() => {
    const active = alerts.data || [];
    const alertSeverityMap: Record<string, string> = {};
    active.forEach(alert => {
      if (alert.is_resolved) return;
      const current = alertSeverityMap[alert.machine_id] || "";
      const sev = alert.severity.toLowerCase();
      if (sev === "critical" || sev === "emergency") {
        alertSeverityMap[alert.machine_id] = "critical";
      } else if (sev === "warning" && current !== "critical") {
        alertSeverityMap[alert.machine_id] = "warning";
      } else if (sev === "maintenance" && current !== "critical" && current !== "warning") {
        alertSeverityMap[alert.machine_id] = "maintenance";
      }
    });

    return rawStates.map(s => {
      const wsUpdate = wsTwinUpdates[s.machine_id];
      let health = s.health_score;
      let energy = s.energy_usage;
      let risk = s.failure_probability;
      let anomaly = s.anomaly_score;
      let status = s.status;

      if (wsUpdate) {
        health = wsUpdate.health_score;
        energy = wsUpdate.energy_usage;
        risk = wsUpdate.failure_probability;
        anomaly = wsUpdate.anomaly_score;
        status = wsUpdate.status;
      }

      // Check alerts override for consistency
      const alertSeverity = alertSeverityMap[s.machine_id];
      if (alertSeverity === "critical") {
        status = "Critical";
      } else if (alertSeverity === "warning" && !status.toLowerCase().includes("critical")) {
        status = "Warning";
      } else if (alertSeverity === "maintenance" && !status.toLowerCase().includes("critical") && !status.toLowerCase().includes("warning")) {
        status = "Maintenance";
      }

      return {
        ...s,
        health_score: health,
        energy_usage: energy,
        failure_probability: risk,
        anomaly_score: anomaly,
        status
      };
    });
  }, [rawStates, wsTwinUpdates, alerts.data]);

  const machineMap = useMemo(() => new Map(machineList.map((m) => [m.id, m])), [machineList]);
  const twinMap = useMemo(() => new Map(states.map((s) => [s.machine_id, s])), [states]);

  // Aggregate counts
  const critical = useMemo(() => states.filter((state) => 
    state.status.toLowerCase().includes("critical") || state.status.toLowerCase().includes("emergency")
  ), [states]);
  const warning = useMemo(() => states.filter((state) => state.status.toLowerCase().includes("warning")), [states]);
  const healthy = useMemo(() => states.filter((state) => 
    !state.status.toLowerCase().includes("critical") && 
    !state.status.toLowerCase().includes("emergency") && 
    !state.status.toLowerCase().includes("warning")
  ), [states]);

  // Determine dynamic zone placement for machine nodes
  const getMachineZone = (mId: string) => {
    const m = machineMap.get(mId);
    if (!m) return "Assembly";
    const name = m.name.toLowerCase();
    const type = (m.type || "").toLowerCase();
    const id = mId.toLowerCase();
    
    if (id === "m_001" || type.includes("feed") || type.includes("conveyor") || name.includes("feed") || name.includes("conveyor")) {
      return "Assembly";
    }
    if (id === "m_002" || type.includes("cnc") || type.includes("mill") || name.includes("cnc") || name.includes("mill")) {
      return "CNC";
    }
    if (id === "m_003" || type.includes("press") || type.includes("stamp") || name.includes("press") || name.includes("stamp")) {
      return "Press";
    }
    if (id === "m_004" || type.includes("robot") || type.includes("weld") || type.includes("arm") || name.includes("robot") || name.includes("weld") || name.includes("arm")) {
      return "Welding";
    }
    return "Packaging";
  };

  // Generate layouts coordinates dynamically
  const layouts = useMemo(() => {
    const showZones = viewMode === "floor" || viewMode === "oee" || viewMode === "energy";
    
    // Zone limits & coordinates
    const zones = {
      Assembly: { x: 30, y: 110, w: 420, h: 425 },
      CNC: { x: 480, y: 30, w: 420, h: 290 },
      Press: { x: 480, y: 350, w: 420, h: 290 },
      Welding: { x: 930, y: 110, w: 420, h: 425 },
      Packaging: { x: 1380, y: 30, w: 420, h: 610 }
    };

    const nodeCoords: Record<string, { x: number; y: number }> = {};
    const zoneCounts: Record<string, number> = { Assembly: 0, CNC: 0, Press: 0, Welding: 0, Packaging: 0 };

    machineList.forEach((m) => {
      const zone = getMachineZone(m.id);
      const count = zoneCounts[zone];
      zoneCounts[zone] += 1;

      if (showZones) {
        // Position inside zone boundaries dynamically
        const z = zones[zone as keyof typeof zones];
        if (zone === "CNC" || zone === "Press") {
          nodeCoords[m.id] = { x: z.x + 30 + count * 380, y: z.y + 80 };
        } else if (zone === "Packaging" || zone === "Assembly" || zone === "Welding") {
          nodeCoords[m.id] = { x: z.x + 30, y: z.y + 80 + count * 240 };
        }
      } else if (viewMode === "line") {
        // Sequential Line View layout
        const idx = machineList.findIndex(item => item.id === m.id);
        nodeCoords[m.id] = { x: 80 + idx * 440, y: 220 };
      } else if (viewMode === "relations") {
        // Relationships hub layout in a circle around gateway
        const idx = machineList.findIndex(item => item.id === m.id);
        const radius = 350;
        const angle = (idx / Math.max(1, machineList.length)) * 2 * Math.PI;
        nodeCoords[m.id] = { 
          x: 520 + radius * Math.cos(angle) - 180, 
          y: 300 + radius * Math.sin(angle) - 60 
        };
      }
    });

    return { nodeCoords, zones };
  }, [machineList, viewMode]);

  // Combine zone boxes and machine cards into final Nodes list
  const nodes: Node[] = useMemo(() => {
    const list: Node[] = [];
    const showZones = viewMode === "floor" || viewMode === "oee" || viewMode === "energy";

    // 1. In factory layouts, inject background Zone nodes first (so they render behind cards)
    if (showZones) {
      const zoneData = [
        { id: "ZONE_A", name: "Assembly Zone", ...layouts.zones.Assembly },
        { id: "ZONE_B", name: "CNC Zone", ...layouts.zones.CNC },
        { id: "ZONE_C", name: "Press Zone", ...layouts.zones.Press },
        { id: "ZONE_D", name: "Welding Zone", ...layouts.zones.Welding },
        { id: "ZONE_E", name: "Packaging & Testing Zone", ...layouts.zones.Packaging },
      ];
      zoneData.forEach((z) => {
        list.push({
          id: z.id,
          type: "zoneNode",
          position: { x: z.x, y: z.y },
          zIndex: -5,
          data: { name: z.name, width: z.w, height: z.h },
        });
      });
    }

    // 2. Machine Node Cards
    const activeMachines = machineList.filter((m) => {
      const state = twinMap.get(m.id);
      if (!state) return false;
      if (filter === "all") return true;
      if (filter === "healthy") return !state.status.toLowerCase().includes("critical") && !state.status.toLowerCase().includes("emergency") && !state.status.toLowerCase().includes("warning");
      if (filter === "warning") return state.status.toLowerCase().includes("warning");
      return state.status.toLowerCase().includes("critical") || state.status.toLowerCase().includes("emergency");
    });

    activeMachines.forEach((m) => {
      const state = twinMap.get(m.id) || { status: "Healthy", health_score: 95, energy_usage: 45, failure_probability: 0.05, anomaly_score: 0.05 };
      const pos = layouts.nodeCoords[m.id] || { x: 100, y: 100 };
      
      list.push({
        id: m.id,
        type: "machineNode",
        position: pos,
        data: {
          id: m.id,
          name: m.name,
          type: m.type || "Conveyor Segment",
          location: m.location || "Shop Floor",
          status: state.status,
          health: state.health_score,
          energy: state.energy_usage,
          risk: state.failure_probability,
          anomaly: state.anomaly_score,
          viewMode,
        },
      });
    });

    // 3. Central OS Gateway Hub (Relations View only)
    if (viewMode === "relations") {
      list.push({
        id: "GATEWAY",
        type: "gatewayNode",
        position: { x: 520, y: 300 },
        data: {
          name: "Central Core Gateway",
          status: "Nominal System",
        },
      });
    }

    return list;
  }, [machineList, twinMap, filter, viewMode, layouts]);

  // Edges mapping
  const edges: Edge[] = useMemo(() => {
    const ids = machineList.map(m => m.id);

    if (viewMode === "relations") {
      return ids
        .filter(id => twinMap.has(id) || machineMap.has(id))
        .map((id) => ({
          id: `${id}-GATEWAY`,
          source: id,
          target: "GATEWAY",
          animated: true,
          style: { stroke: "#0EA5E9", strokeWidth: 2, strokeDasharray: "5,5" },
        }));
    }

    if (viewMode === "line") {
      const lineEdges: Edge[] = [];
      for (let i = 0; i < ids.length - 1; i++) {
        const sourceState = twinMap.get(ids[i]) || { energy_usage: 45 };
        const speed = sourceState.energy_usage > 75 ? 4.5 : 2;
        lineEdges.push({
          id: `${ids[i]}-${ids[i+1]}`,
          source: ids[i],
          target: ids[i+1],
          animated: true,
          style: { stroke: "#0EA5E9", strokeWidth: speed },
        });
      }
      return lineEdges;
    }

    // Default flow connections for Factory views (floor, oee, energy)
    const baseFlows = [
      { source: "M_001", target: "M_002" },
      { source: "M_001", target: "M_003" },
      { source: "M_002", target: "M_004" },
      { source: "M_003", target: "M_004" },
      { source: "M_004", target: "M_005" },
      { source: "M_005", target: "M_006" }
    ];

    // Connect rest dynamically
    const rest = ids.filter(id => !["M_001", "M_002", "M_003", "M_004", "M_005", "M_006"].includes(id));
    let last = "M_006";
    rest.forEach(id => {
      baseFlows.push({ source: last, target: id });
      last = id;
    });

    return baseFlows
      .filter((edge) => (twinMap.has(edge.source) || machineMap.has(edge.source)) && (twinMap.has(edge.target) || machineMap.has(edge.target)))
      .map((edge) => {
        const sourceState = twinMap.get(edge.source) || { status: "Healthy", energy_usage: 45 };
        const isCritical = sourceState.status.toLowerCase().includes("critical") || sourceState.status.toLowerCase().includes("emergency");
        const isWarning = sourceState.status.toLowerCase().includes("warning");
        
        let stroke = "#38BDF8";
        let width = 2.5;
        let animated = !isCritical;

        // Energy Flow specific load colors
        if (viewMode === "energy") {
          const load = sourceState.energy_usage;
          if (load > 80) {
            stroke = "#EF4444"; // Red for Peak Load
            width = 4.5;
          } else if (load > 55) {
            stroke = "#F59E0B"; // Yellow for Warning Load
            width = 3.2;
          } else {
            stroke = "#10B981"; // Green for Light Load
            width = 2.0;
          }
        } else {
          // Status Mode colors
          stroke = isCritical ? "#EF4444" : isWarning ? "#F59E0B" : "#0EA5E9";
          width = isCritical ? 4.0 : 2.5;
        }

        return {
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          animated,
          style: { stroke, strokeWidth: width },
        };
      });
  }, [machineList, twinMap, machineMap, viewMode]);

  // Dynamic calculations for total plant stats
  const avgOee = useMemo(() => {
    if (!states.length) return 98;
    return Math.round(states.reduce((acc, s) => acc + s.health_score, 0) / states.length);
  }, [states]);

  const totalLoad = useMemo(() => {
    if (!states.length) return 0;
    return Math.round(states.reduce((acc, s) => acc + s.energy_usage, 0));
  }, [states]);

  return (
    <PageFrame
      title="Conveyor System Layout"
      kicker="Spatial Digital Twin"
      actions={
        <button 
          onClick={() => { machines.refetch(); twin.refetch(); alerts.refetch(); }} 
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:border-slate-350 hover:text-slate-900 transition-all shadow-sm"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> 
          <span>Revalidate Twin</span>
        </button>
      }
    >
      {(machines.isLoading || twin.isLoading) && <LoadingBlock label="Polling physical telemetry adapters..." />}
      {machines.error && <ErrorBlock error={machines.error} onRetry={() => machines.refetch()} />}
      {twin.error && <ErrorBlock error={twin.error} onRetry={() => twin.refetch()} />}
      
      {!machines.isLoading && !twin.isLoading && !machines.error && !twin.error && (
        <div className="grid gap-6">
          
          {/* Quick Metrics Header */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <LiveTile label="Healthy Nodes" value={healthy.length} status="healthy" />
            <LiveTile label="Warning Indicators" value={warning.length} status="warning" />
            <LiveTile label="Critical Alarms" value={critical.length} status="critical" />
            <LiveTile label="System Energy Load" value={`${totalLoad} kW`} status="healthy" icon={<Zap className="h-4.5 w-4.5 text-yellow-500" />} />
          </div>

          {/* COMPACT FLOATING TOOLBAR (Single horizontal row merging views and filters) */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-white/80 border border-slate-200/80 rounded-2xl shadow-sm backdrop-blur-md">
            
            {/* View Selectors */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech mr-2 shrink-0">
                View overlays:
              </span>
              <div className="flex gap-1 shrink-0">
                {(["floor", "line", "relations", "oee", "energy"] as const).map((mode) => {
                  const label = 
                    mode === "floor" ? "Factory Floor" : 
                    mode === "line" ? "Production Line" : 
                    mode === "relations" ? "Relationships" : 
                    mode === "oee" ? "OEE Gauges" : "Energy Flow";
                  return (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`rounded-xl px-4 py-2 text-[9.5px] font-extrabold uppercase tracking-wider transition-all select-none border ${
                        viewMode === mode
                          ? "bg-slate-900 border-slate-900 text-white font-black shadow-sm"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Toggle Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech mr-2 shrink-0">
                Filter states:
              </span>
              <div className="flex gap-1 shrink-0">
                {(["all", "healthy", "warning", "critical"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`rounded-xl px-3.5 py-2 text-[9.5px] font-extrabold uppercase tracking-wider transition-all select-none border ${
                      filter === type
                        ? "bg-[#0EA5E9] border-[#0EA5E9] text-white font-black shadow-sm"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {type} ({type === "all" ? states.length : type === "healthy" ? healthy.length : type === "warning" ? warning.length : critical.length})
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* React Flow Board - Redesigned coordinates utilizing 70%+ space */}
          <div className="h-[620px] w-full rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm relative">
            {nodes.length > 0 ? (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => {
                  if (node.type === "machineNode") {
                    router.push(`/machines/${node.id}`);
                  }
                }}
                fitView
                className="bg-slate-50/20"
                minZoom={0.2}
                maxZoom={1.5}
                defaultViewport={{ x: 50, y: 50, zoom: 0.7 }}
              >
                <Background color="#0EA5E9" style={{ opacity: 0.04 }} gap={24} size={1} />
                <Controls className="!bg-white !border-slate-200 !text-slate-600 [&>button]:!bg-white [&>button]:!border-slate-100 [&>button]:!text-slate-550 [&>button:hover]:!text-[#0EA5E9]" />
                <MiniMap 
                  nodeColor={(node) => {
                    if (node.id === "GATEWAY") return "#0EA5E9";
                    if (node.type === "zoneNode") return "transparent";
                    const status = node.data?.status || "Healthy";
                    return getStatusColor(status);
                  }}
                  maskColor="rgba(248, 251, 255, 0.45)"
                  className="!bg-white !border-slate-200 [&>svg]:!opacity-95 shadow-md"
                />
              </ReactFlow>
            ) : (
              <EmptyBlock 
                title="No nodes match layout filters" 
                body="Adjust the status filter controls to inspect other conveyor nodes." 
              />
            )}
          </div>
          
        </div>
      )}
    </PageFrame>
  );
}

function LiveTile({ 
  label, 
  value, 
  status,
  icon
}: { 
  label: string; 
  value: React.ReactNode; 
  status: "healthy" | "warning" | "critical";
  icon?: React.ReactNode;
}) {
  const colors = {
    healthy: "text-emerald-600 bg-emerald-50 border-emerald-100",
    warning: "text-amber-600 bg-amber-50 border-amber-100",
    critical: "text-red-655 bg-red-50 border-red-100 animate-pulse"
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
      <div>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">{label}</span>
        <span className="text-xl font-mono-tech font-extrabold text-slate-800 block mt-2">{value}</span>
      </div>
      <span className={`p-2.5 rounded-full border ${colors[status]}`}>
        {icon ? icon : status === "healthy" ? <Server className="h-4.5 w-4.5" /> : status === "warning" ? <Activity className="h-4.5 w-4.5" /> : <AlertTriangle className="h-4.5 w-4.5" />}
      </span>
    </div>
  );
}
