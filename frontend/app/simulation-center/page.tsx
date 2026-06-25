"use client";

import { PageFrame } from "../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/data-states";
import { useCoreFactoryData, useSimulations, useRunSimulation } from "../../hooks/use-nextwin";
import { useState, useMemo } from "react";
import { 
  Play, 
  Settings, 
  Zap, 
  Activity, 
  ArrowRight, 
  Clock, 
  Gauge, 
  CornerDownRight, 
  Wrench,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  TrendingUp,
  TrendingDown
} from "lucide-react";

export const dynamic = "force-dynamic";

type ScenarioType = "machinery" | "energy" | "production" | "failure" | "maintenance" | "capacity";

export default function SimulationCenterPage() {
  const { machines } = useCoreFactoryData();
  const simulations = useSimulations();
  const runMutation = useRunSimulation();

  const [activeScenario, setActiveScenario] = useState<ScenarioType>("machinery");
  const [selectedSimId, setSelectedSimId] = useState<number | null>(null);

  // Machinery Parameters State
  const [machineId, setMachineId] = useState("");
  const [adjustSpeed, setAdjustSpeed] = useState(150);
  const [adjustTorque, setAdjustTorque] = useState(12);
  const [adjustWear, setAdjustWear] = useState(15);

  // Production Parameters State
  const [adjustCycleTime, setAdjustCycleTime] = useState(5.0);
  const [adjustQueueLength, setAdjustQueueLength] = useState(3);
  const [adjustDefectCount, setAdjustDefectCount] = useState(1.5);

  // Energy Parameters State
  const [compactness, setCompactness] = useState(0.76);
  const [surfaceArea, setSurfaceArea] = useState(680.0);
  const [wallArea, setWallArea] = useState(310.0);
  const [roofArea, setRoofArea] = useState(180.0);
  const [height, setHeight] = useState(5.0);
  const [orientation, setOrientation] = useState(3.0);
  const [glazingRatio, setGlazingRatio] = useState(0.20);
  const [glazingDist, setGlazingDist] = useState(2.0);
  
  // Energy Adjustments overrides
  const [simGlazingRatio, setSimGlazingRatio] = useState(0.35);
  const [simHeight, setSimHeight] = useState(6.5);
  const [simRoofArea, setSimRoofArea] = useState(220.0);

  // Capacity parameters
  const [targetStage, setTargetStage] = useState("M_004");
  const [expansionType, setExpansionType] = useState("CNC Mill parallel node");

  const defaultMachine = useMemo(() => {
    return machines.data?.[0]?.id || "";
  }, [machines.data]);

  const activeMachineId = machineId || defaultMachine;

  const currentSelectedSim = useMemo(() => {
    if (selectedSimId === null || !simulations.data) return null;
    return simulations.data.find(s => s.id === selectedSimId) || null;
  }, [selectedSimId, simulations.data]);

  const handleRunSimulation = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeScenario === "machinery") {
      if (!activeMachineId) return;
      runMutation.mutate({
        name: `Asset Load Stress Simulation: ${activeMachineId}`,
        description: `Machinery speed, torque load, and tooling wear deflection prediction scan.`,
        parameters: {
          machine_id: activeMachineId,
          adjust_speed_rpm: Number(adjustSpeed),
          adjust_torque_nm: Number(adjustTorque),
          adjust_tool_wear_min: Number(adjustWear)
        }
      }, {
        onSuccess: (data) => {
          setSelectedSimId(data.id);
        }
      });
    } else if (activeScenario === "production") {
      if (!activeMachineId) return;
      runMutation.mutate({
        name: `Production Bottleneck Simulation: ${activeMachineId}`,
        description: `Production assembly queue times, congestion delays, and defect-rate what-if analysis.`,
        parameters: {
          machine_id: activeMachineId,
          adjust_cycle_time: Number(adjustCycleTime),
          adjust_queue_length: Number(adjustQueueLength),
          adjust_defect_count: Number(adjustDefectCount)
        }
      }, {
        onSuccess: (data) => {
          setSelectedSimId(data.id);
        }
      });
    } else if (activeScenario === "failure") {
      if (!activeMachineId) return;
      runMutation.mutate({
        name: `Machine Failure Cascade Simulation: ${activeMachineId}`,
        description: `Cascade starvation, backlog propagation, and factory OEE impact projections.`,
        parameters: {
          machine_id: activeMachineId,
          simulate_failure: true
        }
      }, {
        onSuccess: (data) => {
          setSelectedSimId(data.id);
        }
      });
    } else if (activeScenario === "maintenance") {
      if (!activeMachineId) return;
      runMutation.mutate({
        name: `Preventive Maintenance Scheduling Analysis: ${activeMachineId}`,
        description: `Compare scheduled service downtime and cost against emergency breakdown risks.`,
        parameters: {
          machine_id: activeMachineId,
          schedule_maintenance: true
        }
      }, {
        onSuccess: (data) => {
          setSelectedSimId(data.id);
        }
      });
    } else if (activeScenario === "capacity") {
      runMutation.mutate({
        name: `Capacity Expansion Analysis: Stage ${targetStage}`,
        description: `Project bottleneck relief, queue reduction, and weekly throughput gains with parallel assets.`,
        parameters: {
          capacity_expansion: true,
          target_stage: targetStage,
          expansion_type: expansionType
        }
      }, {
        onSuccess: (data) => {
          setSelectedSimId(data.id);
        }
      });
    } else {
      runMutation.mutate({
        name: `Building Thermal Optimization Simulation`,
        description: `Thermal load optimization check via structural building modifications.`,
        parameters: {
          relative_compactness: Number(compactness),
          surface_area: Number(surfaceArea),
          wall_area: Number(wallArea),
          roof_area: Number(roofArea),
          overall_height: Number(height),
          orientation: Number(orientation),
          glazing_area: Number(glazingRatio),
          glazing_area_distribution: Number(glazingDist),
          sim_glazing_area: Number(simGlazingRatio),
          sim_overall_height: Number(simHeight),
          sim_roof_area: Number(simRoofArea)
        }
      }, {
        onSuccess: (data) => {
          setSelectedSimId(data.id);
        }
      });
    }
  };

  return (
    <PageFrame title="Simulation Lab" kicker="What-If Operational Prognostics">
      {machines.isLoading && <LoadingBlock label="Initializing Simulation controls..." />}
      {machines.error && <ErrorBlock error={machines.error} onRetry={() => machines.refetch()} />}

      {!machines.isLoading && !machines.error && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          
          {/* Left Panel: Scenario configuration forms & comparison results */}
          <div className="flex flex-col gap-5">
            {/* Scenario toggle deck */}
            <div className="bg-white p-4 border border-slate-200/80 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-4.5 w-4.5 text-[#0EA5E9]" />
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">SCENARIO CORE SELECTOR</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Simulation Domain</h3>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => { setActiveScenario("machinery"); setSelectedSimId(null); }}
                  className={`rounded-full px-3.5 py-2 text-[9px] font-bold uppercase tracking-wider border transition-all ${
                    activeScenario === "machinery"
                      ? "bg-[#0EA5E9] border-[#0EA5E9] text-white font-extrabold shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <Activity className="h-3 w-3 inline mr-1" />
                  Asset Load
                </button>
                <button
                  onClick={() => { setActiveScenario("production"); setSelectedSimId(null); }}
                  className={`rounded-full px-3.5 py-2 text-[9px] font-bold uppercase tracking-wider border transition-all ${
                    activeScenario === "production"
                      ? "bg-[#0EA5E9] border-[#0EA5E9] text-white font-extrabold shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <Layers className="h-3 w-3 inline mr-1" />
                  Production (Bottleneck)
                </button>
                <button
                  onClick={() => { setActiveScenario("energy"); setSelectedSimId(null); }}
                  className={`rounded-full px-3.5 py-2 text-[9px] font-bold uppercase tracking-wider border transition-all ${
                    activeScenario === "energy"
                      ? "bg-[#0EA5E9] border-[#0EA5E9] text-white font-extrabold shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <Zap className="h-3 w-3 inline mr-1" />
                  Thermal Energy
                </button>
                <button
                  onClick={() => { setActiveScenario("failure"); setSelectedSimId(null); }}
                  className={`rounded-full px-3.5 py-2 text-[9px] font-bold uppercase tracking-wider border transition-all ${
                    activeScenario === "failure"
                      ? "bg-[#0EA5E9] border-[#0EA5E9] text-white font-extrabold shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Machine Failure
                </button>
                <button
                  onClick={() => { setActiveScenario("maintenance"); setSelectedSimId(null); }}
                  className={`rounded-full px-3.5 py-2 text-[9px] font-bold uppercase tracking-wider border transition-all ${
                    activeScenario === "maintenance"
                      ? "bg-[#0EA5E9] border-[#0EA5E9] text-white font-extrabold shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <Wrench className="h-3 w-3 inline mr-1" />
                  Scheduled Maint.
                </button>
                <button
                  onClick={() => { setActiveScenario("capacity"); setSelectedSimId(null); }}
                  className={`rounded-full px-3.5 py-2 text-[9px] font-bold uppercase tracking-wider border transition-all ${
                    activeScenario === "capacity"
                      ? "bg-[#0EA5E9] border-[#0EA5E9] text-white font-extrabold shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <ArrowUpRight className="h-3 w-3 inline mr-1" />
                  Capacity Expansion
                </button>
              </div>
            </div>

            {/* Scenario Configuration Form Card */}
            <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">SCENARIO SPECIFICATION PARAMETERS</span>
              <h2 className="text-base font-extrabold text-slate-900 mt-1 mb-6 font-mono-tech">
                {activeScenario === "machinery" && "Machinery Load & RPM Stress Test"}
                {activeScenario === "production" && "Assembly Flow & Queue Bottleneck Adjustments"}
                {activeScenario === "energy" && "Structural Building Envelope Parameters"}
                {activeScenario === "failure" && "Catastrophic Machine Failure & Cascade Propagation"}
                {activeScenario === "maintenance" && "Preventive Maintenance Scheduling Optimization"}
                {activeScenario === "capacity" && "Assembly Line Capacity Expansion Projections"}
              </h2>

              <form onSubmit={handleRunSimulation} className="space-y-5">
                {activeScenario !== "energy" && activeScenario !== "capacity" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Select Target Machinery Node</label>
                    <select
                      value={activeMachineId}
                      onChange={(e) => setMachineId(e.target.value)}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 focus:border-[#0EA5E9]/40 focus:ring-0"
                      required
                    >
                      <option value="" disabled>-- Select a target machine --</option>
                      {machines.data?.map(m => (
                        <option key={m.id} value={m.id}>{m.id} — {m.name} ({m.type})</option>
                      ))}
                    </select>
                  </div>
                )}

                {activeScenario === "machinery" && (
                  /* Machinery load inputs */
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Adjust Speed (RPM)</label>
                      <input
                        type="number"
                        value={adjustSpeed}
                        onChange={(e) => setAdjustSpeed(Number(e.target.value))}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-850 focus:border-[#0EA5E9]/40"
                        placeholder="e.g. +150"
                        required
                      />
                      <span className="text-[8px] text-slate-400 font-medium">Increases friction temperature.</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Adjust Torque (Nm)</label>
                      <input
                        type="number"
                        value={adjustTorque}
                        onChange={(e) => setAdjustTorque(Number(e.target.value))}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-850 focus:border-[#0EA5E9]/40"
                        placeholder="e.g. +12"
                        required
                      />
                      <span className="text-[8px] text-slate-400 font-medium">Friction coefficients offset.</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Add Tool Wear (min)</label>
                      <input
                        type="number"
                        value={adjustWear}
                        onChange={(e) => setAdjustWear(Number(e.target.value))}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-850 focus:border-[#0EA5E9]/40"
                        placeholder="e.g. +15"
                        min="0"
                        required
                      />
                      <span className="text-[8px] text-slate-400 font-medium">Simulates tool surface fatigue.</span>
                    </div>
                  </div>
                )}

                {activeScenario === "production" && (
                  /* Production/Bottleneck inputs */
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Adjust Cycle Time (sec)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={adjustCycleTime}
                        onChange={(e) => setAdjustCycleTime(Number(e.target.value))}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-855 focus:border-[#0EA5E9]/40"
                        placeholder="e.g. +5.0"
                        required
                      />
                      <span className="text-[8px] text-slate-400 font-medium">Defines stage processing time.</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Adjust Queue size (units)</label>
                      <input
                        type="number"
                        value={adjustQueueLength}
                        onChange={(e) => setAdjustQueueLength(Number(e.target.value))}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-855 focus:border-[#0EA5E9]/40"
                        placeholder="e.g. +3"
                        required
                      />
                      <span className="text-[8px] text-slate-400 font-medium">Accumulated backlog in feed buffer.</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Adjust Defect count</label>
                      <input
                        type="number"
                        step="0.1"
                        value={adjustDefectCount}
                        onChange={(e) => setAdjustDefectCount(Number(e.target.value))}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-855 focus:border-[#0EA5E9]/40"
                        placeholder="e.g. +1.5"
                        required
                      />
                      <span className="text-[8px] text-slate-400 font-medium">Simulated rejected output items.</span>
                    </div>
                  </div>
                )}

                {activeScenario === "failure" && (
                  /* Failure inputs */
                  <div className="rounded-xl bg-red-50 border border-red-200/50 p-4 flex gap-3 items-start">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-red-950 uppercase tracking-wide">Emergency Breakdown Drill</h4>
                      <p className="text-[10px] text-red-700/90 mt-1 leading-relaxed">
                        Simulating a failure on node <strong>{activeMachineId}</strong> will trigger real-time cascade bottleneck evaluations. 
                        The relationship engine will trace downstream starvation backlogs, and project the overall drop in factory OEE.
                      </p>
                    </div>
                  </div>
                )}

                {activeScenario === "maintenance" && (
                  /* Maintenance inputs */
                  <div className="rounded-xl bg-blue-50 border border-blue-200/50 p-4 flex gap-3 items-start">
                    <Wrench className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-blue-950 uppercase tracking-wide">Scheduled Preventive Maintenance Drill</h4>
                      <p className="text-[10px] text-blue-700/90 mt-1 leading-relaxed">
                        Evaluate scheduling service right now. This simulation compares standard service costs/downtime 
                        against the financial risk of catastrophic secondary damage from an unmitigated run-to-failure breakdown.
                      </p>
                    </div>
                  </div>
                )}

                {activeScenario === "capacity" && (
                  /* Capacity inputs */
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Select Expansion Stage Node</label>
                        <select
                          value={targetStage}
                          onChange={(e) => setTargetStage(e.target.value)}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                          required
                        >
                          <option value="M_001">M_001 (CNC Mill stage)</option>
                          <option value="M_002">M_002 (Hydraulic Press stage)</option>
                          <option value="M_003">M_003 (Robotic Welder stage)</option>
                          <option value="M_004">M_004 (Main Assembly Line stage)</option>
                          <option value="M_005">M_005 (Conveyor Stage 2 stage)</option>
                          <option value="M_006">M_006 (Packaging Inspection stage)</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Parallel Expansion Asset Type</label>
                        <input
                          type="text"
                          value={expansionType}
                          onChange={(e) => setExpansionType(e.target.value)}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                          placeholder="e.g. CNC Mill parallel node"
                          required
                        />
                      </div>
                    </div>
                    <div className="rounded-xl bg-sky-50 border border-sky-200/50 p-4 flex gap-3 items-start">
                      <ArrowUpRight className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-black text-sky-950 uppercase tracking-wide">Parallel Capacity Expansion Drill</h4>
                        <p className="text-[10px] text-sky-700/90 mt-1 leading-relaxed">
                          Project OEE relief and queue reduction. Simulates placing an additional machine cell in parallel at the 
                          selected bottleneck stage to absorb overflow processing loads.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeScenario === "energy" && (
                  /* Building energy inputs */
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Relative Compactness</label>
                        <input
                          type="number"
                          step="0.01"
                          value={compactness}
                          onChange={(e) => setCompactness(Number(e.target.value))}
                          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Total Surface Area (m²)</label>
                        <input
                          type="number"
                          value={surfaceArea}
                          onChange={(e) => setSurfaceArea(Number(e.target.value))}
                          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Wall Area (m²)</label>
                        <input
                          type="number"
                          value={wallArea}
                          onChange={(e) => setWallArea(Number(e.target.value))}
                          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Roof Area (m²)</label>
                        <input
                          type="number"
                          value={roofArea}
                          onChange={(e) => setRoofArea(Number(e.target.value))}
                          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Overall height (m)</label>
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(Number(e.target.value))}
                          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Orientation factor (1-4)</label>
                        <input
                          type="number"
                          value={orientation}
                          onChange={(e) => setOrientation(Number(e.target.value))}
                          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Baseline Glazing Ratio</label>
                        <input
                          type="number"
                          step="0.01"
                          value={glazingRatio}
                          onChange={(e) => setGlazingRatio(Number(e.target.value))}
                          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Glazing Dist. factor (1-5)</label>
                        <input
                          type="number"
                          value={glazingDist}
                          onChange={(e) => setGlazingDist(Number(e.target.value))}
                          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4.5 space-y-4">
                      <span className="text-[8px] font-bold text-[#0EA5E9] uppercase tracking-widest font-mono-tech block">SIMULATION WHAT-IF OVERRIDES</span>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Sim Glazing Ratio</label>
                          <input
                            type="number"
                            step="0.01"
                            value={simGlazingRatio}
                            onChange={(e) => setSimGlazingRatio(Number(e.target.value))}
                            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Sim height (m)</label>
                          <input
                            type="number"
                            value={simHeight}
                            onChange={(e) => setSimHeight(Number(e.target.value))}
                            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech">Sim Roof Area (m²)</label>
                          <input
                            type="number"
                            value={simRoofArea}
                            onChange={(e) => setSimRoofArea(Number(e.target.value))}
                            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono-tech font-bold text-slate-800 focus:border-[#0EA5E9]/40"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={runMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#38BDF8] transition-all disabled:opacity-50"
                  >
                    {runMutation.isPending ? (
                      <Settings className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-current text-white" />
                    )}
                    <span>Run Simulation Run</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Results display panel: High-Fidelity Split-Comparison side-by-side grids */}
            {runMutation.error && <ErrorBlock error={runMutation.error} />}
            
            {currentSelectedSim && currentSelectedSim.results && (
              <div className="bg-white text-slate-800 border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[8px] font-bold text-[#0EA5E9] uppercase tracking-widest font-mono-tech block">Live Digital Twin Analysis</span>
                    <h3 className="text-base font-extrabold uppercase mt-1 tracking-wide font-mono-tech text-slate-950">{currentSelectedSim.name}</h3>
                  </div>
                  <span className="font-mono-tech text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">ID: {currentSelectedSim.id}</span>
                </div>

                {/* Determine parameters structure to render */}
                {(() => {
                  const isProduction = "adjust_cycle_time" in currentSelectedSim.parameters || "adjust_queue_length" in currentSelectedSim.parameters;
                  const isMachinery = "adjust_speed_rpm" in currentSelectedSim.parameters && !isProduction;
                  const isFailure = "simulate_failure" in currentSelectedSim.parameters;
                  const isMaintenance = "schedule_maintenance" in currentSelectedSim.parameters;
                  const isCapacity = "capacity_expansion" in currentSelectedSim.parameters;

                  if (isFailure) {
                    const od = currentSelectedSim.results.oee_delta || 0;
                    const dd = currentSelectedSim.results.downtime_delta_minutes || 0;
                    const prop = currentSelectedSim.results.details || {};
                    return (
                      <div className="space-y-6">
                        {/* Summary Badges */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-100 bg-[#FFF5F5] p-4 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Overall Factory OEE Delta</span>
                            <span className="text-2xl font-mono-tech font-black block mt-2 text-red-655">
                              {od}%
                            </span>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-[#FFF5F5] p-4 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Downtime Projections</span>
                            <span className="text-2xl font-mono-tech font-black block mt-2 text-red-655">
                              +{dd} min
                            </span>
                          </div>
                        </div>

                        {/* Split Comparison Cards Side-by-Side */}
                        <div className="grid gap-6 md:grid-cols-2">
                          {/* Left Column: Baseline */}
                          <div className="bg-slate-50/40 p-5 rounded-xl border border-slate-100 space-y-4">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech block border-b border-slate-200/50 pb-2">Nominal Factory State</span>
                            <div className="space-y-3.5 text-xs text-slate-655 font-semibold">
                              <div className="flex justify-between"><span>Machine Status:</span><strong className="text-emerald-650 font-mono">Active</strong></div>
                              <div className="flex justify-between"><span>Downtime:</span><strong className="text-slate-800 font-mono">0.0 min</strong></div>
                              <div className="flex justify-between"><span>Affected Nodes:</span><strong className="text-slate-800 font-mono">0</strong></div>
                              <div className="flex justify-between border-t border-slate-150 pt-2 mt-2 font-bold">
                                <span>Factory OEE:</span>
                                <strong className="text-slate-800">92.4%</strong>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Simulated */}
                          <div className="bg-red-50/20 p-5 rounded-xl border border-red-100 space-y-4">
                            <span className="text-[9px] font-bold text-red-655 uppercase tracking-widest font-mono-tech block border-b border-red-200/50 pb-2">Simulated Cascade Breakdown</span>
                            <div className="space-y-3.5 text-xs text-slate-655 font-semibold font-bold">
                              <div className="flex justify-between"><span>Machine Status:</span><strong className="text-red-655 font-mono">FAILED</strong></div>
                              <div className="flex justify-between"><span>Downtime:</span><strong className="text-slate-850 font-mono">{currentSelectedSim.results.simulated.downtime_minutes} min</strong></div>
                              <div className="flex justify-between"><span>Affected Nodes:</span><strong className="text-slate-850 font-mono">{currentSelectedSim.results.simulated.affected_nodes_count}</strong></div>
                              <div className="flex justify-between border-t border-red-200/50 pt-2 mt-2 font-bold">
                                <span>Factory OEE:</span>
                                <strong className="text-red-655">{currentSelectedSim.results.simulated.overall_factory_oee_pct}%</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Cascade details lists */}
                        {prop.impacted_downstream && Object.keys(prop.impacted_downstream).length > 0 && (
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5 space-y-3">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech block">Downstream Starvation Propagation</span>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                              {Object.entries(prop.impacted_downstream).map(([k, v]: any) => (
                                <div key={k} className="flex justify-between items-start text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                                  <div>
                                    <strong className="text-slate-800">{k}</strong>: <span className="text-slate-550">{v.status}</span>
                                    <span className="text-[9px] text-slate-450 block italic mt-0.5">Rec: {v.suggested_action}</span>
                                  </div>
                                  <div className="text-right font-mono text-[10px] text-amber-600 font-bold">
                                    Delay: +{v.starvation_delay_seconds}s | -{v.estimated_throughput_reduction_pct}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {prop.impacted_upstream && Object.keys(prop.impacted_upstream).length > 0 && (
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4.5 space-y-3">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech block">Upstream Backlog Congestion</span>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                              {Object.entries(prop.impacted_upstream).map(([k, v]: any) => (
                                <div key={k} className="flex justify-between items-start text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                                  <div>
                                    <strong className="text-slate-800">{k}</strong>: <span className="text-slate-550">{v.status}</span>
                                    <span className="text-[9px] text-slate-450 block italic mt-0.5">Rec: {v.suggested_action}</span>
                                  </div>
                                  <div className="text-right font-mono text-[10px] text-red-655 font-bold">
                                    Backlog: +{v.queue_backlog_increase_units} units | Risk: {v.congestion_risk_pct}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (isMaintenance) {
                    const rr = currentSelectedSim.results.risk_reduction_pct || 0;
                    const ds = currentSelectedSim.results.downtime_saved_minutes || 0;
                    const cs = currentSelectedSim.results.cost_savings_usd || 0;
                    return (
                      <div className="space-y-6">
                        {/* Summary Badges */}
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="rounded-xl border border-slate-100 bg-[#F0FFF4] p-3 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Failure Risk Reduction</span>
                            <span className="text-xl font-mono-tech font-black block mt-1.5 text-emerald-650">
                              {rr}%
                            </span>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-[#F0FFF4] p-3 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Downtime Saved</span>
                            <span className="text-xl font-mono-tech font-black block mt-1.5 text-emerald-650">
                              {ds} min
                            </span>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-[#F0FFF4] p-3 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Financial Savings</span>
                            <span className="text-xl font-mono-tech font-black block mt-1.5 text-emerald-650">
                              ${cs.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Split Comparison Cards Side-by-Side */}
                        <div className="grid gap-6 md:grid-cols-2">
                          {/* Left Column: Baseline */}
                          <div className="bg-slate-50/40 p-5 rounded-xl border border-slate-100 space-y-4">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech block border-b border-slate-200/50 pb-2">Deferred Maintenance (Emergency Breakdown)</span>
                            <div className="space-y-3.5 text-xs text-slate-655">
                              <div className="flex justify-between"><span>Downtime Required:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.baseline.downtime_minutes} min</strong></div>
                              <div className="flex justify-between"><span>Breakdown Cost:</span><strong className="text-slate-800 font-mono">${currentSelectedSim.results.baseline.maintenance_cost_usd}</strong></div>
                              <div className="flex justify-between"><span>Incident Severity:</span><strong className="text-red-655 uppercase font-mono">{currentSelectedSim.results.baseline.priority}</strong></div>
                              <div className="flex justify-between border-t border-slate-150 pt-2 mt-2 font-bold">
                                <span>Failure Risk:</span>
                                <strong className="text-slate-800">{currentSelectedSim.results.baseline.failure_risk_pct}%</strong>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Simulated */}
                          <div className="bg-emerald-50/20 p-5 rounded-xl border border-emerald-100 space-y-4">
                            <span className="text-[9px] font-bold text-emerald-650 uppercase tracking-widest font-mono-tech block border-b border-emerald-250 pb-2">Scheduled Preventive Maintenance</span>
                            <div className="space-y-3.5 text-xs text-slate-655">
                              <div className="flex justify-between"><span>Downtime Required:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.simulated.downtime_minutes} min</strong></div>
                              <div className="flex justify-between"><span>Service Cost:</span><strong className="text-slate-800 font-mono">${currentSelectedSim.results.simulated.maintenance_cost_usd}</strong></div>
                              <div className="flex justify-between"><span>Priority Status:</span><strong className="text-emerald-650 uppercase font-mono">{currentSelectedSim.results.simulated.priority}</strong></div>
                              <div className="flex justify-between border-t border-emerald-250 pt-2 mt-2 font-bold">
                                <span>Failure Risk:</span>
                                <strong className="text-emerald-650">{currentSelectedSim.results.simulated.failure_risk_pct}%</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (isCapacity) {
                    const og = currentSelectedSim.results.oee_gain_pct || 0;
                    const qr = currentSelectedSim.results.queue_reduction_units || 0;
                    const ti = currentSelectedSim.results.throughput_increase_units || 0;
                    return (
                      <div className="space-y-6">
                        {/* Summary Badges */}
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="rounded-xl border border-slate-100 bg-[#EBF8FF] p-3 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Stage OEE Gain</span>
                            <span className="text-xl font-mono-tech font-black block mt-1.5 text-sky-600">
                              +{og}%
                            </span>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-[#EBF8FF] p-3 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Queue Reduction</span>
                            <span className="text-xl font-mono-tech font-black block mt-1.5 text-sky-600">
                              {qr} units
                            </span>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-[#EBF8FF] p-3 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Throughput Gain</span>
                            <span className="text-xl font-mono-tech font-black block mt-1.5 text-sky-600">
                              +{ti} units/wk
                            </span>
                          </div>
                        </div>

                        {/* Split Comparison Cards Side-by-Side */}
                        <div className="grid gap-6 md:grid-cols-2">
                          {/* Left Column: Baseline */}
                          <div className="bg-slate-50/40 p-5 rounded-xl border border-slate-100 space-y-4">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech block border-b border-slate-200/50 pb-2">Single Node Baseline</span>
                            <div className="space-y-3.5 text-xs text-slate-655">
                              <div className="flex justify-between"><span>Queue Length:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.baseline.queue_length_units} units</strong></div>
                              <div className="flex justify-between"><span>Cycle Time:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.baseline.average_cycle_time_seconds}s</strong></div>
                              <div className="flex justify-between"><span>Weekly Throughput:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.baseline.weekly_throughput_units} units</strong></div>
                              <div className="flex justify-between border-t border-slate-150 pt-2 mt-2 font-bold">
                                <span>Stage OEE:</span>
                                <strong className="text-slate-800">{currentSelectedSim.results.baseline.overall_stage_oee_pct}%</strong>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Simulated */}
                          <div className="bg-sky-50/20 p-5 rounded-xl border border-sky-100 space-y-4">
                            <span className="text-[9px] font-bold text-sky-600 uppercase tracking-widest font-mono-tech block border-b border-sky-200/50 pb-2">Parallel Expansion Simulated</span>
                            <div className="space-y-3.5 text-xs text-slate-655 font-semibold">
                              <div className="flex justify-between"><span>Queue Length:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.simulated.queue_length_units} units</strong></div>
                              <div className="flex justify-between"><span>Cycle Time:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.simulated.average_cycle_time_seconds}s</strong></div>
                              <div className="flex justify-between"><span>Weekly Throughput:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.simulated.weekly_throughput_units} units</strong></div>
                              <div className="flex justify-between border-t border-sky-200/50 pt-2 mt-2 font-bold">
                                <span>Stage OEE:</span>
                                <strong className="text-sky-600 font-black">{currentSelectedSim.results.simulated.overall_stage_oee_pct}%</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (isProduction) {
                    const rd = currentSelectedSim.results.risk_delta || 0;
                    const dd = currentSelectedSim.results.delay_delta || 0;
                    return (
                      <div className="space-y-6">
                        {/* Summary Badges */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-100 bg-[#F8FBFF] p-4 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Bottleneck Risk Delta</span>
                            <span className={`text-2xl font-mono-tech font-black block mt-2 ${
                              rd > 0 ? "text-red-655" : "text-emerald-600"
                            }`}>
                              {rd > 0 ? "+" : ""}{rd.toFixed(1)}%
                            </span>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-[#F8FBFF] p-4 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Predicted Delay Delta</span>
                            <span className={`text-2xl font-mono-tech font-black block mt-2 ${
                              dd > 0 ? "text-red-655" : "text-emerald-600"
                            }`}>
                              {dd > 0 ? "+" : ""}{dd.toFixed(1)}s
                            </span>
                          </div>
                        </div>

                        {/* Split Comparison Cards Side-by-Side */}
                        <div className="grid gap-6 md:grid-cols-2">
                          {/* Left Column: Baseline */}
                          <div className="bg-slate-50/40 p-5 rounded-xl border border-slate-100 space-y-4">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech block border-b border-slate-200/50 pb-2">Baseline State</span>
                            <div className="space-y-3.5 text-xs text-slate-655">
                              <div className="flex justify-between"><span>Cycle Time:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.baseline.cycle_time.toFixed(1)}s</strong></div>
                              <div className="flex justify-between"><span>Queue Length:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.baseline.queue_length} units</strong></div>
                              <div className="flex justify-between"><span>Defect Count:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.baseline.defect_count.toFixed(1)}</strong></div>
                              <div className="flex justify-between"><span>Congestion Risk:</span><strong className="text-slate-800 font-mono">{Math.round(currentSelectedSim.results.baseline.congestion_probability * 100)}%</strong></div>
                              <div className="flex justify-between border-t border-slate-150 pt-2 mt-2 font-bold">
                                <span>Bottleneck Risk:</span>
                                <span className="text-slate-800">{currentSelectedSim.results.baseline.bottleneck_risk.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Simulated */}
                          <div className="bg-[#EAF6FF]/35 p-5 rounded-xl border border-[#0EA5E9]/20 space-y-4">
                            <span className="text-[9px] font-bold text-[#0EA5E9] uppercase tracking-widest font-mono-tech block border-b border-[#0EA5E9]/20 pb-2">Simulated State</span>
                            <div className="space-y-3.5 text-xs text-slate-655">
                              <div className="flex justify-between"><span>Cycle Time:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.simulated.cycle_time.toFixed(1)}s</strong></div>
                              <div className="flex justify-between"><span>Queue Length:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.simulated.queue_length} units</strong></div>
                              <div className="flex justify-between"><span>Defect Count:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.simulated.defect_count.toFixed(1)}</strong></div>
                              <div className="flex justify-between"><span>Congestion Risk:</span><strong className="text-slate-800 font-mono">{Math.round(currentSelectedSim.results.simulated.congestion_probability * 100)}%</strong></div>
                              <div className="flex justify-between border-t border-[#0EA5E9]/20 pt-2 mt-2 font-bold">
                                <span>Bottleneck Risk:</span>
                                <span className="text-[#0EA5E9] font-black">{currentSelectedSim.results.simulated.bottleneck_risk.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (isMachinery) {
                    const rd = currentSelectedSim.results.risk_delta || 0;
                    const hd = currentSelectedSim.results.health_score_delta || 0;
                    return (
                      <div className="space-y-6">
                        {/* Summary Badges */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-100 bg-[#F8FBFF] p-4 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Failure Risk Delta</span>
                            <span className={`text-2xl font-mono-tech font-black block mt-2 ${
                              rd > 0 ? "text-red-655" : "text-emerald-600"
                            }`}>
                              {rd > 0 ? "+" : ""}{(rd * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-[#F8FBFF] p-4 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Health Score Delta</span>
                            <span className={`text-2xl font-mono-tech font-black block mt-2 ${
                              hd < 0 ? "text-red-655" : "text-emerald-600"
                            }`}>
                              {hd > 0 ? "+" : ""}{hd} pts
                            </span>
                          </div>
                        </div>

                        {/* Split Comparison Cards Side-by-Side */}
                        <div className="grid gap-6 md:grid-cols-2">
                          {/* Left Column: Baseline */}
                          <div className="bg-slate-50/40 p-5 rounded-xl border border-slate-100 space-y-4">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech block border-b border-slate-200/50 pb-2">Baseline Diagnostics</span>
                            <div className="space-y-3.5 text-xs text-slate-655">
                              <div className="flex justify-between"><span>Speed:</span><strong className="text-slate-800 font-mono-tech">{Math.round(currentSelectedSim.results.baseline.speed_rpm)} RPM</strong></div>
                              <div className="flex justify-between"><span>Torque:</span><strong className="text-slate-800 font-mono-tech">{Math.round(currentSelectedSim.results.baseline.torque_nm)} Nm</strong></div>
                              <div className="flex justify-between"><span>Tool wear:</span><strong className="text-slate-800 font-mono-tech">{Math.round(currentSelectedSim.results.baseline.tool_wear_min)} min</strong></div>
                              <div className="flex justify-between"><span>Friction Temp:</span><strong className="text-slate-800 font-mono-tech">{currentSelectedSim.results.baseline.process_temp.toFixed(1)} K</strong></div>
                              <div className="flex justify-between border-t border-slate-150 pt-2 mt-2 font-bold">
                                <span>Failure Prob:</span>
                                <strong className="text-slate-800">{(currentSelectedSim.results.baseline.failure_risk * 100).toFixed(1)}%</strong>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Simulated */}
                          <div className="bg-[#EAF6FF]/35 p-5 rounded-xl border border-[#0EA5E9]/20 space-y-4">
                            <span className="text-[9px] font-bold text-[#0EA5E9] uppercase tracking-widest font-mono-tech block border-b border-[#0EA5E9]/20 pb-2">Simulated Outcomes</span>
                            <div className="space-y-3.5 text-xs text-slate-655">
                              <div className="flex justify-between"><span>Speed:</span><strong className="text-slate-800 font-mono-tech">{Math.round(currentSelectedSim.results.simulated.speed_rpm)} RPM</strong></div>
                              <div className="flex justify-between"><span>Torque:</span><strong className="text-slate-800 font-mono-tech">{Math.round(currentSelectedSim.results.simulated.torque_nm)} Nm</strong></div>
                              <div className="flex justify-between"><span>Tool wear:</span><strong className="text-slate-800 font-mono-tech">{Math.round(currentSelectedSim.results.simulated.tool_wear_min)} min</strong></div>
                              <div className="flex justify-between"><span>Friction Temp:</span><strong className="text-slate-800 font-mono-tech">{currentSelectedSim.results.simulated.process_temp.toFixed(1)} K</strong></div>
                              <div className="flex justify-between border-t border-[#0EA5E9]/20 pt-2 mt-2 font-bold">
                                <span>Failure Prob:</span>
                                <strong className="text-[#0EA5E9] font-black">{(currentSelectedSim.results.simulated.failure_risk * 100).toFixed(1)}%</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default Fallback to Energy simulation parameters
                  return (
                    <div className="space-y-6">
                      {/* Summary Badges */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-100 bg-[#F8FBFF] p-4 text-center">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Estimated Load Savings</span>
                          <span className="text-2xl font-mono-tech font-black block mt-2 text-emerald-650">
                            {currentSelectedSim.results.estimated_load_savings_kw} kW
                          </span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-[#F8FBFF] p-4 text-center">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Efficiency Score Gain</span>
                          <span className={`text-2xl font-mono-tech font-black block mt-2 ${
                            currentSelectedSim.results.efficiency_score_gain > 0 ? "text-emerald-600" : "text-red-655"
                          }`}>
                            {currentSelectedSim.results.efficiency_score_gain > 0 ? "+" : ""}{currentSelectedSim.results.efficiency_score_gain} pts
                          </span>
                        </div>
                      </div>

                      {/* Split Comparison Cards Side-by-Side */}
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Left Column: Baseline */}
                        <div className="bg-slate-50/40 p-5 rounded-xl border border-slate-100 space-y-4">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech block border-b border-slate-200/50 pb-2">Baseline Envelope</span>
                          <div className="space-y-3.5 text-xs text-slate-655">
                            <div className="flex justify-between"><span>Heating Load:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.baseline.heating_load_kw.toFixed(1)} kW</strong></div>
                            <div className="flex justify-between"><span>Cooling Load:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.baseline.cooling_load_kw.toFixed(1)} kW</strong></div>
                            <div className="flex justify-between"><span>Total Load:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.baseline.total_load_kw} kW</strong></div>
                            <div className="flex justify-between"><span>Energy Waste:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.baseline.energy_waste_pct}%</strong></div>
                            <div className="flex justify-between border-t border-slate-150 pt-2 mt-2 font-bold">
                              <span>Efficiency Rating:</span>
                              <strong className="text-slate-800">{currentSelectedSim.results.baseline.efficiency_score}/100</strong>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Simulated */}
                        <div className="bg-[#EAF6FF]/35 p-5 rounded-xl border border-[#0EA5E9]/20 space-y-4">
                          <span className="text-[9px] font-bold text-[#0EA5E9] uppercase tracking-widest font-mono-tech block border-b border-[#0EA5E9]/20 pb-2">Simulated Envelope</span>
                          <div className="space-y-3.5 text-xs text-slate-655">
                            <div className="flex justify-between"><span>Heating Load:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.simulated.heating_load_kw.toFixed(1)} kW</strong></div>
                            <div className="flex justify-between"><span>Cooling Load:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.simulated.cooling_load_kw.toFixed(1)} kW</strong></div>
                            <div className="flex justify-between"><span>Total Load:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.simulated.total_load_kw} kW</strong></div>
                            <div className="flex justify-between"><span>Energy Waste:</span><strong className="text-slate-800 font-mono">{currentSelectedSim.results.simulated.energy_waste_pct}%</strong></div>
                            <div className="flex justify-between border-t border-[#0EA5E9]/20 pt-2 mt-2 font-bold">
                              <span>Efficiency Rating:</span>
                              <strong className="text-[#0EA5E9] font-black">{currentSelectedSim.results.simulated.efficiency_score}/100</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Right Panel: Simulation History Logs */}
          <aside className="flex flex-col gap-4">
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">SCENARIO STREAM REGISTRY</span>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase mt-0.5 font-mono-tech">Simulation Run Logs</h3>
                </div>
                <Clock className="h-4.5 w-4.5 text-slate-400" />
              </div>

              {simulations.isLoading && <LoadingBlock label="Retrieving simulation run logs..." />}
              {simulations.error && <ErrorBlock error={simulations.error} />}

              {!simulations.isLoading && !simulations.error && (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[580px]">
                  {simulations.data?.map((sim) => {
                    const active = selectedSimId === sim.id;
                    const isProduction = "adjust_cycle_time" in sim.parameters || "adjust_queue_length" in sim.parameters;
                    const isMachinery = "adjust_speed_rpm" in sim.parameters && !isProduction;
                    const isFailure = "simulate_failure" in sim.parameters;
                    const isMaintenance = "schedule_maintenance" in sim.parameters;
                    const isCapacity = "capacity_expansion" in sim.parameters;
                    const isEnergy = !isProduction && !isMachinery && !isFailure && !isMaintenance && !isCapacity;

                    return (
                      <button
                        key={sim.id}
                        onClick={() => setSelectedSimId(sim.id)}
                        className={`w-full text-left p-3.5 border rounded-xl shadow-sm transition-all flex gap-3 items-start ${
                          active 
                            ? "bg-[#EAF6FF] border-[#0EA5E9]/30 text-slate-800 font-bold" 
                            : "bg-white border-slate-100 hover:border-slate-200 text-slate-500"
                        }`}
                      >
                        <span className={`p-1.5 rounded-lg shrink-0 mt-0.5 border ${
                          isProduction
                            ? "bg-purple-50 text-purple-600 border-purple-100"
                            : isMachinery 
                              ? "bg-blue-50 text-[#0EA5E9] border-blue-100" 
                              : isFailure
                                ? "bg-red-50 text-red-600 border-red-100 animate-pulse"
                                : isMaintenance
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : isCapacity
                                    ? "bg-sky-50 text-sky-600 border-sky-100"
                                    : "bg-yellow-50 text-yellow-600 border-yellow-100"
                        }`}>
                          {isProduction && <Layers className="h-3.5 w-3.5" />}
                          {isMachinery && <Activity className="h-3.5 w-3.5" />}
                          {isFailure && <AlertTriangle className="h-3.5 w-3.5" />}
                          {isMaintenance && <Wrench className="h-3.5 w-3.5" />}
                          {isCapacity && <ArrowUpRight className="h-3.5 w-3.5" />}
                          {isEnergy && <Zap className="h-3.5 w-3.5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-bold line-clamp-1 ${active ? "text-slate-950" : "text-slate-750"}`}>{sim.name}</div>
                          <div className="text-[9px] font-bold text-slate-450 uppercase tracking-wider font-mono-tech mt-1">
                            {sim.created_at} | {
                              isProduction 
                                ? "Production Domain" 
                                : isMachinery 
                                  ? "Machinery Domain" 
                                  : isFailure
                                    ? "Failure Domain"
                                    : isMaintenance
                                      ? "Maintenance Domain"
                                      : isCapacity
                                        ? "Capacity Domain"
                                        : "Energy Domain"
                            }
                          </div>
                          
                          {sim.results && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-bold font-mono-tech">
                              {isProduction && (
                                <>
                                  <span className={sim.results.risk_delta > 0 ? "text-red-655" : "text-emerald-600"}>
                                    Risk: {sim.results.risk_delta > 0 ? "+" : ""}{sim.results.risk_delta.toFixed(1)}%
                                  </span>
                                  <span className={sim.results.delay_delta > 0 ? "text-red-655" : "text-emerald-600"}>
                                    Delay: {sim.results.delay_delta > 0 ? "+" : ""}{sim.results.delay_delta.toFixed(1)}s
                                  </span>
                                </>
                              )}
                              {isMachinery && (
                                <>
                                  <span className={sim.results.risk_delta > 0 ? "text-red-655" : "text-emerald-600"}>
                                    Risk: {sim.results.risk_delta > 0 ? "+" : ""}{(sim.results.risk_delta * 100).toFixed(1)}%
                                  </span>
                                  <span className={sim.results.health_score_delta < 0 ? "text-red-655" : "text-emerald-600"}>
                                    Health: {sim.results.health_score_delta > 0 ? "+" : ""}{sim.results.health_score_delta}pts
                                  </span>
                                </>
                              )}
                              {isFailure && (
                                <>
                                  <span className="text-red-600 font-bold">
                                    OEE: {sim.results.oee_delta}%
                                  </span>
                                  <span className="text-red-600">
                                    Downtime: +{sim.results.downtime_delta_minutes}m
                                  </span>
                                </>
                              )}
                              {isMaintenance && (
                                <>
                                  <span className="text-emerald-600">
                                    Risk: {sim.results.risk_reduction_pct}%
                                  </span>
                                  <span className="text-emerald-650">
                                    Savings: ${sim.results.cost_savings_usd.toFixed(0)}
                                  </span>
                                </>
                              )}
                              {isCapacity && (
                                <>
                                  <span className="text-sky-600">
                                    OEE Gain: +{sim.results.oee_gain_pct}%
                                  </span>
                                  <span className="text-sky-600">
                                    Throughput: +{sim.results.throughput_increase_units}
                                  </span>
                                </>
                              )}
                              {isEnergy && (
                                <>
                                  <span className="text-emerald-600">
                                    Savings: -{sim.results.estimated_load_savings_kw}kW
                                  </span>
                                  <span className={sim.results.efficiency_score_gain > 0 ? "text-emerald-600" : "text-red-655"}>
                                    Gain: {sim.results.efficiency_score_gain > 0 ? "+" : ""}{sim.results.efficiency_score_gain}pts
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <CornerDownRight className="h-4 w-4 text-slate-400 shrink-0 self-center" />
                      </button>
                    );
                  })}

                  {(!simulations.data || simulations.data.length === 0) && (
                    <EmptyBlock 
                      title="No scenarios executed" 
                      body="Specify parameters and launch a What-If digital twin simulation to compile results." 
                    />
                  )}
                </div>
              )}
            </div>
          </aside>
 
        </div>
      )}
    </PageFrame>
  );
}
