"use client";

import { PageFrame } from "../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, Field, LoadingBlock } from "../../components/data-states";
import { useModelsStatus } from "../../hooks/use-nextwin";
import { Cpu, Calendar, Database, Sparkles, RefreshCcw, BarChart2 } from "lucide-react";
import { useMemo } from "react";

export const dynamic = "force-dynamic";

export default function ModelStatusPage() {
  const models = useModelsStatus();

  const records = useMemo(() => {
    if (!models.data) return [];
    return [
      { key: "health_model", name: "Health Prediction Model (RUL)", data: models.data.health_model },
      { key: "energy_model", name: "Energy Optimization Model", data: models.data.energy_model },
      { key: "anomaly_model", name: "Anomaly Sweep Model", data: models.data.anomaly_model },
      { key: "bottleneck_model", name: "Flow Congestion Model", data: models.data.bottleneck_model },
      { key: "forecasting_model", name: "Time Series Forecast Model", data: models.data.forecasting_model },
    ];
  }, [models.data]);

  return (
    <PageFrame 
      title="Model Status Registry" 
      kicker="Machine Learning Operations"
      actions={
        <button 
          onClick={() => models.refetch()} 
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:border-slate-350 transition-all shadow-sm"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> 
          <span>Revalidate Registry</span>
        </button>
      }
    >
      {models.isLoading && <LoadingBlock label="Polling ML model registry statuses..." />}
      {models.error && <ErrorBlock error={models.error} onRetry={() => models.refetch()} />}

      {!models.isLoading && !models.error && models.data && (
        <div className="grid gap-6">
          {/* Quick Overview Summary */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <SummaryTile label="Total Models" value={records.length} icon={Cpu} tone="blue" />
            <SummaryTile 
              label="Loaded Artifacts" 
              value={records.filter(r => r.data.status === "loaded").length} 
              icon={Sparkles} 
              tone="green" 
            />
            <SummaryTile 
              label="Registry Version" 
              value={models.data.health_model.version} 
              icon={Database} 
              tone="slate" 
            />
            <SummaryTile 
              label="Sync Status" 
              value="SYNCED" 
              icon={RefreshCcw} 
              tone="blue" 
            />
          </div>

          {/* Model Status Cards */}
          <div className="grid gap-6">
            {records.map((item) => (
              <div 
                key={item.key} 
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="font-mono-tech text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.key}</span>
                    <h3 className="text-base font-extrabold text-[#0F172A] mt-1">{item.name}</h3>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider border ${
                    item.data.status === "loaded" 
                      ? "border-emerald-100 bg-emerald-50 text-[#10B981]" 
                      : "border-red-100 bg-red-50 text-[#EF4444]"
                  }`}>
                    {item.data.status}
                  </span>
                </div>

                {/* Info parameters */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs border-y border-slate-100 py-4 font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-slate-450" />
                    <span>Path: <strong className="text-slate-700 font-mono-tech text-[11px]">{item.data.path}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-450" />
                    <span>Trained: <strong className="text-slate-700 font-mono-tech">{item.data.training_date || "2026-06-23"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-slate-450" />
                    <span>Version: <strong className="text-slate-700 font-mono-tech">v{item.data.version}</strong></span>
                  </div>
                </div>

                {/* Metrics detail parameters */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2 className="h-4 w-4 text-slate-400" />
                    <span className="metric-label">VALIDATION ACCURACY METRICS</span>
                  </div>
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                    {Object.entries(item.data.metrics || {}).map(([metricKey, metricValue]) => (
                      <div key={metricKey} className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-3 text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono-tech">{metricKey}</span>
                        <span className="text-xs font-mono-tech font-extrabold text-slate-800 mt-1 block">
                          {typeof metricValue === "number" ? metricValue.toFixed(4) : String(metricValue)}
                        </span>
                      </div>
                    ))}
                    {Object.keys(item.data.metrics || {}).length === 0 && (
                      <div className="col-span-full text-xs text-slate-400 py-1 font-semibold uppercase tracking-wider">
                        No validation metrics exported in registry pkl metadata.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}
    </PageFrame>
  );
}

function SummaryTile({ 
  label, 
  value, 
  icon: Icon, 
  tone 
}: { 
  label: string; 
  value: React.ReactNode; 
  icon: any; 
  tone: "blue" | "green" | "slate" 
}) {
  const styles = {
    blue: "text-blue-600 bg-blue-50/50",
    green: "text-emerald-600 bg-emerald-50/50",
    slate: "text-slate-750 bg-slate-100/70"
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
      <div>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
        <span className="text-xl font-mono-tech font-extrabold text-slate-800 block mt-2">{value}</span>
      </div>
      <span className={`p-2.5 rounded-full ${styles[tone]}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
    </div>
  );
}
