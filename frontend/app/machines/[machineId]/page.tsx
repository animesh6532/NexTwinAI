"use client";

import { useParams, useRouter } from "next/navigation";
import { PageFrame } from "../../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, Field, LoadingBlock, MiniLine, StatusPill } from "../../../components/data-states";
import { MachineModelScene } from "../../../components/factory-visuals";
import { 
  useMachine, 
  usePredictionMutations,
  useUpdateMachine,
  useDeleteMachine,
  useRegisterMachine,
  queryKeys
} from "../../../hooks/use-nextwin";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { nextwinApi } from "../../../services/nextwin-api";
import { 
  Play, 
  Settings, 
  Zap, 
  Activity, 
  AlertTriangle, 
  Wrench,
  Radio,
  Clock,
  TrendingUp,
  Workflow,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Gauge,
  Thermometer,
  Percent,
  Calendar,
  Layers,
  Database
} from "lucide-react";

type Machine3DMode = "default" | "exploded" | "health" | "anomaly" | "energy" | "maintenance";
type TabType = "overview" | "health" | "energy" | "anomalies" | "forecasts" | "twin";

export const dynamic = "force-dynamic";

// High-fidelity SVG chart component for forecasts & histories
function SVGChart({ data, color = "#0EA5E9", minVal, maxVal }: { data: number[]; color?: string; minVal?: number; maxVal?: number }) {
  if (!data || data.length === 0) {
    return <div className="h-32 flex items-center justify-center text-xs text-slate-400">No data points available</div>;
  }
  const width = 500;
  const height = 150;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const min = minVal !== undefined ? minVal : Math.min(...data);
  const max = maxVal !== undefined ? maxVal : Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((val - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points[0]} ${points.slice(1).map(p => `L ${p}`).join(" ")}`;
  const fillD = `${pathD} L ${padding + chartWidth},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const y = padding + ratio * chartHeight;
        return (
          <line
            key={i}
            x1={padding}
            y1={y}
            x2={width - padding}
            y2={y}
            stroke="#F1F5F9"
            strokeWidth="1.5"
            strokeDasharray="4"
          />
        );
      })}
      <path d={fillD} fill={`url(#grad-${color.replace("#", "")})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={padding} cy={points[0].split(",")[1]} r="4" fill={color} stroke="white" strokeWidth="2" />
      <circle cx={width - padding} cy={points[points.length - 1].split(",")[1]} r="4" fill={color} stroke="white" strokeWidth="2" />
    </svg>
  );
}

export default function MachineDetailPage() {
  const params = useParams<{ machineId: string }>();
  const router = useRouter();
  const machineId = decodeURIComponent(params.machineId);
  const { machine, twin, sensors } = useMachine(machineId);
  const mutations = usePredictionMutations();
  const [modelMode, setModelMode] = useState<Machine3DMode>("default");
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // State for administrative forms
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("M");
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState("Active");
  const [initialized, setInitialized] = useState(false);

  const [regId, setRegId] = useState("");
  const [regName, setRegName] = useState("");

  // Forecast Horizon Selection
  const [horizon, setHorizon] = useState<30 | 90>(30);

  const updateMachine = useUpdateMachine();
  const deleteMachine = useDeleteMachine();
  const registerMachine = useRegisterMachine();

  // Queries for histories and forecasts
  const anomalyHistory = useQuery({
    queryKey: queryKeys.anomalyHistory(machineId),
    queryFn: () => nextwinApi.anomalyHistory(machineId),
    enabled: Boolean(machineId),
  });

  const energyHistory = useQuery({
    queryKey: queryKeys.energyHistory(machineId),
    queryFn: () => nextwinApi.energyHistory(machineId),
    enabled: Boolean(machineId),
  });

  const bottleneckHistory = useQuery({
    queryKey: queryKeys.bottleneckHistory(machineId),
    queryFn: () => nextwinApi.bottleneckHistory(machineId),
    enabled: Boolean(machineId),
  });

  const forecast = useQuery({
    queryKey: ["forecast", machineId, horizon],
    queryFn: () => nextwinApi.predictForecast(machineId, horizon),
    enabled: Boolean(machineId),
  });

  if (machine.data && !initialized) {
    setEditName(machine.data.name);
    setEditType(machine.data.type || "M");
    setEditLocation(machine.data.location || "");
    setEditStatus(machine.data.operational_status || "Active");
    setInitialized(true);
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    updateMachine.mutate({
      machineId,
      payload: {
        name: editName,
        type: editType,
        location: editLocation,
        operational_status: editStatus
      }
    }, {
      onSuccess: () => {
        alert("Machine node details updated successfully!");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to decommission this industrial asset node?")) return;
    deleteMachine.mutate(machineId, {
      onSuccess: () => {
        router.push("/machines");
      }
    });
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regId || !regName) return;
    registerMachine.mutate({
      id: regId,
      name: regName,
      type: "M",
      operational_status: "Active"
    }, {
      onSuccess: () => {
        const newId = regId;
        setRegId("");
        setRegName("");
        alert(`Registered machine node ${newId} successfully!`);
        router.push(`/machines/${newId}`);
      }
    });
  }

  const runningPrediction = 
    mutations.health.isPending || 
    mutations.anomaly.isPending || 
    mutations.energy.isPending || 
    mutations.bottleneck.isPending;

  const modeButtons = [
    { id: "default", label: "Default View", icon: Settings, color: "hover:border-[#0EA5E9]/40 hover:text-slate-800" },
    { id: "exploded", label: "Exploded Structure", icon: Wrench, color: "hover:border-[#0EA5E9]/40 hover:text-slate-800" },
    { id: "health", label: "Health Overstrain", icon: Activity, color: "hover:border-emerald-500/40 hover:text-slate-800" },
    { id: "anomaly", label: "Anomaly Scan", icon: AlertTriangle, color: "hover:border-red-500/40 hover:text-slate-800" },
    { id: "energy", label: "Energy Flow", icon: Zap, color: "hover:border-yellow-500/40 hover:text-slate-800" },
    { id: "maintenance", label: "Fatigue Wear", icon: Settings, color: "hover:border-indigo-500/40 hover:text-slate-800" },
  ] as const;

  const spatialTwinMock = useMemo(() => {
    if (machineId === "M_001") return { prev: "Input Feed", next: "M_002 / M_003" };
    if (machineId === "M_002" || machineId === "M_003") return { prev: "M_001", next: "M_004" };
    if (machineId === "M_004") return { prev: "M_002 / M_003", next: "M_005" };
    return { prev: "M_004", next: "Output Sort" };
  }, [machineId]);

  return (
    <PageFrame title={machine.data?.name || machineId} kicker="3D Digital Twin Command Portal">
      {(machine.isLoading || twin.isLoading || sensors.isLoading) && <LoadingBlock label="Polling machine node diagnostics..." />}
      {machine.error && <ErrorBlock error={machine.error} onRetry={() => machine.refetch()} />}
      {twin.error && <ErrorBlock error={twin.error} onRetry={() => twin.refetch()} />}
      {sensors.error && <ErrorBlock error={sensors.error} onRetry={() => sensors.refetch()} />}

      {!machine.isLoading && !twin.isLoading && !sensors.isLoading && !machine.error && !twin.error && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          
          {/* Left Column: Refactored 6 Tabs Panel */}
          <div className="flex flex-col gap-4">
            
            {/* Tabs List Header - Light Theme Industrial Polish */}
            <div className="flex border-b border-slate-200/80 gap-1 overflow-x-auto bg-white px-4 pt-2 rounded-t-2xl shadow-sm scrollbar-none">
              {(["overview", "health", "energy", "anomalies", "forecasts", "twin"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                    activeTab === tab 
                      ? "border-[#0EA5E9] text-[#0EA5E9] font-black" 
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab.replace("twin", "digital twin").replace("anomalies", "anomalies")}
                </button>
              ))}
            </div>

            {/* Tab Contents Frame */}
            <div className="flex-1 flex flex-col gap-4 bg-white border border-slate-200/80 p-6 rounded-b-2xl shadow-sm min-h-[460px]">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Asset Visualization</span>
                    <h3 className="text-base font-extrabold text-slate-950 mt-0.5">3D Physical Twin Assembly</h3>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-1.5 shadow-inner">
                    <MachineModelScene state={twin.data} mode={modelMode} type={machine.data?.type} />
                  </div>
                  
                  {/* Explode / Diagnostic toggles */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-1.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                    {modeButtons.map((btn) => {
                      const Icon = btn.icon;
                      const active = modelMode === btn.id;
                      return (
                        <button
                          key={btn.id}
                          onClick={() => setModelMode(btn.id)}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${btn.color} ${
                            active 
                              ? "bg-white border-[#0EA5E9]/30 text-[#0EA5E9] font-bold shadow-sm" 
                              : "bg-transparent border-transparent text-slate-500"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="text-[8px] font-bold uppercase tracking-wide mt-1 leading-none">{btn.label.split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Technical Specifications Grid */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden mt-2">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono-tech">
                      Physical Asset Specifications
                    </div>
                    <table className="w-full text-left border-collapse text-xs">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="px-4 py-2.5 font-bold text-slate-500 bg-slate-50/30 w-1/3">Motor RPM Rating</td>
                          <td className="px-4 py-2.5 font-mono text-slate-800 font-bold">3,600 RPM max limit</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="px-4 py-2.5 font-bold text-slate-500 bg-slate-50/30">System Input Current</td>
                          <td className="px-4 py-2.5 font-mono text-slate-800 font-bold">480V | 3-Phase AC</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="px-4 py-2.5 font-bold text-slate-500 bg-slate-50/30">Chassis Material</td>
                          <td className="px-4 py-2.5 text-slate-800 font-semibold">Hardened Structural Steel</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="px-4 py-2.5 font-bold text-slate-500 bg-slate-50/30">Operating Air Pressure</td>
                          <td className="px-4 py-2.5 font-mono text-slate-800 font-bold">0.65 - 0.85 MPa</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-bold text-slate-500 bg-slate-50/30">Hardware Serial Code</td>
                          <td className="px-4 py-2.5 font-mono text-[#0EA5E9] font-black">NTX-{machineId}-2026-GW</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: HEALTH */}
              {activeTab === "health" && (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Predictive Maintenance</span>
                      <h3 className="text-base font-extrabold text-slate-950 mt-0.5">Asset Health Index</h3>
                    </div>
                    <button
                      disabled={mutations.health.isPending}
                      onClick={() => mutations.health.mutate({ id: machineId, type: machine.data?.type || "CNC" })}
                      className="px-3 py-1.5 rounded-lg bg-[#EAF6FF] border border-[#0EA5E9]/20 hover:border-[#0EA5E9]/50 text-[#0EA5E9] text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <Gauge className="h-3 w-3" />
                      Run Health Inference
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Radial SVG Gauge Card */}
                    <div className="border border-slate-100 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50/40">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono-tech block mb-4">Overall OEE Health</span>
                      <div className="relative flex items-center justify-center h-28 w-28">
                        <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" stroke="#E2E8F0" strokeWidth="8" fill="transparent" />
                          <circle cx="50" cy="50" r="40" stroke="#0EA5E9" strokeWidth="8" fill="transparent" 
                            strokeDasharray={2 * Math.PI * 40}
                            strokeDashoffset={2 * Math.PI * 40 * (1 - (twin.data?.health_score || 0) / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="text-center">
                          <span className="text-2xl font-black text-slate-900 font-mono">{twin.data?.health_score || 0}%</span>
                          <span className="text-[8px] font-extrabold text-emerald-600 block uppercase mt-0.5">HEALTHY</span>
                        </div>
                      </div>
                    </div>

                    {/* RUL & Fatigue indicators */}
                    <div className="border border-slate-100 rounded-xl p-5 bg-white space-y-4">
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Remaining Useful Life (RUL)</span>
                        <div className="text-xl font-black text-slate-800 mt-1 font-mono-tech">
                          {twin.data ? Math.round((twin.data.health_score / 100) * 8500) : 0} Hours
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${twin.data?.health_score || 0}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Failure Probability</span>
                        <div className="text-xl font-black text-slate-800 mt-1 font-mono-tech">
                          {twin.data ? Math.round(twin.data.failure_probability * 100) : 0}% Risk
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="bg-red-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${(twin.data?.failure_probability || 0) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Health Inference Results Output */}
                  {mutations.health.data && (
                    <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/30 text-xs mt-2">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold mb-2">
                        <Sparkles className="h-4 w-4" />
                        Inference Output Generated Successfully
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-2 font-mono text-[10px]">
                        <div>Failure Predicted: <span className="font-bold text-slate-800">{mutations.health.data.failure_predicted ? "YES" : "NO"}</span></div>
                        <div>Maintenance Priority: <span className="font-bold text-[#0EA5E9] uppercase">{mutations.health.data.maintenance_priority}</span></div>
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1.5 leading-relaxed">
                        <strong className="text-slate-700">Top Degradation Contributors:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          {mutations.health.data.top_factors?.map((f: string, i: number) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ENERGY */}
              {activeTab === "energy" && (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Resource Intelligence</span>
                      <h3 className="text-base font-extrabold text-slate-950 mt-0.5">Energy & Load Profiling</h3>
                    </div>
                    <button
                      disabled={mutations.energy.isPending}
                      onClick={() => mutations.energy.mutate(machineId)}
                      className="px-3 py-1.5 rounded-lg bg-[#EAF6FF] border border-[#0EA5E9]/20 hover:border-[#0EA5E9]/50 text-[#0EA5E9] text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <Zap className="h-3 w-3" />
                      Optimize Energy Draw
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono-tech block">Thermal Draw Load</span>
                      <div className="text-2xl font-black text-slate-900 mt-1.5 font-mono">{twin.data?.energy_usage || 0} <span className="text-xs font-semibold text-slate-500">kW</span></div>
                      <span className="text-[8px] text-[#0EA5E9] font-bold block mt-1.5 uppercase font-mono-tech">Primary power line active</span>
                    </div>

                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono-tech block">Optimization Score</span>
                      <div className="text-2xl font-black text-emerald-600 mt-1.5 font-mono">
                        {energyHistory.data?.[0]?.energy_optimization_score || 94}%
                      </div>
                      <span className="text-[8px] text-emerald-600 font-bold block mt-1.5 uppercase">Excellent utilization</span>
                    </div>

                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono-tech block">Energy Waste Factor</span>
                      <div className="text-2xl font-black text-amber-600 mt-1.5 font-mono">
                        {energyHistory.data?.[0]?.predicted_energy_waste_pct || 4.2}%
                      </div>
                      <span className="text-[8px] text-amber-500 font-bold block mt-1.5 uppercase font-mono-tech">Sub-threshold limits</span>
                    </div>
                  </div>

                  {/* Energy optimization recommendations */}
                  <div className="border border-slate-100 rounded-xl p-4 mt-2">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-3 font-mono-tech">Recommended Savings Actions</span>
                    <div className="space-y-2">
                      {(energyHistory.data?.[0]?.optimization_recommendations || [
                        { action: "Reduce standby cooling cycle during tool transitions", estimated_thermal_load_savings_kw: 1.4, priority: "High" },
                        { action: "Calibrate spindle lubrication feed rates to minimize drag", estimated_thermal_load_savings_kw: 0.8, priority: "Medium" }
                      ]).map((rec, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg text-xs border border-slate-100">
                          <div>
                            <span className="font-bold text-slate-700 block">{rec.action}</span>
                            <span className="text-[9px] text-[#0EA5E9] font-bold font-mono">Est. Savings: {rec.estimated_thermal_load_savings_kw} kW</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                            rec.priority === "High" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                          }`}>{rec.priority} Priority</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Energy Inference Outputs if available */}
                  {mutations.energy.data && (
                    <div className="border border-[#0EA5E9]/20 rounded-xl p-4 bg-[#EAF6FF]/30 text-xs">
                      <div className="flex items-center gap-1.5 text-[#0EA5E9] font-bold mb-2">
                        <Sparkles className="h-4 w-4" />
                        Energy Optimization Result
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div>Heating Load: <span className="font-bold text-slate-800">{mutations.energy.data.predicted_heating_load} kW</span></div>
                        <div>Cooling Load: <span className="font-bold text-slate-800">{mutations.energy.data.predicted_cooling_load} kW</span></div>
                      </div>
                    </div>
                  )}

                  {/* Energy History Log */}
                  <div className="space-y-2 mt-2">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Historical Energy Load logs</span>
                    <div className="max-h-32 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                      {(energyHistory.data || []).slice(0, 5).map((log, i) => (
                        <div key={i} className="flex justify-between items-center p-2.5 text-[10px] font-mono hover:bg-slate-50">
                          <span className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                          <span className="font-bold text-slate-800">{log.predicted_heating_load || 0} kW draw</span>
                        </div>
                      ))}
                      {(!energyHistory.data || energyHistory.data.length === 0) && (
                        <div className="text-center py-4 text-xs text-slate-400 font-mono uppercase">No telemetry records cached.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ANOMALIES */}
              {activeTab === "anomalies" && (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Neural Outlier Scan</span>
                      <h3 className="text-base font-extrabold text-slate-950 mt-0.5">Telemetry Anomalies Log</h3>
                    </div>
                    <button
                      disabled={mutations.anomaly.isPending}
                      onClick={() => mutations.anomaly.mutate(machineId)}
                      className="px-3 py-1.5 rounded-lg bg-[#EAF6FF] border border-[#0EA5E9]/20 hover:border-[#0EA5E9]/50 text-[#0EA5E9] text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Inference Telemetry Scan
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono-tech block">Neural Anomaly Rating</span>
                      <div className="text-2xl font-black text-slate-900 mt-1.5 font-mono">{twin.data?.anomaly_score || 0} <span className="text-xs font-semibold text-slate-400">/ 1.0</span></div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                        <div 
                          className="bg-slate-600 h-full rounded-full transition-all" 
                          style={{ width: `${(twin.data?.anomaly_score || 0) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono-tech block">Outlier Detection Method</span>
                      <div className="text-base font-extrabold text-slate-800 mt-2 uppercase font-mono-tech">
                        {anomalyHistory.data?.[0]?.method || "Isolation Forest (SKLearn)"}
                      </div>
                      <span className="text-[8px] text-slate-500 font-bold block mt-1.5 uppercase">Telemetry Auto-Calibrated</span>
                    </div>
                  </div>

                  {/* Live Run Result */}
                  {mutations.anomaly.data && (
                    <div className={`border rounded-xl p-4 text-xs font-mono ${
                      mutations.anomaly.data.anomaly_detected ? "border-red-100 bg-red-50/30 text-red-700" : "border-emerald-100 bg-emerald-50/30 text-emerald-700"
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <Sparkles className="h-4 w-4" />
                        Outlier Scan Complete: {mutations.anomaly.data.anomaly_detected ? "ANOMALY DETECTED" : "NORMAL TELEMETRY"}
                      </div>
                      <div className="text-[9px]">Anomaly Score: {mutations.anomaly.data.anomaly_score} | Method: {mutations.anomaly.data.method}</div>
                    </div>
                  )}

                  {/* History Timeline */}
                  <div className="space-y-2 mt-2">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Historical Anomaly Logs</span>
                    <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
                      {(anomalyHistory.data || []).slice(0, 8).map((log, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 text-xs font-mono hover:bg-slate-50">
                          <div>
                            <span className="font-bold text-slate-800 block">Score: {log.anomaly_score}</span>
                            <span className="text-[9px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                            log.anomaly_detected ? "bg-red-100 text-red-655" : "bg-emerald-100 text-emerald-700"
                          }`}>{log.anomaly_detected ? "Anomaly" : "Healthy"}</span>
                        </div>
                      ))}
                      {(!anomalyHistory.data || anomalyHistory.data.length === 0) && (
                        <div className="text-center py-6 text-xs text-slate-400 font-mono uppercase">No anomalies recorded.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: FORECASTS */}
              {activeTab === "forecasts" && (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">LSTM & XGBoost Recursive Lag</span>
                      <h3 className="text-base font-extrabold text-slate-950 mt-0.5">Predictive Horizon Forecasts</h3>
                    </div>
                    {/* Horizon selection toggle */}
                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                      <button
                        onClick={() => setHorizon(30)}
                        className={`px-3 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${
                          horizon === 30 ? "bg-white text-slate-900 shadow-sm font-black" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        30D Horizon
                      </button>
                      <button
                        onClick={() => setHorizon(90)}
                        className={`px-3 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${
                          horizon === 90 ? "bg-white text-slate-900 shadow-sm font-black" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        90D Horizon
                      </button>
                    </div>
                  </div>

                  {forecast.isLoading && <LoadingBlock label="Calculating time-series recursive sequences..." />}
                  {forecast.error && <ErrorBlock error={forecast.error} onRetry={() => forecast.refetch()} />}

                  {forecast.data && (
                    <div className="space-y-6">
                      
                      {/* Stacked Sparkline Chart Grid */}
                      <div className="grid md:grid-cols-3 gap-4">
                        {/* 1. Failure Risk Forecast */}
                        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                          <div className="flex justify-between items-start">
                            <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider font-mono-tech">Failure Risk Forecast</span>
                            <span className="text-xs font-mono font-bold text-red-500">
                              {Math.round(Math.max(...forecast.data.failure_risk_forecast) * 100)}% Max
                            </span>
                          </div>
                          <div className="mt-4">
                            <SVGChart 
                              data={forecast.data.failure_risk_forecast.map(v => v * 100)} 
                              color="#EF4444" 
                              minVal={0} 
                              maxVal={100} 
                            />
                          </div>
                        </div>

                        {/* 2. Energy Draw Forecast */}
                        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                          <div className="flex justify-between items-start">
                            <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider font-mono-tech">Energy Load Forecast</span>
                            <span className="text-xs font-mono font-bold text-yellow-600">
                              {Math.round(forecast.data.energy_forecast.reduce((a,b)=>a+b, 0) / forecast.data.energy_forecast.length)} kW avg
                            </span>
                          </div>
                          <div className="mt-4">
                            <SVGChart 
                              data={forecast.data.energy_forecast} 
                              color="#EAB308" 
                            />
                          </div>
                        </div>

                        {/* 3. Throughput Forecast */}
                        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                          <div className="flex justify-between items-start">
                            <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider font-mono-tech">Production Volume</span>
                            <span className="text-xs font-mono font-bold text-[#0EA5E9]">
                              {Math.round(forecast.data.throughput_forecast.reduce((a,b)=>a+b, 0))} units
                            </span>
                          </div>
                          <div className="mt-4">
                            <SVGChart 
                              data={forecast.data.throughput_forecast} 
                              color="#0EA5E9" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Day-by-Day Forecast values List */}
                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono-tech">
                          <span>Day-By-Day Trend Projections</span>
                          <span className="text-[#0EA5E9] font-black uppercase">Auto-Updated</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {forecast.data.throughput_forecast.map((val, idx) => {
                            const risk = forecast.data.failure_risk_forecast[idx] || 0;
                            const energy = forecast.data.energy_forecast[idx] || 0;
                            return (
                              <div key={idx} className="px-4 py-2.5 flex justify-between items-center text-[10px] font-mono hover:bg-slate-50/60">
                                <span className="font-bold text-slate-500">Day +{idx + 1}</span>
                                <div className="flex gap-4">
                                  <span>Output: <strong className="text-slate-800">{val} u</strong></span>
                                  <span>Load: <strong className="text-slate-800">{energy} kW</strong></span>
                                  <span>Risk: <strong className={risk * 100 > 30 ? "text-red-500 font-bold" : "text-emerald-600 font-bold"}>{Math.round(risk * 100)}%</strong></span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: DIGITAL TWIN */}
              {activeTab === "twin" && (
                <div className="flex flex-col gap-6 justify-between min-h-[380px]">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Spatial Neighborhood Map</span>
                    <h3 className="text-base font-extrabold text-slate-950 mt-0.5">Conveyor Pipeline Sequence</h3>
                    <p className="text-xs text-slate-550 mt-2 leading-relaxed">
                      This machine node operates as a critical segment in the plant assembly sequence. Below is its real-time upstream and downstream conveyor mapping.
                    </p>
                  </div>

                  {/* Flowchart Layout */}
                  <div className="my-6 relative flex items-center justify-center bg-slate-50/50 p-8 rounded-xl border border-slate-100 overflow-hidden">
                    <div className="flex justify-between items-center w-full max-w-[480px] z-10 font-mono text-xs">
                      {/* Upstream */}
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                        <span className="text-[8px] text-slate-500 uppercase block tracking-wider font-bold">Upstream</span>
                        <span className="text-slate-800 font-black block mt-1">{spatialTwinMock.prev}</span>
                      </div>
                      
                      {/* Flowing Connector */}
                      <div className="h-[2px] flex-1 border-t border-dashed border-[#0EA5E9] relative">
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[#0EA5E9] animate-ping" />
                      </div>

                      {/* Active Machine */}
                      <div className="rounded-xl border border-[#0EA5E9]/40 bg-[#EAF6FF] px-5 py-4 text-center ring-2 ring-[#0EA5E9]/10 shadow-sm relative">
                        <span className="text-[8px] text-[#0EA5E9] uppercase block tracking-widest font-bold">Active Asset</span>
                        <span className="text-[#0EA5E9] font-black block mt-1">{machineId}</span>
                        <span className="text-[9px] text-emerald-600 block mt-1 font-bold">{twin.data?.status || "HEALTHY"}</span>
                      </div>

                      {/* Flowing Connector */}
                      <div className="h-[2px] flex-1 border-t border-dashed border-[#0EA5E9] relative">
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[#0EA5E9] animate-ping" />
                      </div>

                      {/* Downstream */}
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                        <span className="text-[8px] text-slate-500 uppercase block tracking-wider font-bold">Downstream</span>
                        <span className="text-slate-800 font-black block mt-1">{spatialTwinMock.next}</span>
                      </div>
                    </div>
                  </div>

                  {/* Connected Local Details Overlay */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-white grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider font-mono-tech">OEE Feed Rate</span>
                      <span className="text-slate-800 font-black mt-1 block">94.8% SLA Target</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider font-mono-tech">Estimated Latency</span>
                      <span className="text-slate-800 font-black mt-1 block">&lt; 12ms realtime sync</span>
                    </div>
                  </div>

                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex justify-between border-t border-slate-100 pt-3 font-mono-tech">
                    <span>Grid Location Coordinates:</span>
                    <span className="text-[#0EA5E9] font-black">{machine.data?.location || "Bay A"}</span>
                  </div>
                </div>
              )}

            </div>

            {/* Run Live Diagnostics Actions Dashboard */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-2">
                <Radio className="h-4.5 w-4.5 text-[#0EA5E9] animate-pulse" />
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Live Diagnostics Launcher</span>
                  <h3 className="text-sm font-extrabold text-slate-850 uppercase tracking-wide">Generate Model Insights</h3>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <button
                  disabled={runningPrediction}
                  onClick={() => { setModelMode("health"); mutations.health.mutate({ id: machineId, type: machine.data?.type || "CNC" }); }}
                  className="rounded-xl border border-slate-150 bg-slate-50 hover:bg-[#EAF6FF] hover:border-[#0EA5E9]/50 py-3 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-700 transition-all disabled:opacity-50"
                >
                  Health Pred
                </button>
                <button
                  disabled={runningPrediction}
                  onClick={() => { setModelMode("anomaly"); mutations.anomaly.mutate(machineId); }}
                  className="rounded-xl border border-slate-150 bg-slate-50 hover:bg-[#EAF6FF] hover:border-red-400 py-3 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-700 transition-all disabled:opacity-50"
                >
                  Anomaly Pred
                </button>
                <button
                  disabled={runningPrediction}
                  onClick={() => { setModelMode("energy"); mutations.energy.mutate(machineId); }}
                  className="rounded-xl border border-slate-150 bg-slate-50 hover:bg-[#EAF6FF] hover:border-yellow-400 py-3 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-700 transition-all disabled:opacity-50"
                >
                  Energy Optim
                </button>
                <button
                  disabled={runningPrediction}
                  onClick={() => { mutations.bottleneck.mutate(machineId); }}
                  className="rounded-xl border border-slate-150 bg-slate-50 hover:bg-[#EAF6FF] hover:border-orange-400 py-3 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-700 transition-all disabled:opacity-50"
                >
                  Bottleneck Run
                </button>
              </div>
              {runningPrediction && (
                <div className="mt-3.5 flex items-center justify-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">
                  <span className="h-2 w-2 rounded-full bg-[#0EA5E9] animate-ping" />
                  Generating network telemetry payload...
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Telemetry Sidebars & Specs */}
          <div className="flex flex-col gap-4">
            
            {/* Machine General Specs */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Asset Overview</span>
                  <h2 className="text-xl font-extrabold text-slate-800 mt-1">{machine.data?.name || machineId}</h2>
                </div>
                <StatusPill status={twin.data?.status || machine.data?.operational_status} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Field label="System ID" value={<span className="font-mono-tech">{machineId}</span>} />
                <Field label="Module Type" value={<span className="uppercase text-xs">{machine.data?.type || "CNC Mill"}</span>} />
                <Field label="Grid Location" value={machine.data?.location || "Plant Floor"} />
                <Field label="Conveyor Stage" value={machine.data?.operational_status || "Active"} />
              </div>
            </div>

            {/* Twin Telemetry overlays details */}
            {twin.data && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Core State Telemetry</span>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Field label="OEE Health Score" value={<span className="font-mono-tech">{twin.data.health_score}%</span>} />
                  <Field label="Estimated Failure Risk" value={<span className="font-mono-tech">{Math.round(twin.data.failure_probability * 100)}%</span>} />
                  <Field label="Active Thermal Load" value={<span className="font-mono-tech text-[#0EA5E9]">{twin.data.energy_usage} kW</span>} />
                  <Field label="Anomaly Score" value={<span className="font-mono-tech text-red-500">{twin.data.anomaly_score}</span>} />
                </div>
              </div>
            )}

            {/* Connected Sensors Grid */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block font-bold">Connected Sensor Feeds</span>
              <div className="mt-4 grid gap-2.5">
                {(sensors.data || []).map((sensor) => (
                  <div key={sensor.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{sensor.name}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 font-mono-tech">{sensor.sensor_type} | {sensor.unit}</div>
                    </div>
                    <StatusPill status={sensor.status} />
                  </div>
                ))}
                {(!sensors.data || sensors.data.length === 0) && <EmptyBlock title="No sensor feeds detected" body="No telemetry channels were returned for this node." />}
              </div>
            </div>

            {/* Asset Administration Control */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4.5 w-4.5 text-[#0EA5E9] animate-spin" style={{ animationDuration: '6s' }} />
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Asset Administration</h3>
              </div>
              
              <div className="space-y-4">
                {/* Update Details form */}
                <form onSubmit={handleUpdate} className="space-y-3 text-xs font-semibold text-slate-650 border-b border-slate-100 pb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block mb-1 text-[8px] font-bold text-slate-450 uppercase font-mono-tech">Machine Name</label>
                      <input 
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full h-8.5 rounded-lg border border-slate-200 bg-white px-2.5 font-medium text-slate-700 font-mono-tech"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-[8px] font-bold text-slate-450 uppercase font-mono-tech">Grade Type</label>
                      <select 
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-full h-8.5 rounded-lg border border-slate-200 bg-white px-2.5 font-extrabold text-slate-700"
                      >
                        <option value="L">L (Low Grade)</option>
                        <option value="M">M (Medium Grade)</option>
                        <option value="H">H (High Grade)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block mb-1 text-[8px] font-bold text-slate-450 uppercase font-mono-tech">Location</label>
                      <input 
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="w-full h-8.5 rounded-lg border border-slate-200 bg-white px-2.5 font-medium text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-[8px] font-bold text-slate-450 uppercase font-mono-tech">Op Status</label>
                      <select 
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full h-8.5 rounded-lg border border-slate-200 bg-white px-2.5 font-extrabold text-slate-700"
                      >
                        <option value="Active">Active</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Offline">Offline</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updateMachine.isPending}
                    className="w-full h-9 rounded-lg bg-[#0EA5E9] hover:bg-[#0284c7] text-white font-bold uppercase tracking-wider shadow-sm disabled:opacity-50 transition-colors mt-2"
                  >
                    Update Node Metadata
                  </button>
                </form>

                {/* Decommission button */}
                <div className="flex flex-col gap-2 pb-4 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteMachine.isPending}
                    className="w-full h-9.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-650 font-bold uppercase tracking-wider text-[10px] shadow-sm transition-colors"
                  >
                    Decommission & Delete Asset Node
                  </button>
                </div>

                {/* Quick register form */}
                <div>
                  <div className="text-[9px] font-extrabold text-slate-450 uppercase block mb-3 font-mono-tech">Quick Register New Node</div>
                  <form onSubmit={handleRegister} className="space-y-3 text-xs font-semibold text-slate-500">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-1 text-[8px] font-bold text-slate-400 uppercase font-mono-tech">Node ID</label>
                        <input 
                           type="text"
                           placeholder="e.g. M_006"
                           value={regId}
                           onChange={(e) => setRegId(e.target.value)}
                           className="w-full h-8.5 rounded-lg border border-slate-200 bg-white px-2.5 font-medium text-slate-700 placeholder-slate-400 font-mono-tech"
                           required
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[8px] font-bold text-slate-400 uppercase font-mono-tech">Node Name</label>
                        <input 
                          type="text"
                          placeholder="e.g. Stage E: Packer"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full h-8.5 rounded-lg border border-slate-200 bg-white px-2.5 font-medium text-slate-700 placeholder-slate-400"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={registerMachine.isPending}
                      className="w-full h-9 rounded-lg bg-blue-600 text-white font-bold uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Register New Machine Node
                    </button>
                  </form>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </PageFrame>
  );
}
