"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Play, 
  RefreshCcw, 
  BrainCircuit, 
  AlertOctagon, 
  Zap, 
  Network, 
  Gauge, 
  ShieldAlert, 
  Wrench, 
  Clock, 
  TrendingUp, 
  ChevronRight,
  CornerDownRight
} from "lucide-react";
import { PageFrame } from "./nextwin-shell";
import { EmptyBlock, ErrorBlock, Field, LoadingBlock, MiniLine, StatusPill } from "./data-states";
import { queryKeys, useCoreFactoryData, usePredictionMutations } from "../hooks/use-nextwin";
import { getApiError, nextwinApi } from "../services/nextwin-api";
import type { AnomalyPrediction, BottleneckPrediction, EnergyPrediction, ForecastPrediction, HealthPrediction, Machine } from "../types/nextwin";

function MachineSelect({ 
  machines, 
  value, 
  onChange 
}: { 
  machines: Machine[]; 
  value: string; 
  onChange: (value: string) => void 
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Select Node:</span>
      <select 
        value={value} 
        onChange={(event) => onChange(event.target.value)} 
        className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold uppercase tracking-wide text-slate-700 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        {machines.map((machine) => (
          <option key={machine.id} value={machine.id}>{machine.id} — {machine.name}</option>
        ))}
      </select>
    </div>
  );
}

/* ========================================================
   1. PREDICTIVE MAINTENANCE PAGE
   ======================================================== */

