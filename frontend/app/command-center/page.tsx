"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Activity, 
  Factory, 
  BrainCircuit, 
  AlertTriangle, 
  Zap, 
  Network, 
  Gauge, 
  Bot, 
  Boxes, 
  FileText, 
  Play,
  Cpu,
  ArrowRight,
  Database,
  Radio,
  Server,
  TrendingUp,
  Workflow
} from "lucide-react";
import { PageFrame } from "../../components/nextwin-shell";
import { LoadingBlock, ErrorBlock } from "../../components/data-states";
import { useCoreFactoryData, useModelsStatus } from "../../hooks/use-nextwin";
import { useMemo } from "react";

export default function CommandCenterPage() {
  const { health, machines, twin, alerts, reports } = useCoreFactoryData();
  const models = useModelsStatus();
  
  const loading = health.isLoading || machines.isLoading || twin.isLoading || alerts.isLoading || reports.isLoading || models.isLoading;
  const error = health.error || machines.error || twin.error || alerts.error;

  const activeAlerts = useMemo(() => 
    (alerts.data || []).filter((alert) => !alert.is_resolved),
    [alerts.data]
  );
  
  const criticalCount = useMemo(() => 
    (twin.data || []).filter((state) => state.status.toLowerCase().includes("critical")).length,
    [twin.data]
  );

  const warningCount = useMemo(() => 
    (twin.data || []).filter((state) => state.status.toLowerCase().includes("warning")).length,
    [twin.data]
  );

  const plantOee = useMemo(() => {
    if (!twin.data || twin.data.length === 0) return 98;
    const sum = twin.data.reduce((acc, m) => acc + m.health_score, 0);
    return Math.round(sum / twin.data.length);
  }, [twin.data]);

  const maxFailureRisk = useMemo(() => {
    if (!twin.data || twin.data.length === 0) return 0;
    const maxVal = Math.max(...twin.data.map(m => m.failure_probability));
    return Math.round(maxVal * 100);
  }, [twin.data]);

  const totalPowerLoad = useMemo(() => {
    if (!twin.data || twin.data.length === 0) return 0;
    return twin.data.reduce((acc, m) => acc + m.energy_usage, 0);
  }, [twin.data]);

  const productionStatus = useMemo(() => {
    if (criticalCount > 0) return "CRITICAL STATE";
    if (warningCount > 0) return "DEGRADED FLOW";
    return "FULLY OPTIMIZED";
  }, [criticalCount, warningCount]);

  return (
    <PageFrame
      title="Platform Operations Deck"
      kicker="Industrial AI Operating System"
    >
      {loading && <LoadingBlock label="Polling operations database..." />}
      {error && <ErrorBlock error={error} onRetry={() => { health.refetch(); machines.refetch(); twin.refetch(); alerts.refetch(); }} />}

      {!loading && !error && (
        <div className="space-y-8">
          
          {/* Top Hero Banner - 5 Premium Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* OEE Status */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Factory OEE Health</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 font-mono-tech">{plantOee}%</span>
                <span className="text-[10px] text-emerald-600 font-bold uppercase">Nominal</span>
              </div>
              <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${plantOee}%` }} />
              </div>
            </div>

            {/* Machines Active */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Active Machines</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 font-mono-tech">{machines.data?.length || 0}</span>
                <span className="text-[10px] text-[#0EA5E9] font-bold uppercase">Online</span>
              </div>
              <div className="mt-3 text-[9px] text-slate-500 uppercase font-bold tracking-wider">Telemetry nodes streaming</div>
            </div>

            {/* Energy Efficiency */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Thermal Power Load</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#0EA5E9] font-mono-tech">{totalPowerLoad.toFixed(1)}</span>
                <span className="text-xs text-slate-505 font-bold font-mono-tech">kW</span>
              </div>
              <div className="mt-3 text-[9px] text-slate-500 uppercase font-bold tracking-wider">Dynamic factory grid demand</div>
            </div>

            {/* Open Alerts */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Open Incidents</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-3xl font-black font-mono-tech ${activeAlerts.length > 0 ? "text-red-650" : "text-slate-900"}`}>
                  {activeAlerts.length}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Alarms</span>
              </div>
              <div className="mt-3 text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${activeAlerts.length > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
                {activeAlerts.length > 0 ? `${criticalCount} critical events pending` : "No pending critical alerts"}
              </div>
            </div>

            {/* Production Status */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Production Status</span>
              <div className="mt-3">
                <span className={`text-sm font-black uppercase tracking-wider block ${
                  criticalCount > 0 ? "text-red-600" : warningCount > 0 ? "text-amber-600" : "text-emerald-600"
                }`}>
                  {productionStatus}
                </span>
              </div>
              <div className="mt-5 text-[9px] text-slate-555 uppercase font-bold tracking-wider">Conveyor routing operational</div>
            </div>
          </div>

          {/* Premium Bento Grid sections */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            
            {/* Card 1: Spatial Digital Twin (colspan-2 rowspan-2) */}
            <BentoWrapper href="/digital-twin" className="lg:col-span-2 lg:row-span-2 flex flex-col justify-between min-h-[380px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">Spatial Digital Twin</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Conveyor Pipeline Layout</h3>
                </div>
                <Factory className="h-5 w-5 text-[#0EA5E9]" />
              </div>
              
              {/* Conveyor graphic preview */}
              <div className="my-5 flex-1 relative flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden p-6">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.015)_1px,transparent_1px)] bg-[size:16px_16px] opacity-40" />
                <div className="flex justify-between items-center w-full max-w-[280px] z-10">
                  <MiniTwinNode label="M01" status={twin.data?.[0]?.status} />
                  <div className="h-[2px] flex-1 border-t border-dashed border-slate-200" />
                  <MiniTwinNode label="M02" status={twin.data?.[1]?.status} />
                  <div className="h-[2px] flex-1 border-t border-dashed border-slate-200" />
                  <MiniTwinNode label="M04" status={twin.data?.[3]?.status} />
                </div>
              </div>

              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3 flex justify-between">
                <span>Active Routing Lines</span>
                <span className="text-[#0EA5E9] font-mono-tech">Interactive flow canvas →</span>
              </div>
            </BentoWrapper>

            {/* Card 2: AI Copilot Preview (colspan-2) */}
            <BentoWrapper href="/ai-copilot" className="lg:col-span-2 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">Assistant Terminal</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Factory Copilot Summary</h3>
                </div>
                <Bot className="h-5 w-5 text-[#0EA5E9]" />
              </div>
              <div className="my-3 bg-[#EAF6FF]/30 border border-slate-100 p-4 rounded-xl">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 font-mono-tech">Copilot diagnostics:</span>
                <p className="text-xs text-slate-650 mt-1 leading-relaxed">
                  Overall plant health index is at <span className="text-[#0EA5E9] font-bold">{plantOee}%</span>. {criticalCount > 0 ? "Critical anomaly active on plant conveyor. Inspect assembly joint." : "All monitored nodes are performing within parameters."}
                </p>
              </div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3 flex justify-between">
                <span>Assistant streaming online</span>
                <span className="text-[#0EA5E9] font-mono-tech">Chat Console →</span>
              </div>
            </BentoWrapper>

            {/* Card 3: Machines Digital Assets */}
            <BentoWrapper href="/machines" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">Asset Catalog</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Digital Assets</h3>
                </div>
                <Boxes className="h-5 w-5 text-slate-400" />
              </div>
              <div className="my-4">
                <div className="text-4xl font-black text-slate-900 font-mono-tech">{machines.data?.length || 0}</div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1 block">Monitored components</span>
              </div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3 flex justify-between">
                <span>Registry catalog</span>
                <span className="text-[#0EA5E9] hover:underline font-bold">Assets →</span>
              </div>
            </BentoWrapper>

            {/* Card 4: Predictive RUL */}
            <BentoWrapper href="/predictive-maintenance" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">Maintenance Center</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Predictive RUL</h3>
                </div>
                <BrainCircuit className="h-5 w-5 text-[#0EA5E9]" />
              </div>
              <div className="my-4">
                <div className="text-4xl font-black text-slate-900 font-mono-tech">{maxFailureRisk}%</div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1 block">Max failure risk index</span>
              </div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3 flex justify-between">
                <span>RUL diagnostics</span>
                <span className="text-[#0EA5E9] hover:underline font-bold">RUL Deck →</span>
              </div>
            </BentoWrapper>

            {/* Card 5: Energy Intelligence */}
            <BentoWrapper href="/energy-intelligence" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">Energy Optimizer</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Energy Intelligence</h3>
                </div>
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="my-4">
                <div className="text-2xl font-black text-slate-900 font-mono-tech">{totalPowerLoad.toFixed(1)} kW</div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1 block">Total dynamic thermal demand</span>
              </div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3 flex justify-between">
                <span>Grid optimization</span>
                <span className="text-[#0EA5E9] hover:underline font-bold">Optimize →</span>
              </div>
            </BentoWrapper>

            {/* Card 6: Anomaly Center */}
            <BentoWrapper href="/anomaly-center" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">Security Radar</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Anomaly Center</h3>
                </div>
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="my-4">
                <div className="text-4xl font-black text-red-650 font-mono-tech">{criticalCount}</div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1 block">Active critical anomalies</span>
              </div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3 flex justify-between">
                <span>Radar sweep</span>
                <span className="text-[#0EA5E9] hover:underline font-bold">Inspect →</span>
              </div>
            </BentoWrapper>

            {/* Card 7: Forecasting */}
            <BentoWrapper href="/forecasting" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">Trend Projection</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Forecasting</h3>
                </div>
                <Gauge className="h-5 w-5 text-teal-500" />
              </div>
              
              {/* Sparkline curve */}
              <div className="my-3">
                <svg className="h-10 w-full overflow-visible" viewBox="0 0 100 30">
                  <path d="M 0 25 Q 25 5, 50 18 T 100 8" fill="none" stroke="#14B8A6" strokeWidth="2.5" />
                </svg>
              </div>

              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3 flex justify-between">
                <span>90D telemetry</span>
                <span className="text-[#0EA5E9] hover:underline font-bold">Forecast →</span>
              </div>
            </BentoWrapper>

            {/* Card 8: Simulation Center */}
            <BentoWrapper href="/simulation-center" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">What-if Engine</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Simulation Lab</h3>
                </div>
                <Play className="h-5 w-5 text-[#0EA5E9]" />
              </div>
              <div className="my-4">
                <div className="text-2xl font-bold text-slate-900 font-mono-tech">Scenarios</div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1 block">Failure and optimization runs</span>
              </div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3 flex justify-between">
                <span>Simulation runs</span>
                <span className="text-[#0EA5E9] hover:underline font-bold">Simulate →</span>
              </div>
            </BentoWrapper>

            {/* Card 9: Reports registry */}
            <BentoWrapper href="/reports" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">Audit Registry</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Audit Reports</h3>
                </div>
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
              <div className="my-4">
                <div className="text-4xl font-black text-slate-900 font-mono-tech">{(reports.data || []).length}</div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1 block">Generated audit logs</span>
              </div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3 flex justify-between">
                <span>Export center</span>
                <span className="text-[#0EA5E9] hover:underline font-bold">Reports →</span>
              </div>
            </BentoWrapper>

            {/* Card 10: Model Status Registry */}
            <BentoWrapper href="/model-status" className="lg:col-span-2 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">Model registry</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Predictive Model Registry</h3>
                </div>
                <Cpu className="h-5 w-5 text-[#0EA5E9]" />
              </div>
              
              <div className="grid grid-cols-5 gap-1.5 my-4 text-center">
                <MiniModelBadge label="RUL" active={models.data?.health_model?.status === "loaded"} />
                <MiniModelBadge label="Energy" active={models.data?.energy_model?.status === "loaded"} />
                <MiniModelBadge label="Anomaly" active={models.data?.anomaly_model?.status === "loaded"} />
                <MiniModelBadge label="Forecast" active={models.data?.forecasting_model?.status === "loaded"} />
                <MiniModelBadge label="Flow" active={models.data?.bottleneck_model?.status === "loaded"} />
              </div>

              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3 flex justify-between">
                <span>Model Version Registry</span>
                <span className="text-slate-455 font-mono-tech">v{models.data?.health_model?.version || "1.0.0"}</span>
              </div>
            </BentoWrapper>

            {/* Card 11: Alert Center Console */}
            <BentoWrapper href="/alerts" className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">Incident Logs</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Alerts Console</h3>
                </div>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="my-4">
                <div className="text-4xl font-black text-slate-900 font-mono-tech">{(alerts.data || []).length}</div>
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1 block">Total logged events</span>
              </div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3 flex justify-between">
                <span>System alarms</span>
                <span className="text-[#0EA5E9] hover:underline font-bold">Alarms →</span>
              </div>
            </BentoWrapper>

          </div>

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
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={className}
    >
      <Link 
        href={href} 
        className="block h-full p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#0EA5E9]/25 hover:shadow-md shadow-sm transition-all"
      >
        {children}
      </Link>
    </motion.div>
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
    <div className="flex flex-col items-center gap-1.5">
      <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center text-[10px] font-black text-white shadow-sm`}>
        {label}
      </div>
      <span className="text-[8px] font-bold text-slate-550 font-mono-tech">{label}</span>
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
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 flex flex-col items-center justify-center">
      <span className="text-[9px] font-bold text-slate-550 uppercase block font-mono-tech">{label}</span>
      <span className={`inline-block h-1.5 w-1.5 rounded-full mt-1.5 ${active ? "bg-emerald-500 shadow-sm shadow-emerald-450 animate-pulse" : "bg-slate-300"}`} />
    </div>
  );
}
