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

type ScenarioType = "machinery" | "energy" | "production";

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
              </div>
            </div>

            {/* Scenario Configuration Form Card */}
            <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">SCENARIO SPECIFICATION PARAMETERS</span>
              <h2 className="text-base font-extrabold text-slate-900 mt-1 mb-6 font-mono-tech">
                {activeScenario === "machinery" && "Machinery Load & RPM Stress Test"}
                {activeScenario === "production" && "Assembly Flow & Queue Bottleneck Adjustments"}
                {activeScenario === "energy" && "Structural Building Envelope Parameters"}
              </h2>

              <form onSubmit={handleRunSimulation} className="space-y-5">
                {activeScenario !== "energy" && (
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
                    const isEnergy = !isProduction && !isMachinery;

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
                              : "bg-yellow-50 text-yellow-600 border-yellow-100"
                        }`}>
                          {isProduction && <Layers className="h-3.5 w-3.5" />}
                          {isMachinery && <Activity className="h-3.5 w-3.5" />}
                          {isEnergy && <Zap className="h-3.5 w-3.5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-bold line-clamp-1 ${active ? "text-slate-950" : "text-slate-750"}`}>{sim.name}</div>
                          <div className="text-[9px] font-bold text-slate-450 uppercase tracking-wider font-mono-tech mt-1">
                            {sim.created_at} | {
                              isProduction ? "Production Domain" : isMachinery ? "Machinery Domain" : "Energy Domain"
                            }
                          </div>
                          
                          {sim.results && (
                            <div className="mt-2.5 flex items-center gap-4 text-[9px] font-bold font-mono-tech">
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
