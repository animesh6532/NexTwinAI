"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  RefreshCcw, 
  Activity, 
  Factory, 
  BrainCircuit, 
  AlertTriangle, 
  Zap, 
  Network, 
  Gauge, 
  Boxes, 
  FileText, 
  Database,
  Cpu,
  Play,
  Radio,
  Bell,
  CheckCircle,
  Wrench,
  AlertOctagon
} from "lucide-react";
import { PageFrame } from "../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/data-states";
import { useCoreFactoryData, useModelsStatus } from "../../hooks/use-nextwin";
import { useMemo } from "react";

export default function FactoryHealthPage() {
  const { health, machines, twin, alerts, reports } = useCoreFactoryData();
  const models = useModelsStatus();
  
  const loading = health.isLoading || machines.isLoading || twin.isLoading || alerts.isLoading || reports.isLoading || models.isLoading;
  
  const activeAlerts = useMemo(() => 
    (alerts.data || []).filter((alert) => !alert.is_resolved),
    [alerts.data]
  );

  // Data Consistency consolidation: Merge unresolved alerts into machine states
  const consolidatedStates = useMemo(() => {
    const raw = twin.data || [];
    const active = alerts.data || [];
    
    // Map machine ID to their highest active alert severity
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

    return raw.map(state => {
      const alertSeverity = alertSeverityMap[state.machine_id];
      let status = state.status;
      if (alertSeverity === "critical") {
        status = "Critical";
      } else if (alertSeverity === "warning" && !status.toLowerCase().includes("critical")) {
        status = "Warning";
      } else if (alertSeverity === "maintenance" && !status.toLowerCase().includes("critical") && !status.toLowerCase().includes("warning")) {
        status = "Maintenance";
      }
      
      return {
        ...state,
        status
      };
    });
  }, [twin.data, alerts.data]);

  // Overall counts derived from consolidated states for strict consistency
  const totalMachinesCount = useMemo(() => consolidatedStates.length || machines.data?.length || 0, [consolidatedStates, machines.data]);

  const criticalCount = useMemo(() => 
    consolidatedStates.filter((s) => s.status.toLowerCase().includes("critical") || s.status.toLowerCase().includes("emergency")).length,
    [consolidatedStates]
  );

  const warningCount = useMemo(() => 
    consolidatedStates.filter((s) => s.status.toLowerCase().includes("warning")).length,
    [consolidatedStates]
  );

  const maintenanceQueueCount = useMemo(() => 
    consolidatedStates.filter((s) => s.status.toLowerCase().includes("maintenance")).length,
    [consolidatedStates]
  );

  const healthyCount = useMemo(() => 
    consolidatedStates.filter((s) => 
      !s.status.toLowerCase().includes("critical") && 
      !s.status.toLowerCase().includes("emergency") && 
      !s.status.toLowerCase().includes("warning") && 
      !s.status.toLowerCase().includes("maintenance")
    ).length,
    [consolidatedStates]
  );

  const overallStatus = useMemo(() => {
    if (criticalCount > 0) return "Critical";
    if (warningCount > 0) return "Warning";
    return "Healthy";
  }, [criticalCount, warningCount]);

  // Overall OEE plant index average
  const overallOee = useMemo(() => {
    if (consolidatedStates.length === 0) return 94;
    const sum = consolidatedStates.reduce((acc, m) => acc + m.health_score, 0);
    return Math.round(sum / consolidatedStates.length);
  }, [consolidatedStates]);

  // Max failure probability risk index
  const maxFailureRisk = useMemo(() => {
    if (consolidatedStates.length === 0) return 4;
    const maxVal = Math.max(...consolidatedStates.map(m => m.failure_probability));
    return Math.round(maxVal * 100);
  }, [consolidatedStates]);

  // Total active power load
  const totalPowerLoad = useMemo(() => {
    if (consolidatedStates.length === 0) return 0;
    return Math.round(consolidatedStates.reduce((acc, m) => acc + m.energy_usage, 0));
  }, [consolidatedStates]);

  return (
    <PageFrame
      title="Platform Operations"
      kicker="Industrial Control Deck"
      actions={
        <button 
          onClick={() => { health.refetch(); machines.refetch(); twin.refetch(); alerts.refetch(); reports.refetch(); models.refetch(); }} 
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:border-slate-350 transition-all shadow-sm"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> 
          <span>Revalidate Deck</span>
        </button>
      }
    >
      {loading && <LoadingBlock label="Polling industrial sensors..." />}
      {health.error && <ErrorBlock error={health.error} onRetry={() => health.refetch()} />}
      {machines.error && <ErrorBlock error={machines.error} onRetry={() => machines.refetch()} />}
      {twin.error && <ErrorBlock error={twin.error} onRetry={() => twin.refetch()} />}

      {!loading && !health.error && !machines.error && !twin.error && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          
          {/* ==========================================
              BENTO LAYER 1: Core status & Plant Diagnostics
              ========================================== */}
          {/* Card 1: Platform Diagnostics (Col-span 2) */}
          <BentoWrapper href="/dashboard" className="lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">GATEWAY METRICS</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Platform Status</h3>
              </div>
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div className="grid grid-cols-3 gap-3 my-4">
              <MiniIndicator label="API status" value={health.data?.status || "Live"} status={overallStatus === "Critical" ? "critical" : "success"} />
              <MiniIndicator label="Database" value={health.data?.database_connected ? "OK" : "ERR"} status={health.data?.database_connected ? "success" : "critical"} />
              <MiniIndicator label="Plant Health" value={overallStatus} status={overallStatus === "Critical" ? "critical" : overallStatus === "Warning" ? "warning" : "success"} />
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 border-t border-slate-100 pt-3">
              <span className={`h-2 w-2 rounded-full ${overallStatus === "Critical" ? "bg-red-500 animate-ping" : overallStatus === "Warning" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              Shopfloor overall status evaluated as {overallStatus.toUpperCase()}
            </div>
          </BentoWrapper>

          {/* Card 2: Model Registry Status (Col-span 2) */}
          <BentoWrapper href="/model-status" className="lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">MODEL REGISTRY</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Predictive Model states</h3>
              </div>
              <Cpu className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="grid grid-cols-4 gap-2 my-4 text-center">
              <MiniModelBadge label="RUL" active={models.data?.health_model?.status === "loaded"} />
              <MiniModelBadge label="Energy" active={models.data?.energy_model?.status === "loaded"} />
              <MiniModelBadge label="Anomaly" active={models.data?.anomaly_model?.status === "loaded"} />
              <MiniModelBadge label="Forecast" active={models.data?.forecasting_model?.status === "loaded"} />
            </div>
            <div className="text-[10px] font-bold text-slate-455 uppercase tracking-wide border-t border-slate-100 pt-3 flex justify-between">
              <span>Inference Registry version:</span>
              <span className="font-mono-tech text-slate-700">v{models.data?.health_model?.version || "1.0.0"}</span>
            </div>
          </BentoWrapper>

          {/* ==========================================
              BENTO LAYER 2: 9 Core Metrics Required
              ========================================== */}
          {/* Card 3: Total Machines */}
          <BentoWrapper href="/machines" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">ASSET CATALOG</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Total Machines</h3>
              </div>
              <Boxes className="h-5 w-5 text-slate-500" />
            </div>
            <div className="my-4">
              <div className="text-3xl font-extrabold font-mono-tech text-slate-800">{totalMachinesCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Active registered cells</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>View catalog:</span>
              <span className="text-[#0EA5E9] font-bold hover:underline">Assets →</span>
            </div>
          </BentoWrapper>

          {/* Card 4: Machine States Breakdown */}
          <BentoWrapper href="/digital-twin" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">STATES BREAKDOWN</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Machine Tally</h3>
              </div>
              <Activity className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="my-3 grid grid-cols-3 gap-1 text-center font-mono-tech">
              <div className="border border-slate-100 rounded-lg p-1 bg-emerald-50/20 text-emerald-600">
                <span className="text-[8px] font-bold text-slate-400 block">HEALTHY</span>
                <span className="text-sm font-black">{healthyCount}</span>
              </div>
              <div className="border border-slate-100 rounded-lg p-1 bg-amber-50/20 text-amber-600">
                <span className="text-[8px] font-bold text-slate-400 block">WARN</span>
                <span className="text-sm font-black">{warningCount}</span>
              </div>
              <div className="border border-slate-100 rounded-lg p-1 bg-red-50/20 text-red-655">
                <span className="text-[8px] font-bold text-slate-400 block">CRIT</span>
                <span className="text-sm font-black">{criticalCount}</span>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>Overall:</span>
              <span className={`font-mono-tech font-black ${criticalCount > 0 ? "text-red-500" : "text-emerald-500"}`}>{overallStatus}</span>
            </div>
          </BentoWrapper>

          {/* Card 5: Overall OEE */}
          <BentoWrapper href="/reports" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">PLANT OEE</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">OEE Average</h3>
              </div>
              <Gauge className="h-5 w-5 text-[#0EA5E9]" />
            </div>
            <div className="my-4">
              <div className="text-3xl font-extrabold font-mono-tech text-slate-800">{overallOee}%</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Benchmark standard: 85%</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>Calculated OEE:</span>
              <span className="font-mono-tech text-slate-700">Live SLA</span>
            </div>
          </BentoWrapper>

          {/* Card 6: Active Alerts count */}
          <BentoWrapper href="/alerts" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">INCIDENT LOGS</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Active Alerts</h3>
              </div>
              <Bell className="h-5 w-5 text-red-500 animate-pulse" />
            </div>
            <div className="my-4">
              <div className="text-3xl font-extrabold font-mono-tech text-red-655">{activeAlerts.length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Unresolved incident alerts</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>View console:</span>
              <span className="text-[#0EA5E9] font-bold hover:underline">Incidents →</span>
            </div>
          </BentoWrapper>

          {/* Card 7: Energy Usage */}
          <BentoWrapper href="/energy-intelligence" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">ENERGY OPTIMIZER</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Energy Usage</h3>
              </div>
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="my-4">
              <div className="text-3xl font-extrabold font-mono-tech text-slate-800">{totalPowerLoad} kW</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Plant total active load</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>Optimization:</span>
              <span className="font-mono-tech text-slate-700">Balanced Draw</span>
            </div>
          </BentoWrapper>

          {/* Card 8: Maintenance Queue */}
          <BentoWrapper href="/predictive-maintenance" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">SERVICE PLANNER</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Maintenance</h3>
              </div>
              <Wrench className="h-5 w-5 text-blue-500" />
            </div>
            <div className="my-4">
              <div className="text-3xl font-extrabold font-mono-tech text-slate-800">{maintenanceQueueCount} Queue</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Assets flagged for service</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>View planner:</span>
              <span className="text-[#0EA5E9] font-bold hover:underline">Priority →</span>
            </div>
          </BentoWrapper>

          {/* Card 9: Failure Risk Summary */}
          <BentoWrapper href="/predictive-maintenance" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">FATIGUE RADAR</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Failure Risk</h3>
              </div>
              <AlertOctagon className="h-5 w-5 text-amber-500" />
            </div>
            <div className="my-4">
              <div className="text-3xl font-extrabold font-mono-tech text-slate-800">{maxFailureRisk}% Max</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Highest machine failure risk</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>Status:</span>
              <span className={`font-mono-tech font-bold ${maxFailureRisk > 40 ? "text-amber-500 animate-pulse" : "text-emerald-500"}`}>
                {maxFailureRisk > 40 ? "Needs Review" : "Nominal"}
              </span>
            </div>
          </BentoWrapper>

          {/* Card 10: Spatial Digital Twin layout preview (Col-span 2 Row-span 2) */}
          <BentoWrapper href="/digital-twin" className="lg:col-span-2 lg:row-span-2 flex flex-col justify-between min-h-[380px]">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">SPATIAL DIGITAL TWIN</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Machine Network Layout</h3>
              </div>
              <Factory className="h-5 w-5 text-indigo-600" />
            </div>
            
            {/* Visual machine pipeline preview */}
            <div className="my-5 flex-1 relative flex items-center justify-center bg-slate-50 rounded-xl p-4 border border-slate-150 overflow-hidden">
              <div className="absolute inset-0 bg-grid-slate-100 opacity-20" />
              <div className="flex justify-between items-center w-full max-w-[280px] z-10">
                <MiniTwinNode label="M01" status={consolidatedStates?.[0]?.status} />
                <div className="h-[2px] flex-1 border-t border-dashed border-slate-350" />
                <MiniTwinNode label="M02" status={consolidatedStates?.[1]?.status} />
                <div className="h-[2px] flex-1 border-t border-dashed border-slate-350" />
                <MiniTwinNode label="M04" status={consolidatedStates?.[3]?.status} />
              </div>
            </div>

            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>Active flow pipelines:</span>
              <span className="text-blue-600 font-mono-tech font-bold uppercase tracking-wider">Conveyors Active</span>
            </div>
          </BentoWrapper>

          {/* ==========================================
              BENTO LAYER 3: Platform Consoles Toggles
              ========================================== */}
          {/* Card 11: Anomaly Center */}
          <BentoWrapper href="/anomaly-center" className="flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start justify-between z-10">
              <div>
                <span className="metric-label">SECURITY RADAR</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Anomaly Room</h3>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            
            {/* Scanning radar indicator */}
            <div className="my-3 h-14 flex items-center justify-center relative">
              <div className="absolute h-12 w-12 rounded-full border border-dashed border-red-200/50 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              </div>
            </div>

            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between z-10">
              <span>Active anomalies:</span>
              <span className="text-red-500 font-mono-tech font-extrabold">{criticalCount} Active</span>
            </div>
          </BentoWrapper>

          {/* Card 12: What-If Simulation Sandbox */}
          <BentoWrapper href="/simulation-center" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">WHAT-IF ENGINE</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Simulations</h3>
              </div>
              <Play className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="my-4">
              <div className="text-2xl font-extrabold font-mono-tech text-slate-800">Scenarios</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Machinery & Energy runs</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>Run sandbox:</span>
              <span className="text-blue-600 font-bold hover:underline">Simulate →</span>
            </div>
          </BentoWrapper>

          {/* Card 13: Sensors Console */}
          <BentoWrapper href="/sensors" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">EDGE TELEMETRY</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Sensors Console</h3>
              </div>
              <Radio className="h-5 w-5 text-emerald-600 animate-pulse" />
            </div>
            <div className="my-4">
              <div className="text-2xl font-extrabold font-mono-tech text-emerald-600">Active Feeds</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Publish manual telemetry</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>View console:</span>
              <span className="text-[#0EA5E9] font-bold hover:underline">Feeds →</span>
            </div>
          </BentoWrapper>

        </div>
      )}
    </PageFrame>
  );
}

function BentoWrapper({ 
  children, 
  href, 
  className 
}: { 
  children: React.ReactNode; 
  href: string; 
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={className}
    >
      <Link 
        href={href} 
        className="block h-full p-5 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-100/30 hover:border-[#2563EB] hover:shadow-xl hover:shadow-slate-100/50 transition-colors"
      >
        {children}
      </Link>
    </motion.div>
  );
}

function MiniIndicator({ 
  label, 
  value, 
  status 
}: { 
  label: string; 
  value: React.ReactNode; 
  status: "success" | "warning" | "critical"
}) {
  const colors = {
    success: "text-emerald-600",
    warning: "text-amber-500",
    critical: "text-red-500"
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-center">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
      <span className={`text-xs font-mono-tech font-extrabold block mt-1 ${colors[status]}`}>{value}</span>
    </div>
  );
}

function MiniTwinNode({ 
  label, 
  status 
}: { 
  label: string; 
  status?: string 
}) {
  const norm = (status || "").toLowerCase();
  const color = norm.includes("critical") ? "bg-red-500" : norm.includes("warning") ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}>
        {label}
      </div>
      <span className="text-[8px] font-bold text-slate-400 font-mono-tech">{label}</span>
    </div>
  );
}

function MiniModelBadge({ 
  label, 
  active 
}: { 
  label: string; 
  active: boolean 
}) {
  return (
    <div className="rounded-lg border border-slate-100 p-2.5">
      <span className="text-[10px] font-extrabold uppercase block">{label}</span>
      <span className={`inline-block h-1.5 w-1.5 rounded-full mt-1.5 ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
    </div>
  );
}
