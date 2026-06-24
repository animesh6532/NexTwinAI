"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Radio, 
  Plus, 
  Send, 
  Activity, 
  Gauge, 
  Cpu, 
  Database,
  ArrowRight,
  TrendingUp,
  RefreshCcw,
  Sparkles
} from "lucide-react";
import { PageFrame } from "../../components/nextwin-shell";
import { 
  EmptyBlock, 
  ErrorBlock, 
  LoadingBlock, 
  Field, 
  MiniLine, 
  StatusPill 
} from "../../components/data-states";
import { 
  useCoreFactoryData, 
  useRegisterSensor, 
  useRecordReading, 
  queryKeys 
} from "../../hooks/use-nextwin";
import { nextwinApi } from "../../services/nextwin-api";

export default function SensorsConsolePage() {
  const { machines } = useCoreFactoryData();
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null);
  
  // Fetch all sensors
  const sensors = useQuery({
    queryKey: queryKeys.sensors(),
    queryFn: () => nextwinApi.sensors(),
    refetchInterval: 20_000
  });

  // Fetch readings for selected sensor
  const readings = useQuery({
    queryKey: queryKeys.readings(selectedSensorId || undefined),
    queryFn: () => nextwinApi.readings(selectedSensorId!),
    enabled: selectedSensorId !== null,
    refetchInterval: 10_000
  });

  const registerSensor = useRegisterSensor();
  const recordReading = useRecordReading();

  // New Sensor form state
  const [newSensor, setNewSensor] = useState({
    machine_id: "",
    name: "",
    sensor_type: "vibration",
    unit: "mm/s",
    threshold_min: "" as string | number,
    threshold_max: "" as string | number
  });

  // New Reading form state
  const [newReadingVal, setNewReadingVal] = useState("");

  const selectedSensor = useMemo(() => 
    sensors.data?.find(s => s.id === selectedSensorId),
    [sensors.data, selectedSensorId]
  );

  function handleRegisterSensor(e: React.FormEvent) {
    e.preventDefault();
    if (!newSensor.machine_id || !newSensor.name || !newSensor.unit) return;

    registerSensor.mutate({
      machine_id: newSensor.machine_id,
      name: newSensor.name,
      sensor_type: newSensor.sensor_type,
      unit: newSensor.unit,
      threshold_min: newSensor.threshold_min !== "" ? Number(newSensor.threshold_min) : null,
      threshold_max: newSensor.threshold_max !== "" ? Number(newSensor.threshold_max) : null
    }, {
      onSuccess: () => {
        setNewSensor({
          machine_id: "",
          name: "",
          sensor_type: "vibration",
          unit: "mm/s",
          threshold_min: "",
          threshold_max: ""
        });
        sensors.refetch();
      }
    });
  }

  function handleRecordReading(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSensorId === null || !newReadingVal) return;

    recordReading.mutate({
      sensor_id: selectedSensorId,
      value: Number(newReadingVal)
    }, {
      onSuccess: () => {
        setNewReadingVal("");
        readings.refetch();
      }
    });
  }

  return (
    <PageFrame
      title="Sensors Console"
      kicker="Edge Telemetry Feeds"
      actions={
        <button 
          onClick={() => { sensors.refetch(); if (selectedSensorId) readings.refetch(); }} 
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:border-slate-350 transition-all shadow-sm"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> 
          <span>Sync Feeds</span>
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_2.5fr]">
        
        {/* Left Column: Register New Sensor */}
        <div className="space-y-6">
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="h-4.5 w-4.5 text-blue-600" />
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Register Sensor</h3>
            </div>
            
            <form onSubmit={handleRegisterSensor} className="space-y-3.5 text-xs font-semibold text-slate-600">
              <div>
                <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Target Machine Node</label>
                <select 
                  value={newSensor.machine_id}
                  onChange={(e) => setNewSensor({ ...newSensor, machine_id: e.target.value })}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-extrabold uppercase text-slate-700"
                  required
                >
                  <option value="">-- Choose Machine --</option>
                  {(machines.data || []).map((m) => (
                    <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Sensor Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Bearing Thermocouple"
                  value={newSensor.name}
                  onChange={(e) => setNewSensor({ ...newSensor, name: e.target.value })}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Sensor Type</label>
                  <select 
                    value={newSensor.sensor_type}
                    onChange={(e) => {
                      const val = e.target.value;
                      const units: Record<string, string> = {
                        vibration: "mm/s",
                        temperature: "C",
                        pressure: "bar",
                        noise: "dB",
                        current: "A",
                        other: "units"
                      };
                      setNewSensor({ ...newSensor, sensor_type: val, unit: units[val] || "units" });
                    }}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-extrabold text-slate-700"
                    required
                  >
                    <option value="vibration">Vibration</option>
                    <option value="temperature">Temperature</option>
                    <option value="pressure">Pressure</option>
                    <option value="noise">Noise</option>
                    <option value="current">Current</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Unit</label>
                  <input 
                    type="text"
                    value={newSensor.unit}
                    onChange={(e) => setNewSensor({ ...newSensor, unit: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Min Threshold</label>
                  <input 
                    type="number"
                    step="any"
                    value={newSensor.threshold_min}
                    onChange={(e) => setNewSensor({ ...newSensor, threshold_min: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-700"
                    placeholder="Min"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Max Threshold</label>
                  <input 
                    type="number"
                    step="any"
                    value={newSensor.threshold_max}
                    onChange={(e) => setNewSensor({ ...newSensor, threshold_max: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-700"
                    placeholder="Max"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={registerSensor.isPending || !newSensor.machine_id || !newSensor.name}
                className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold uppercase tracking-wider shadow-md hover:bg-blue-700 disabled:opacity-50 transition-colors mt-2"
              >
                Register Sensor Node
              </button>
            </form>
          </section>
        </div>

        {/* Right Column: Sensors List and Readings Panel */}
        <div className="space-y-6">
          {/* Sensors list table */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Registered Telemetry Feeds</h3>
              </div>
              <span className="text-[10px] font-mono-tech font-bold text-slate-400 uppercase tracking-wider">
                {sensors.data?.length || 0} Nodes Online
              </span>
            </div>

            {sensors.isLoading && <LoadingBlock label="Retrieving physical sensors list..." />}
            {sensors.error && <ErrorBlock error={sensors.error} onRetry={() => sensors.refetch()} />}

            {!sensors.isLoading && !sensors.error && (!sensors.data || sensors.data.length === 0) && (
              <EmptyBlock title="No sensor feeds found" body="Register a new sensor using the console on the left to start telemetry stream collection." />
            )}

            {!sensors.isLoading && !sensors.error && sensors.data && sensors.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-slate-600 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">Sensor</th>
                      <th className="py-2.5 px-3">Node</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Limits</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensors.data.map((sensor) => {
                      const isSelected = selectedSensorId === sensor.id;
                      return (
                        <tr 
                          key={sensor.id} 
                          className={`border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors ${
                            isSelected ? "bg-blue-50/20" : ""
                          }`}
                          onClick={() => setSelectedSensorId(sensor.id)}
                        >
                          <td className="py-3.5 px-3 font-mono-tech text-slate-400">{sensor.id}</td>
                          <td className="py-3.5 px-3 font-bold text-slate-800">{sensor.name}</td>
                          <td className="py-3.5 px-3 font-mono-tech uppercase text-blue-600">{sensor.machine_id}</td>
                          <td className="py-3.5 px-3">
                            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] uppercase font-bold text-slate-500">
                              {sensor.sensor_type}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono-tech">
                            {sensor.threshold_min !== null || sensor.threshold_max !== null ? (
                              <span>
                                {sensor.threshold_min ?? "-"} .. {sensor.threshold_max ?? "-"} {sensor.unit}
                              </span>
                            ) : (
                              <span className="text-slate-350">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <StatusPill status={sensor.status || "healthy"} />
                          </td>
                          <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedSensorId(sensor.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600 shadow-sm"
                            >
                              <span>Telemetry</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Telemetry Stream Detail Section */}
          {selectedSensorId !== null && selectedSensor && (
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Telemetry charts and list */}
              <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="metric-label">HISTORICAL LINE TREND</span>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mt-0.5">
                      Sensor {selectedSensor.id} Diagnostics
                    </h3>
                  </div>
                  <TrendingUp className="h-4.5 w-4.5 text-slate-400" />
                </div>

                {readings.isLoading && <LoadingBlock label="Fetching sensor readings..." />}
                {readings.error && <ErrorBlock error={readings.error} />}

                {!readings.isLoading && !readings.error && (!readings.data || readings.data.length === 0) && (
                  <EmptyBlock title="No sensor readings" body="Submit a manual reading below to initiate raw telemetry collection." />
                )}

                {!readings.isLoading && !readings.error && readings.data && readings.data.length > 0 && (
                  <div className="space-y-4">
                    {/* SVG Sparkline */}
                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                      <MiniLine values={readings.data.map(r => r.value).reverse()} tone="green" />
                    </div>

                    {/* Historical Readings List */}
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
                      {readings.data.map((reading) => (
                        <div key={reading.id} className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                          <span className="font-mono-tech text-slate-400">
                            {new Date(reading.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="font-mono-tech font-black text-slate-800">
                            {reading.value.toFixed(2)} {selectedSensor.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Publish Manual Reading Form */}
              <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4.5 w-4.5 text-blue-600 animate-pulse" />
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Publish Reading</h3>
                  </div>
                  <div className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                    Submit manual sensor readings to trigger real-time anomalies or failure warnings in the operating system database.
                  </div>

                  <form onSubmit={handleRecordReading} className="space-y-3">
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">
                        Reading Value ({selectedSensor.unit})
                      </label>
                      <input 
                        type="number"
                        step="any"
                        placeholder={`e.g. 5.4`}
                        value={newReadingVal}
                        onChange={(e) => setNewReadingVal(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={recordReading.isPending || !newReadingVal}
                      className="w-full h-10 rounded-xl bg-slate-900 text-white font-bold uppercase tracking-wider shadow-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      <Send className="h-3.5 w-3.5 inline mr-1.5" />
                      <span>Transmit Reading</span>
                    </button>
                  </form>
                </div>

                <div className="border-t border-slate-100 pt-4 mt-6">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono-tech">Sensor Info:</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-1">
                    Node: <span className="font-bold text-slate-700">{selectedSensor.machine_id}</span> | Type: <span className="font-bold text-slate-700">{selectedSensor.sensor_type}</span>
                  </div>
                </div>
              </section>

            </div>
          )}

        </div>

      </div>
    </PageFrame>
  );
}
