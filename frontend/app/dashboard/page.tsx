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
  Bot, 
  Boxes, 
  FileText, 
  ArrowRight,
  Database,
  Cpu,
  Play,
  Radio
} from "lucide-react";
import { PageFrame } from "../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, Field, LoadingBlock, StatusPill } from "../../components/data-states";
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
  
  const criticalStates = useMemo(() => 
    (twin.data || []).filter((state) => state.status.toLowerCase().includes("critical")),
    [twin.data]
  );

  const warningStates = useMemo(() => 
    (twin.data || []).filter((state) => state.status.toLowerCase().includes("warning")),
    [twin.data]
  );

  // OEE plant metric calculation
  const overallOee = useMemo(() => {
    if (!twin.data || twin.data.length === 0) return 98;
    const sum = twin.data.reduce((acc, m) => acc + m.health_score, 0);
    return Math.round(sum / twin.data.length);
  }, [twin.data]);

  // Max failure probability
  const maxFailureRisk = useMemo(() => {
    if (!twin.data || twin.data.length === 0) return 0;
    const maxVal = Math.max(...twin.data.map(m => m.failure_probability));
    return Math.round(maxVal * 100);
  }, [twin.data]);

  // Energy metric summary
  const totalPowerLoad = useMemo(() => {
    if (!twin.data || twin.data.length === 0) return 0;
    return twin.data.reduce((acc, m) => acc + m.energy_usage, 0);
  }, [twin.data]);

  return (
    <PageFrame
      title="Platform Operations"
      kicker="Industrial Control deck"
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
          
          {/* Card 1: Factory Health (colspan-2) */}
          <BentoWrapper href="/dashboard" className="lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">GATEWAY METRICS</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Platform Diagnostics</h3>
              </div>
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div className="grid grid-cols-3 gap-3 my-4">
              <MiniIndicator label="API status" value={health.data?.status || "Live"} status="success" />
              <MiniIndicator label="Database" value={health.data?.database_connected ? "OK" : "ERR"} status={health.data?.database_connected ? "success" : "critical"} />
              <MiniIndicator label="OEE Level" value={`${overallOee}%`} status="success" />
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 border-t border-slate-100 pt-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              System operations reporting active telemetry
            </div>
          </BentoWrapper>

          {/* Card 2: Model Status (colspan-2) */}
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
            <div className="text-[10px] font-bold text-slate-450 uppercase tracking-wide border-t border-slate-100 pt-3 flex justify-between">
              <span>Registry version:</span>
              <span className="font-mono-tech text-slate-700">v{models.data?.health_model?.version || "1.0.0"}</span>
            </div>
          </BentoWrapper>

          {/* Card 3: Machines Catalog */}
          <BentoWrapper href="/machines" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">ASSET CATALOG</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Factory Assets</h3>
              </div>
              <Boxes className="h-5 w-5 text-slate-500" />
            </div>
            <div className="my-4">
              <div className="text-3xl font-extrabold font-mono-tech text-slate-800">{machines.data?.length || 0}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Monitored equipment assets</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>View catalog:</span>
              <span className="text-blue-600 font-bold hover:underline">Assets →</span>
            </div>
          </BentoWrapper>

          {/* Card 4: Predictive Maintenance */}
          <BentoWrapper href="/predictive-maintenance" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">MAINTENANCE CENTER</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Predictive RUL</h3>
              </div>
              <BrainCircuit className="h-5 w-5 text-amber-500" />
            </div>
            <div className="my-4">
              <div className="text-3xl font-extrabold font-mono-tech text-slate-800">{maxFailureRisk}%</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Max Failure Risk In Facility</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>States monitored:</span>
              <span className="font-mono-tech text-slate-700">{twin.data?.length || 0} Units</span>
            </div>
          </BentoWrapper>

          {/* Card 5: Energy Intelligence */}
          <BentoWrapper href="/energy-intelligence" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">ENERGY OPTIMIZER</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Operational Load</h3>
              </div>
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="my-4">
              <div className="text-3xl font-extrabold font-mono-tech text-slate-800">{totalPowerLoad.toFixed(1)} kW</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total Active Thermal Consumption</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>Optimization:</span>
              <span className="font-mono-tech text-slate-700">Balanced OEE</span>
            </div>
          </BentoWrapper>

          {/* Card 6: Digital Twin (colspan-2 rowspan-2) */}
          <BentoWrapper href="/digital-twin" className="lg:col-span-2 lg:row-span-2 flex flex-col justify-between min-h-[380px]">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">SPATIAL DIGITAL TWIN</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Machine Network Layout</h3>
              </div>
              <Factory className="h-5 w-5 text-indigo-600" />
            </div>
            
            {/* Visual machine pipeline preview */}
            <div className="my-5 flex-1 relative flex items-center justify-center bg-slate-50 rounded-xl p-4 border border-slate-100 overflow-hidden">
              <div className="absolute inset-0 bg-grid-slate-100 opacity-20" />
              <div className="flex justify-between items-center w-full max-w-[280px] z-10">
                <MiniTwinNode label="M01" status={twin.data?.[0]?.status} />
                <div className="h-[2px] flex-1 border-t border-dashed border-slate-300" />
                <MiniTwinNode label="M02" status={twin.data?.[1]?.status} />
                <div className="h-[2px] flex-1 border-t border-dashed border-slate-300" />
                <MiniTwinNode label="M04" status={twin.data?.[3]?.status} />
              </div>
            </div>

            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>Active flow pipelines:</span>
              <span className="text-blue-600 font-mono-tech">Conveyors Active</span>
            </div>
          </BentoWrapper>

          {/* Card 7: Anomaly Center */}
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
              <span>Severe reports:</span>
              <span className="text-red-500 font-mono-tech font-extrabold">{criticalStates.length} Active</span>
            </div>
          </BentoWrapper>

          {/* Card 8: Bottleneck Center */}
          <BentoWrapper href="/bottleneck-center" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">CONGESTION DETECTOR</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Flow Congestion</h3>
              </div>
              <Network className="h-5 w-5 text-orange-500" />
            </div>
            <div className="my-4">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${Math.max(10, 100 - overallOee)}%` }} />
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2.5">Delay congestion projection</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>Congested zones:</span>
              <span className="font-mono-tech text-slate-700">{warningStates.length} Warning</span>
            </div>
          </BentoWrapper>

          {/* Card 9: Forecasting */}
          <BentoWrapper href="/forecasting" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">TREND PROJECTION</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Forecasting</h3>
              </div>
              <Gauge className="h-5 w-5 text-teal-600" />
            </div>
            
            {/* Simple projection SVG sparkline */}
            <div className="my-3">
              <svg className="h-10 w-full overflow-visible" viewBox="0 0 100 30">
                <path d="M 0 25 Q 25 5, 50 18 T 100 10" fill="none" stroke="#0D9488" strokeWidth="2.5" />
              </svg>
            </div>

            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>Future scope:</span>
              <span className="text-teal-600 font-mono-tech font-extrabold">90D Telemetry</span>
            </div>
          </BentoWrapper>

          {/* Card 10: Simulation Center */}
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

          {/* Card 11: Sensors Console */}
          <BentoWrapper href="/sensors" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">EDGE TELEMETRY</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Sensors Console</h3>
              </div>
              <Radio className="h-5 w-5 text-emerald-600 animate-pulse" />
            </div>
            <div className="my-4">
              <div className="text-2xl font-extrabold font-mono-tech text-emerald-600">Active feeds</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Publish manual telemetry</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>View console:</span>
              <span className="text-blue-600 font-bold hover:underline">Feeds →</span>
            </div>
          </BentoWrapper>

          {/* Card 12: Reports Registry */}
          <BentoWrapper href="/reports" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">AUDIT ARCHIVE</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Reports</h3>
              </div>
              <FileText className="h-5 w-5 text-slate-500" />
            </div>
            <div className="my-4">
              <div className="text-3xl font-extrabold font-mono-tech text-slate-800">{(reports.data || []).length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Generated audit logs</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>View archive:</span>
              <span className="text-blue-600 font-bold hover:underline">Reports →</span>
            </div>
          </BentoWrapper>

          {/* Card 13: Alerts Console */}
          <BentoWrapper href="/alerts" className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">INCIDENT LOGS</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">Alerts Console</h3>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="my-4">
              <div className="text-3xl font-extrabold font-mono-tech text-slate-800">{(alerts.data || []).length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Total system events</div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>View alerts:</span>
              <span className="text-blue-600 font-bold hover:underline">Incidents →</span>
            </div>
          </BentoWrapper>

          {/* Card 14: AI Copilot (colspan-2) */}
          <BentoWrapper href="/ai-copilot" className="lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="metric-label">INTELLIGENCE TERMINAL</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-1">AI Copilot Chat Summary</h3>
              </div>
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div className="my-3.5 bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono-tech">Copilot summary:</div>
              <div className="text-xs text-slate-600 mt-1.5 font-medium leading-relaxed">
                Overall plant OEE is at <span className="font-bold text-slate-800">{overallOee}%</span>. {criticalStates.length > 0 ? "Inspect critical assembly joints." : "All systems nominal."}
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase border-t border-slate-100 pt-3 flex justify-between">
              <span>AI assistant floating:</span>
              <span className="text-blue-600 font-mono-tech font-bold hover:underline">Launch copilot →</span>
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
  status: "success" | "critical"
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2 text-center">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
      <span className={`text-xs font-mono-tech font-extrabold block mt-1 ${status === "success" ? "text-slate-800" : "text-red-500"}`}>{value}</span>
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