export function PredictiveMaintenancePage() {
  const { machines, twin } = useCoreFactoryData();
  const [machineId, setMachineId] = useState("");
  const selectedMachine = useMemo(() => 
    machines.data?.find((m) => m.id === (machineId || machines.data?.[0]?.id)),
    [machines.data, machineId]
  );
  
  const [airTemp, setAirTemp] = useState(300.0);
  const [procTemp, setProcTemp] = useState(310.0);
  const [rotSpeed, setRotSpeed] = useState(1500.0);
  const [torque, setTorque] = useState(40.0);
  const [toolWear, setToolWear] = useState(0.0);
  const [machineType, setMachineType] = useState("M");

  const mutations = usePredictionMutations();
  const state = twin.data?.find((item) => item.machine_id === selectedMachine?.id);
  const result = mutations.health.data as HealthPrediction | undefined;

  const mockTimeline = [
    { day: "Today", task: "Spindle Lubrication Cycle", category: "Routine", priority: "Low" },
    { day: "Friday", task: "Hydraulic Pressure Recalibration", category: "Preventive", priority: "Medium" },
    { day: "Next Mon", task: "Grip Roller Seal Replacement", category: "Heavy", priority: "HIGH" },
  ];

  return (
    <PageFrame title="Predictive Maintenance" kicker="Machine Remaining Useful Life">
      {machines.isLoading && <LoadingBlock label="Polling maintenance index..." />}
      {machines.error && <ErrorBlock error={machines.error} onRetry={() => machines.refetch()} />}
      
      {!machines.isLoading && !machines.error && (!machines.data || machines.data.length === 0) && (
        <EmptyBlock title="No machines registered" body="Maintenance triggers require active machine units." />
      )}
      
      {machines.data && machines.data.length > 0 && selectedMachine && (
        <div className="grid gap-5">
          
          {/* Node Dispatch Header & Sliders */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <MachineSelect machines={machines.data} value={selectedMachine.id} onChange={(id) => {
                setMachineId(id);
                const m = machines.data.find(x => x.id === id);
                if (m) setMachineType(m.type);
              }} />
              <button 
                disabled={mutations.health.isPending}
                onClick={() => mutations.health.mutate({
                  machine_id: selectedMachine.id,
                  type: machineType,
                  air_temperature: airTemp,
                  process_temperature: procTemp,
                  rotational_speed: rotSpeed,
                  torque: torque,
                  tool_wear: toolWear
                })} 
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
              >
                <BrainCircuit className="h-4 w-4" /> 
                <span>Run RUL Prediction</span>
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Model Parameter Overrides</div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 font-medium">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Grade Type</label>
                  <select 
                    value={machineType}
                    onChange={(e) => setMachineType(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 focus:border-blue-500"
                  >
                    <option value="L">L (Low Grade)</option>
                    <option value="M">M (Medium Grade)</option>
                    <option value="H">H (High Grade)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Air Temp ({airTemp} K)</label>
                  <input 
                    type="range" min="285" max="315" step="0.5"
                    value={airTemp} onChange={(e) => setAirTemp(Number(e.target.value))}
                    className="w-full h-9 accent-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Process Temp ({procTemp} K)</label>
                  <input 
                    type="range" min="295" max="325" step="0.5"
                    value={procTemp} onChange={(e) => setProcTemp(Number(e.target.value))}
                    className="w-full h-9 accent-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Speed ({rotSpeed} RPM)</label>
                  <input 
                    type="range" min="800" max="3200" step="50"
                    value={rotSpeed} onChange={(e) => setRotSpeed(Number(e.target.value))}
                    className="w-full h-9 accent-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Torque ({torque} Nm)</label>
                  <input 
                    type="range" min="5" max="120" step="1"
                    value={torque} onChange={(e) => setTorque(Number(e.target.value))}
                    className="w-full h-9 accent-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tool Wear ({toolWear} min)</label>
                  <input 
                    type="range" min="0" max="300" step="5"
                    value={toolWear} onChange={(e) => setToolWear(Number(e.target.value))}
                    className="w-full h-9 accent-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {mutations.health.error && <ErrorBlock error={mutations.health.error} />}
          {mutations.health.isPending && <LoadingBlock label="Executing health prognostics algorithms..." />}

          {/* Grid Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Platform OEE" value={state?.health_score ? `${state.health_score}%` : "Awaiting twin"} />
            <Field label="Active Failure Risk" value={state ? `${Math.round(state.failure_probability * 100)}%` : "Awaiting twin"} />
            <Field label="Prognosed OEE" value={result?.health_score ? `${result.health_score}%` : "Run prediction"} />
            <Field label="Dispatch Priority" value={<StatusPill status={result?.maintenance_priority || state?.status} />} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            
            {/* Action Timeline */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="metric-label">MAINTENANCE CALENDAR</span>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mt-0.5">Recommended Actions Timeline</h3>
                </div>
                <Wrench className="h-4 w-4 text-slate-400" />
              </div>
              <div className="grid gap-3">
                {mockTimeline.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{item.task}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">{item.day} — {item.category}</div>
                    </div>
                    <StatusPill status={item.priority} />
                  </div>
                ))}
              </div>
            </section>

            {/* Explanation Factor weights */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md flex flex-col justify-between">
              <div>
                <span className="metric-label">XAI DEGRADATION FACTORS</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mt-0.5">Top Degradation Contributors</h3>
              </div>
              <div className="mt-4 grid gap-2.5">
                {(result?.top_factors || []).map((factor, idx) => (
                  <div key={factor} className="flex gap-2 items-center p-3 rounded-xl border border-slate-100 bg-white text-xs font-bold text-slate-600">
                    <span className="font-mono-tech text-blue-600">{idx + 1}.</span>
                    <span>{factor}</span>
                  </div>
                ))}
                {!result?.top_factors?.length && (
                  <EmptyBlock 
                    title="No explanation factors generated" 
                    body="Execute the RUL diagnostic test above to display model contributing variables." 
                  />
                )}
              </div>
            </section>

          </div>
        </div>
      )}
    </PageFrame>
  );
}

/* ========================================================
   2. ANOMALY CENTER PAGE
   ======================================================== */

export function AnomalyCenterPage() {
  const { machines } = useCoreFactoryData();
  const [machineId, setMachineId] = useState("");
  const selected = machineId || machines.data?.[0]?.id || "";

  const [vibration, setVibration] = useState(1.8);
  const [temperature, setTemperature] = useState(60.0);
  const [pressure, setPressure] = useState(4.2);
  const [noise, setNoise] = useState(72.0);
  const [freq, setFreq] = useState(520.0);
  const [amplitude, setAmplitude] = useState(0.06);
  const [method, setMethod] = useState("Isolation Forest");
  
  const history = useQuery({ 
    queryKey: queryKeys.anomalyHistory(selected), 
    queryFn: () => nextwinApi.anomalyHistory(selected), 
    enabled: Boolean(selected), 
    refetchInterval: 30_000 
  });
  
  const mutations = usePredictionMutations();
  const latest = mutations.anomaly.data || history.data?.[0];

  // Threat heatmaps mock metrics
  const threatLevels = [
    { zone: "Bay A (Conveyors)", level: "Nominal", score: 12 },
    { zone: "Bay B (Milling)", level: "Warning", score: 48 },
    { zone: "Bay C (Stamping)", level: "Nominal", score: 18 },
    { zone: "Bay D (Robotics)", level: "CRITICAL", score: 85 },
  ];

  return (
    <PageFrame title="Anomaly Center" kicker="Automated Sensor Audit">
      {/* Node Dispatch Header & Sliders */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-4 mb-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          {machines.data && machines.data.length > 0 ? (
            <MachineSelect machines={machines.data} value={selected} onChange={setMachineId} />
          ) : (
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">No active nodes registered</span>
          )}
          <button 
            disabled={!selected || mutations.anomaly.isPending}
            onClick={() => mutations.anomaly.mutate({
              machine_id: selected,
              vibration_mm_s: vibration,
              temperature_c: temperature,
              pressure_bar: pressure,
              noise_level_db: noise,
              sound_frequency_hz: freq,
              sound_amplitude: amplitude,
              method: method
            })} 
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-slate-350 hover:bg-slate-800 disabled:opacity-50"
          >
            {mutations.anomaly.isPending ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />} 
            <span>Run Anomaly Scan</span>
          </button>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Model Parameter Overrides</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7 font-medium">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Algorithm Method</label>
              <select 
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 focus:border-blue-500"
              >
                <option value="Isolation Forest">Isolation Forest</option>
                <option value="AutoEncoder">AutoEncoder</option>
                <option value="OCSVM">OCSVM</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Vibration ({vibration} mm/s)</label>
              <input 
                type="range" min="0.1" max="15.0" step="0.1"
                value={vibration} onChange={(e) => setVibration(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Temp ({temperature} °C)</label>
              <input 
                type="range" min="10" max="130" step="1"
                value={temperature} onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pressure ({pressure} bar)</label>
              <input 
                type="range" min="0.5" max="12.0" step="0.1"
                value={pressure} onChange={(e) => setPressure(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Noise ({noise} dB)</label>
              <input 
                type="range" min="30" max="120" step="1"
                value={noise} onChange={(e) => setNoise(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Freq ({freq} Hz)</label>
              <input 
                type="range" min="50" max="2500" step="50"
                value={freq} onChange={(e) => setFreq(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Amplitude ({amplitude})</label>
              <input 
                type="range" min="0.005" max="0.800" step="0.005"
                value={amplitude} onChange={(e) => setAmplitude(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
          </div>
        </div>
      </div>
      {machines.error && <ErrorBlock error={machines.error} onRetry={() => machines.refetch()} />}
      {history.error && <ErrorBlock error={history.error} onRetry={() => history.refetch()} />}
      {mutations.anomaly.error && <ErrorBlock error={mutations.anomaly.error} />}

      {history.isLoading || mutations.anomaly.isPending ? (
        <LoadingBlock label="Scanning sensor deflection cycles..." />
      ) : (
        <div className="grid gap-5">
          {/* Overview Diagnostics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Deflection Index" value={latest?.anomaly_score ?? "No record"} />
            <Field label="Severity Threat" value={<StatusPill status={latest?.anomaly_detected ? "Critical" : latest ? "Healthy" : "Unknown"} />} />
            <Field label="Audited Node ID" value={latest?.machine_id || "No record"} />
            <Field label="Scan Mode" value={latest?.method || "Isolation Forest"} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            {/* Zone Threat Heatmap */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md">
              <span className="metric-label">ZONE THREAT SEVERITY</span>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mt-0.5 mb-4">Plant Facility Zones</h3>
              <div className="grid gap-2">
                {threatLevels.map((t, idx) => (
                  <div key={idx} className="p-3.5 border border-slate-100 bg-slate-50/50 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{t.zone}</div>
                      <div className="text-[9px] font-bold text-slate-400 font-mono-tech mt-0.5">Deflection: {t.score}%</div>
                    </div>
                    <StatusPill status={t.level} />
                  </div>
                ))}
              </div>
            </section>

            {/* Anomaly Timeline */}
            <HistoryList 
              records={(history.data || []).map((item) => ({ 
                id: `${item.machine_id}-${item.timestamp}`, 
                title: `Scan Trigger: ${item.machine_id}`, 
                subtitle: item.timestamp, 
                status: item.anomaly_detected ? "Critical" : "Healthy", 
                value: `Index: ${item.anomaly_score}` 
              }))} 
            />
          </div>
        </div>
      )}
    </PageFrame>
  );
}

/* ========================================================
   3. ENERGY INTELLIGENCE PAGE
   ======================================================== */

export function EnergyIntelligencePage() {
  const { machines } = useCoreFactoryData();
  const [machineId, setMachineId] = useState("");
  const selected = machineId || machines.data?.[0]?.id || "";
  
  const [comp, setComp] = useState(0.76);
  const [surface, setSurface] = useState(680.0);
  const [wall, setWall] = useState(310.0);
  const [roof, setRoof] = useState(180.0);
  const [height, setHeight] = useState(5.0);
  const [orient, setOrient] = useState(3);
  const [glazing, setGlazing] = useState(0.20);
  const [glazDist, setGlazDist] = useState(2);

  const history = useQuery({ 
    queryKey: queryKeys.energyHistory(selected), 
    queryFn: () => nextwinApi.energyHistory(selected), 
    enabled: Boolean(selected), 
    refetchInterval: 45_000 
  });
  
  const mutations = usePredictionMutations();
  const latest = mutations.energy.data || history.data?.[0];

  return (
    <PageFrame title="Energy Intelligence" kicker="Thermal Load Optimization">
      {/* Node Dispatch Header & Sliders */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-4 mb-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          {machines.data && machines.data.length > 0 ? (
            <MachineSelect machines={machines.data} value={selected} onChange={setMachineId} />
          ) : (
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">No active nodes registered</span>
          )}
          <button 
            disabled={!selected || mutations.energy.isPending}
            onClick={() => mutations.energy.mutate({
              machine_id: selected,
              relative_compactness: comp,
              surface_area: surface,
              wall_area: wall,
              roof_area: roof,
              overall_height: height,
              orientation: orient,
              glazing_area: glazing,
              glazing_area_distribution: glazDist
            })} 
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-slate-350 hover:bg-slate-800 disabled:opacity-50"
          >
            {mutations.energy.isPending ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />} 
            <span>Analyze Energy Efficiency</span>
          </button>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Model Parameter Overrides</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-8 font-medium">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Compactness ({comp})</label>
              <input 
                type="range" min="0.5" max="1.0" step="0.02"
                value={comp} onChange={(e) => setComp(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Surface ({surface} m²)</label>
              <input 
                type="range" min="400" max="900" step="10"
                value={surface} onChange={(e) => setSurface(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Wall Area ({wall} m²)</label>
              <input 
                type="range" min="200" max="500" step="10"
                value={wall} onChange={(e) => setWall(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Roof Area ({roof} m²)</label>
              <input 
                type="range" min="100" max="300" step="10"
                value={roof} onChange={(e) => setRoof(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Height ({height} m)</label>
              <input 
                type="range" min="2" max="10" step="0.5"
                value={height} onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Orientation ({orient})</label>
              <input 
                type="range" min="1" max="4" step="1"
                value={orient} onChange={(e) => setOrient(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Glazing Ratio ({glazing})</label>
              <input 
                type="range" min="0.0" max="0.4" step="0.05"
                value={glazing} onChange={(e) => setGlazing(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Glaz Dist ({glazDist})</label>
              <input 
                type="range" min="1" max="5" step="1"
                value={glazDist} onChange={(e) => setGlazDist(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
          </div>
        </div>
      </div>
      {history.error && <ErrorBlock error={history.error} onRetry={() => history.refetch()} />}
      {mutations.energy.error && <ErrorBlock error={mutations.energy.error} />}

      {history.isLoading || mutations.energy.isPending ? (
        <LoadingBlock label="Compiling thermal loading coefficient..." />
      ) : (
        <div className="grid gap-5">
          {/* Core Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Optimization Score" value={latest ? `${latest.energy_optimization_score}%` : "No record"} />
            <Field label="Energy Waste" value={latest ? `${latest.predicted_energy_waste_pct}%` : "No record"} />
            <Field label="Heating Demand" value={latest ? `${latest.predicted_heating_load} kW` : "No record"} />
            <Field label="Cooling Demand" value={latest ? `${latest.predicted_cooling_load} kW` : "No record"} />
          </div>

          {/* Consumption Sparklines */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="metric-label">LOAD CONSUMPTION TIMELINE</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mt-0.5">Aggregate Thermal Load Profile</h3>
              </div>
              <Zap className="h-4 w-4 text-yellow-500" />
            </div>
            <MiniLine values={history.data?.map((item) => item.predicted_heating_load + item.predicted_cooling_load) || []} tone="green" />
          </section>

          {/* Action Optimization suggestions */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md">
            <div className="mb-4">
              <span className="metric-label">OPTIMIZATION AUDIT</span>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mt-0.5">System Savings Recommendations</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(latest?.optimization_recommendations || []).map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{item.action}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Priority: {item.priority}
                    </div>
                  </div>
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Savings:</span>
                    <span className="text-sm font-black text-emerald-600 font-mono-tech">-{item.estimated_thermal_load_savings_kw} kW</span>
                  </div>
                </div>
              ))}
              {!latest?.optimization_recommendations?.length && (
                <EmptyBlock 
                  title="No savings suggestions" 
                  body="Run the optimization audit above to generate recommended mitigations." 
                />
              )}
            </div>
          </section>
        </div>
      )}
    </PageFrame>
  );
}

/* ========================================================
   4. BOTTLENECK CENTER PAGE
   ======================================================== */

export function BottleneckCenterPage() {
  const { machines } = useCoreFactoryData();
  const [machineId, setMachineId] = useState("");
  const selected = machineId || machines.data?.[0]?.id || "";
  
  const [cycleTime, setCycleTime] = useState(15.0);
  const [downtime, setDowntime] = useState(0.0);
  const [qLength, setQLength] = useState(5);
  const [defects, setDefects] = useState(0.0);
  const [energyDraw, setEnergyDraw] = useState(65.0);

  const history = useQuery({ 
    queryKey: queryKeys.bottleneckHistory(selected), 
    queryFn: () => nextwinApi.bottleneckHistory(selected), 
    enabled: Boolean(selected), 
    refetchInterval: 45_000 
  });
  
  const mutations = usePredictionMutations();
  const latest = mutations.bottleneck.data || history.data?.[0];

  return (
    <PageFrame title="Bottleneck Center" kicker="Material Buffer Queues">
      {/* Node Dispatch Header & Sliders */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-4 mb-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          {machines.data && machines.data.length > 0 ? (
            <MachineSelect machines={machines.data} value={selected} onChange={setMachineId} />
          ) : (
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">No active nodes registered</span>
          )}
          <button 
            disabled={!selected || mutations.bottleneck.isPending}
            onClick={() => mutations.bottleneck.mutate({
              machine_id: selected,
              cycle_time: cycleTime,
              downtime_minutes: downtime,
              queue_length: qLength,
              defect_count: defects,
              energy_draw_kw: energyDraw
            })} 
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-slate-350 hover:bg-slate-800 disabled:opacity-50"
          >
            {mutations.bottleneck.isPending ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />} 
            <span>Audit Conveyor Flow</span>
          </button>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Model Parameter Overrides</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 font-medium">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cycle Time ({cycleTime} s)</label>
              <input 
                type="range" min="1" max="120" step="1"
                value={cycleTime} onChange={(e) => setCycleTime(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Downtime ({downtime} min)</label>
              <input 
                type="range" min="0" max="180" step="5"
                value={downtime} onChange={(e) => setDowntime(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Queue Length ({qLength})</label>
              <input 
                type="range" min="0" max="50" step="1"
                value={qLength} onChange={(e) => setQLength(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Defects Count ({defects})</label>
              <input 
                type="range" min="0" max="100" step="1"
                value={defects} onChange={(e) => setDefects(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Energy Draw ({energyDraw} kW)</label>
              <input 
                type="range" min="10" max="150" step="5"
                value={energyDraw} onChange={(e) => setEnergyDraw(Number(e.target.value))}
                className="w-full h-9 accent-slate-900"
              />
            </div>
          </div>
        </div>
      </div>
      {history.error && <ErrorBlock error={history.error} onRetry={() => history.refetch()} />}
      {mutations.bottleneck.error && <ErrorBlock error={mutations.bottleneck.error} />}

      {history.isLoading || mutations.bottleneck.isPending ? (
        <LoadingBlock label="Calculating queue load deflects..." />
      ) : (
        <div className="grid gap-5">
          {/* Stats indicators */}
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Congestion Risk" value={latest ? `${latest.bottleneck_risk_score}/10` : "No record"} />
            <Field label="Delay Duration" value={latest ? `${latest.predicted_production_delay}s` : "No record"} />
            <Field label="Block Probability" value={latest ? `${Math.round(latest.congestion_probability * 100)}%` : "No record"} />
            <Field label="Threat Status" value={<StatusPill status={latest?.congestion_risk_detected ? "Critical" : latest ? "Healthy" : "Unknown"} />} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            {/* Flow Sparkline */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="metric-label">QUEUE DYNAMICS</span>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mt-0.5">Buffer Queue deflection history</h3>
                </div>
                <Network className="h-4 w-4 text-orange-500" />
              </div>
              <MiniLine values={history.data?.map((item) => item.bottleneck_risk_score) || []} tone="amber" />
            </section>

            {/* List timeline history */}
            <HistoryList 
              records={(history.data || []).map((item) => ({ 
                id: `${item.machine_id}-${item.timestamp}`, 
                title: `Flow Audit: ${item.machine_id}`, 
                subtitle: item.timestamp, 
                status: item.congestion_risk_detected ? "Critical" : "Healthy", 
                value: `Score: ${item.bottleneck_risk_score}` 
              }))} 
            />
          </div>
        </div>
      )}
    </PageFrame>
  );
}

/* ========================================================
   5. FORECASTING CENTER PAGE
   ======================================================== */

export function ForecastingPage() {
  const { machines } = useCoreFactoryData();
  const [machineId, setMachineId] = useState("");
  const [horizon, setHorizon] = useState<30 | 90>(30);
  const selected = machineId || machines.data?.[0]?.id || "";
  
  const mutations = usePredictionMutations();
  const forecast = mutations.forecast.data as ForecastPrediction | undefined;

  return (
    <PageFrame title="Forecasting" kicker="Predictive Time Projections">
      
      {/* Dispatch form Header */}
      <div className="bg-white flex flex-col justify-between gap-4 p-5 rounded-2xl border border-slate-200 shadow-md md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-4">
          <MachineSelect machines={machines.data || []} value={selected} onChange={setMachineId} />
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Scope Horizon:</span>
            <select 
              value={horizon} 
              onChange={(event) => setHorizon(Number(event.target.value) as 30 | 90)} 
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold uppercase tracking-wide text-slate-700 shadow-sm"
            >
              <option value={30}>30 Days Range</option>
              <option value={90}>90 Days Range</option>
            </select>
          </div>
        </div>
        <button 
          disabled={!selected || mutations.forecast.isPending} 
          onClick={() => mutations.forecast.mutate({ machineId: selected, horizon })} 
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5 fill-current" /> 
          <span>Generate Forecast Matrix</span>
        </button>
      </div>

      {mutations.forecast.error && <div className="mt-5"><ErrorBlock error={mutations.forecast.error} /></div>}
      {mutations.forecast.isPending && <div className="mt-5"><LoadingBlock label="Executing time-series projections..." /></div>}

      {/* Forecasting Charts layout */}
      {forecast ? (
        <div className="mt-5 grid gap-5">
          <ChartCard title="RUL Failure Risk Projections" values={forecast.failure_risk_forecast} tone="red" />
          <ChartCard title="Energy Load Demand Model" values={forecast.energy_forecast} tone="green" />
          <ChartCard title="Production Throughput Forecast" values={forecast.throughput_forecast} tone="blue" />
        </div>
      ) : (
        !mutations.forecast.isPending && (
          <div className="mt-5">
            <EmptyBlock 
              title="Forecast Matrix Idle" 
              body="Select a conveyor unit node and launch the forecast matrix generator to chart future production scope." 
            />
          </div>
        )
      )}
    </PageFrame>
  );
}

/* ========================================================
   COMMON WIDGETS
   ======================================================== */

function PredictionHeader({ 
  machines, 
  selected, 
  onChange, 
  onRun, 
  pending, 
  label 
}: { 
  machines: Machine[]; 
  selected: string; 
  onChange: (value: string) => void; 
  onRun: () => void; 
  pending: boolean; 
  label: string 
}) {
  return (
    <div className="bg-white mb-5 flex flex-col justify-between gap-4 p-5 rounded-2xl border border-slate-200 shadow-md md:flex-row md:items-center">
      {machines.length > 0 ? (
        <MachineSelect machines={machines} value={selected} onChange={onChange} />
      ) : (
        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">No active nodes registered</span>
      )}
      <button 
        disabled={!selected || pending} 
        onClick={onRun} 
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-slate-300 hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />} 
        <span>{label}</span>
      </button>
    </div>
  );
}

function HistoryList({ 
  records 
}: { 
  records: Array<{ id: string; title: string; subtitle: string; status: string; value: string | number }> 
}) {
  if (!records.length) return <EmptyBlock title="No logs found" body="The timeline database contains no historical metrics for this unit." />;
  
  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md flex-1">
      <span className="metric-label">HISTORICAL DISPATCH AUDITS</span>
      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mt-0.5 mb-4">Operations History Timeline</h3>
      <div className="grid gap-2.5 max-h-[360px] overflow-y-auto pr-1">
        {records.map((record) => (
          <div key={record.id} className="grid gap-3.5 rounded-xl border border-slate-100 bg-white p-3.5 md:grid-cols-[1fr_auto_auto] md:items-center shadow-sm">
            <div className="flex gap-2 items-start">
              <CornerDownRight className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-800">{record.title}</div>
                <div className="text-[9px] font-bold text-slate-400 mt-1">{record.subtitle}</div>
              </div>
            </div>
            <StatusPill status={record.status} />
            <div className="text-xs font-extrabold text-slate-700 font-mono-tech">{record.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChartCard({ 
  title, 
  values, 
  tone 
}: { 
  title: string; 
  values: number[]; 
  tone: "blue" | "green" | "amber" | "red" 
}) {
  return (
    <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="metric-label">{title}</span>
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mt-0.5">{values.length} Forecast Intervals Projected</h2>
        </div>
        <TrendingUp className="h-4.5 w-4.5 text-slate-400" />
      </div>
      <MiniLine values={values} tone={tone} />
    </section>
  );
}
