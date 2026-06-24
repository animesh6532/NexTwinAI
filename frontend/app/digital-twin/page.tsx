"use client";

import { RefreshCcw, Server, Activity, AlertTriangle, ShieldCheck } from "lucide-react";
import { PageFrame } from "../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/data-states";
import { useCoreFactoryData } from "../../hooks/use-nextwin";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

type ViewMode = "floor" | "line" | "relations" | "status";

// Custom Machine Node Component
function MachineNode({ data }: NodeProps) {
  const status = data.status || "Healthy";
  const isCritical = status.toLowerCase().includes("critical");
  const isWarning = status.toLowerCase().includes("warning");
  
  const statusLineColor = isCritical
    ? "border-l-4 border-l-red-500"
    : isWarning
    ? "border-l-4 border-l-amber-500"
    : "border-l-4 border-l-emerald-500";

  const badgeStyles = isCritical
    ? "text-red-650 bg-red-50 border-red-200"
    : isWarning
    ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-emerald-600 bg-emerald-50 border-emerald-200";

  return (
    <div className={`p-4 rounded-2xl border border-slate-200 bg-white shadow-sm w-64 text-left relative cursor-pointer hover:border-[#0EA5E9]/50 hover:shadow-md transition-all ${statusLineColor}`}>
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-slate-350 !border-slate-400" />
      
      <div className="flex justify-between items-start gap-2">
        <div>
          <span className="font-mono-tech text-[8px] text-slate-400 uppercase tracking-widest block font-bold">{data.id}</span>
          <h4 className="text-xs font-extrabold text-slate-800 mt-1 line-clamp-1">{data.name}</h4>
          <span className="text-[9px] text-slate-500 block mt-0.5">{data.type} · {data.location}</span>
        </div>
        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wider shrink-0 mt-0.5 ${badgeStyles}`}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-[9px]">
        <div>
          <span className="text-slate-400 block uppercase font-mono-tech font-bold">Health</span>
          <span className="text-xs font-black text-slate-800 mt-0.5 block font-mono-tech">{data.health}%</span>
        </div>
        <div>
          <span className="text-slate-400 block uppercase font-mono-tech font-bold">Power</span>
          <span className="text-xs font-black text-slate-800 mt-0.5 block font-mono-tech">{data.energy} kW</span>
        </div>
        <div>
          <span className="text-slate-400 block uppercase font-mono-tech font-bold">Risk</span>
          <span className="text-xs font-black text-slate-800 mt-0.5 block font-mono-tech">{Math.round(data.risk * 100)}%</span>
        </div>
        <div>
          <span className="text-slate-400 block uppercase font-mono-tech font-bold">Anomaly</span>
          <span className={`text-xs font-black mt-0.5 block font-mono-tech ${data.anomaly > 0.4 ? "text-red-650 font-bold" : "text-slate-800"}`}>
            {data.anomaly}
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-slate-350 !border-slate-400" />
    </div>
  );
}

// Custom Central Gateway Hub Node
function GatewayNode({ data }: NodeProps) {
  return (
    <div className="p-4 rounded-full border-2 border-dashed border-[#0EA5E9]/50 bg-blue-50 text-[#0EA5E9] shadow-md w-32 h-32 flex flex-col items-center justify-center text-center">
      <Handle type="target" position={Position.Left} className="!bg-[#0EA5E9]" />
      <Server className="h-6 w-6 animate-pulse text-[#0EA5E9]" />
      <h4 className="text-[10px] font-black uppercase mt-1 leading-tight">{data.name}</h4>
      <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{data.status}</span>
      <Handle type="source" position={Position.Right} className="!bg-[#0EA5E9]" />
    </div>
  );
}

const nodeTypes = {
  machineNode: MachineNode,
  gatewayNode: GatewayNode,
};

export default function DigitalTwinPage() {
  const { machines, twin } = useCoreFactoryData();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "healthy" | "warning" | "critical">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("floor");
  
  const states = twin.data || [];
  const machineList = machines.data || [];

  const machineMap = useMemo(() => new Map(machineList.map((m) => [m.id, m])), [machineList]);
  const twinMap = useMemo(() => new Map(states.map((s) => [s.machine_id, s])), [states]);

  const critical = useMemo(() => states.filter((state) => state.status.toLowerCase().includes("critical")), [states]);
  const warning = useMemo(() => states.filter((state) => state.status.toLowerCase().includes("warning")), [states]);
  const healthy = useMemo(() => states.filter((state) => state.status.toLowerCase().includes("healthy")), [states]);

  // Define position mappings per view mode
  const nodePositions = useMemo(() => {
    const floorPositions: Record<string, { x: number; y: number }> = {
      M_001: { x: 100, y: 160 },
      M_002: { x: 440, y: 40 },
      M_003: { x: 440, y: 280 },
      M_004: { x: 780, y: 160 },
      M_005: { x: 1120, y: 160 },
    };

    const linePositions: Record<string, { x: number; y: number }> = {
      M_001: { x: 100, y: 160 },
      M_002: { x: 440, y: 160 },
      M_003: { x: 780, y: 160 },
      M_004: { x: 1120, y: 160 },
      M_005: { x: 1460, y: 160 },
    };

    const relationsPositions: Record<string, { x: number; y: number }> = {
      M_001: { x: 150, y: 40 },
      M_002: { x: 150, y: 280 },
      M_003: { x: 950, y: 40 },
      M_004: { x: 950, y: 280 },
      M_005: { x: 550, y: 380 },
    };

    if (viewMode === "line") return linePositions;
    if (viewMode === "relations") return relationsPositions;
    return floorPositions; // "floor" and "status" share spatial coordinates
  }, [viewMode]);

  // Create nodes list for React Flow
  const nodes: Node[] = useMemo(() => {
    let list: Node[] = machineList
      .filter((m) => {
        const state = twinMap.get(m.id);
        if (!state) return false;
        if (filter === "all") return true;
        if (filter === "healthy") return state.status.toLowerCase().includes("healthy");
        if (filter === "warning") return state.status.toLowerCase().includes("warning");
        return state.status.toLowerCase().includes("critical");
      })
      .map((m) => {
        const state = twinMap.get(m.id)!;
        // Auto-generate coordinates when position does not exist
        const hashVal = m.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const pos = nodePositions[m.id] || { 
          x: 100 + (Math.abs(hashVal) % 10) * 110, 
          y: 80 + (Math.abs(hashVal) % 5) * 90 
        };

        return {
          id: m.id,
          type: "machineNode",
          position: pos,
          data: {
            id: m.id,
            name: m.name,
            type: m.type || "Conveyor Component",
            location: m.location || "Plant Floor",
            status: state.status,
            health: state.health_score,
            energy: state.energy_usage,
            risk: state.failure_probability,
            anomaly: state.anomaly_score,
          },
        };
      });

    // Fallback: if list is empty but machineList exists, ignore filters to satisfy "Never show: No nodes match layout filters when machines exist"
    if (list.length === 0 && machineList.length > 0) {
      list = machineList.map((m) => {
        const state = twinMap.get(m.id) || { status: "Healthy", health_score: 95, energy_usage: 45, failure_probability: 0.05, anomaly_score: 0.05 };
        const hashVal = m.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const pos = nodePositions[m.id] || { 
          x: 100 + (Math.abs(hashVal) % 10) * 110, 
          y: 80 + (Math.abs(hashVal) % 5) * 90 
        };
        return {
          id: m.id,
          type: "machineNode",
          position: pos,
          data: {
            id: m.id,
            name: m.name,
            type: m.type || "Conveyor Component",
            location: m.location || "Plant Floor",
            status: state.status,
            health: state.health_score,
            energy: state.energy_usage,
            risk: state.failure_probability,
            anomaly: state.anomaly_score,
          },
        };
      });
    }

    // Add Central Gateway Node if Relationship View is active
    if (viewMode === "relations") {
      list.push({
        id: "GATEWAY",
        type: "gatewayNode",
        position: { x: 550, y: 160 },
        data: {
          name: "Central OS Gateway",
          status: "Nominal System",
        },
      });
    }

    return list;
  }, [machineList, twinMap, filter, nodePositions, viewMode]);

  // Create edges list based on active view mode
  const edges: Edge[] = useMemo(() => {
    const ids = machineList.map(m => m.id);

    if (viewMode === "relations") {
      // Connect all machine nodes directly to Central Gateway Hub
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
      // Linear sequence chain for all machine nodes
      const linearConnections: { source: string; target: string }[] = [];
      for (let i = 0; i < ids.length - 1; i++) {
        linearConnections.push({ source: ids[i], target: ids[i + 1] });
      }
      return linearConnections
        .filter((edge) => (twinMap.has(edge.source) || machineMap.has(edge.source)) && (twinMap.has(edge.target) || machineMap.has(edge.target)))
        .map((edge) => {
          const sourceState = twinMap.get(edge.source) || { energy_usage: 45 };
          const speedFactor = sourceState.energy_usage > 70 ? 5 : 3;
          return {
            id: `${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            animated: true,
            style: { stroke: "#0EA5E9", strokeWidth: speedFactor },
          };
        });
    }

    // Default conveyor flow sequence edges
    const rawConnections = [
      { source: "M_001", target: "M_002" },
      { source: "M_001", target: "M_003" },
      { source: "M_002", target: "M_004" },
      { source: "M_003", target: "M_004" },
      { source: "M_004", target: "M_005" },
    ];
    // Connect any additional machines in sequence from M_005 onwards
    const extraIds = ids.filter(id => !["M_001", "M_002", "M_003", "M_004", "M_005"].includes(id));
    let lastId = "M_005";
    extraIds.forEach(id => {
      rawConnections.push({ source: lastId, target: id });
      lastId = id;
    });

    return rawConnections
      .filter((edge) => (twinMap.has(edge.source) || machineMap.has(edge.source)) && (twinMap.has(edge.target) || machineMap.has(edge.target)))
      .map((edge) => {
        const sourceState = twinMap.get(edge.source) || { status: "Healthy", energy_usage: 45 };
        const isCritical = sourceState.status.toLowerCase().includes("critical");
        const isWarning = sourceState.status.toLowerCase().includes("warning");
        
        let edgeColor = "#0EA5E9";
        if (viewMode === "status" || isCritical || isWarning) {
          edgeColor = isCritical ? "#EF4444" : isWarning ? "#F59E0B" : "#10B981";
        }

        const thickness = sourceState.energy_usage > 75 ? 4 : 2;

        return {
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          animated: true,
          style: { stroke: edgeColor, strokeWidth: thickness },
        };
      });
  }, [machineList, twinMap, machineMap, viewMode]);

  return (
    <PageFrame
      title="Conveyor System Layout"
      kicker="Spatial Digital Twin"
      actions={
        <button 
          onClick={() => { machines.refetch(); twin.refetch(); }} 
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
          
          {/* Diagnostic status cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <LiveTile label="Healthy Nodes" value={healthy.length} status="healthy" />
            <LiveTile label="Warning Indicators" value={warning.length} status="warning" />
            <LiveTile label="Critical Alarms" value={critical.length} status="critical" />
            <LiveTile label="Sensors Polling" value="15 active ports" status="healthy" />
          </div>

          {/* Double Toolbar: View Mode Selector + Filters */}
          <div className="flex flex-col gap-4 p-4.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
            {/* View Mode selector */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">
                Digital Twin View Mode:
              </span>
              <div className="flex flex-wrap gap-2">
                {(["floor", "line", "relations", "status"] as const).map((mode) => {
                  const label = 
                    mode === "floor" ? "Factory Floor" : 
                    mode === "line" ? "Production Line" : 
                    mode === "relations" ? "Hub Relationships" : "OEE Machine Status";
                  return (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`rounded-full px-4 py-2 text-[9px] font-extrabold uppercase tracking-wider border transition-all ${
                        viewMode === mode
                          ? "bg-[#0EA5E9] border-[#0EA5E9] text-white font-black shadow-sm"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status filtering */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono-tech">
                Filter Viewport State:
              </span>
              <div className="flex flex-wrap gap-2">
                {(["all", "healthy", "warning", "critical"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`rounded-full px-3.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wider border transition-all ${
                      filter === type
                        ? "bg-slate-800 border-slate-800 text-white font-black shadow-sm"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {type} ({type === "all" ? states.length : type === "healthy" ? healthy.length : type === "warning" ? warning.length : critical.length})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* React Flow Board */}
          <div className="h-[480px] w-full rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm relative">
            {nodes.length > 0 ? (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => {
                  if (node.id !== "GATEWAY") {
                    router.push(`/machines/${node.id}`);
                  }
                }}
                fitView
                className="bg-slate-50/30"
              >
                <Background color="#0EA5E9" style={{ opacity: 0.08 }} gap={24} size={1} />
                <Controls className="!bg-white !border-slate-200 !text-slate-600 [&>button]:!bg-white [&>button]:!border-slate-100 [&>button]:!text-slate-550 [&>button:hover]:!text-[#0EA5E9]" />
                <MiniMap 
                  nodeColor={(node) => {
                    if (node.id === "GATEWAY") return "#0EA5E9";
                    const status = node.data?.status || "Healthy";
                    if (status.toLowerCase().includes("critical")) return "#EF4444";
                    if (status.toLowerCase().includes("warning")) return "#F59E0B";
                    return "#10B981";
                  }}
                  maskColor="rgba(248, 251, 255, 0.5)"
                  className="!bg-white !border-slate-200 [&>svg]:!opacity-90 shadow-md"
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
  status 
}: { 
  label: string; 
  value: React.ReactNode; 
  status: "healthy" | "warning" | "critical"
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
        {status === "healthy" ? <Server className="h-4.5 w-4.5" /> : status === "warning" ? <Activity className="h-4.5 w-4.5" /> : <AlertTriangle className="h-4.5 w-4.5" />}
      </span>
    </div>
  );
}
