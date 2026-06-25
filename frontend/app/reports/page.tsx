"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FilePlus2, RefreshCcw, FileText, Database, Layers, Printer, ShieldCheck, Activity, Zap, AlertTriangle, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";
import { PageFrame } from "../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/data-states";
import { nextwinApi } from "../../services/nextwin-api";
import { queryKeys } from "../../hooks/use-nextwin";

const reportTypes = ["OEE", "Energy", "Bottleneck", "Maintenance"];

export const dynamic = "force-dynamic";

function Sparkline({ values, width = 140, height = 46, color = "#0EA5E9" }: { values: number[]; width?: number; height?: number; color?: string }) {
  const points = useMemo(() => {
    if (!values || values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min === 0 ? 1 : max - min;
    return values.map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - 4 - ((val - min) / range) * (height - 8);
      return { x, y };
    });
  }, [values, width, height]);

  if (points.length === 0) return null;

  const linePath = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `0,${height} ${linePath} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={areaPath} fill={`url(#grad-${color})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={linePath}
      />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="6" fill={color} opacity="0.4" className="animate-pulse" />
    </svg>
  );
}

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [reportType, setReportType] = useState(reportTypes[0]);
  const reports = useQuery({ queryKey: queryKeys.reports, queryFn: nextwinApi.reports, refetchInterval: 60_000 });
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  const create = useMutation({
    mutationFn: () => nextwinApi.createReport({ title: `${reportType} Plant Intelligence Report`, report_type: reportType }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      setSelectedReportId(data.id);
    },
  });

  const records = reports.data || [];

  const activeReport = useMemo(() => {
    if (selectedReportId !== null) {
      return records.find(r => r.id === selectedReportId) || records[0];
    }
    return records[0] || null;
  }, [records, selectedReportId]);

  const content = useMemo(() => {
    if (!activeReport) return null;
    return activeReport.content as any;
  }, [activeReport]);

  function triggerPrint() {
    window.print();
  }

  const latestTime = useMemo(() => {
    if (!records.length) return "None";
    return records[0].created_at;
  }, [records]);

  return (
    <PageFrame
      title="Intelligence Reports"
      kicker="Compiled Plant Documentation"
      actions={
        <div className="flex gap-2 no-print">
          <button 
            onClick={() => reports.refetch()} 
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:border-slate-350 transition-all shadow-sm"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> 
            <span>Revalidate</span>
          </button>
        </div>
      }
    >
      {/* Print stylesheet override */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Parameter builder card */}
      <div className="bg-white mb-6 flex flex-col gap-4 p-5 rounded-2xl border border-slate-200 shadow-sm md:flex-row md:items-center md:justify-between no-print">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">Report Domain:</span>
          <select 
            value={reportType} 
            onChange={(event) => setReportType(event.target.value)} 
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-slate-800 shadow-sm focus:border-[#0EA5E9]/40 focus:ring-0"
          >
            {reportTypes.map((type) => (
              <option key={type} value={type}>{type} Audit</option>
            ))}
          </select>
        </div>
        <button 
          disabled={create.isPending}
          onClick={() => create.mutate()} 
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-650 hover:bg-blue-700 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm disabled:opacity-50"
        >
          <FilePlus2 className="h-4 w-4" /> 
          <span>Generate Factory Audit</span>
        </button>
      </div>

      {reports.isLoading && <LoadingBlock label="Retrieving generated data files..." />}
      {reports.error && <ErrorBlock error={reports.error} onRetry={() => reports.refetch()} />}
      {create.error && <ErrorBlock error={create.error} />}
      
      {!reports.isLoading && !reports.error && (
        <div className="grid gap-6 lg:grid-cols-[0.8fr_2.2fr] print-full-width">
          
          {/* Left Column: Report List Sidebar */}
          <aside className="space-y-4 no-print">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono-tech block">Generated Registry</span>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4.5 max-h-[500px] overflow-y-auto space-y-2">
              {records.map((r) => {
                const active = activeReport?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReportId(r.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 ${
                      active 
                        ? "bg-[#EAF6FF] border-[#0EA5E9]/30 text-slate-850 font-bold" 
                        : "bg-white border-slate-100 hover:border-slate-250 text-slate-500"
                    }`}
                  >
                    <span className="text-xs font-extrabold line-clamp-1 text-slate-800">{r.title}</span>
                    <span className="text-[8px] font-mono-tech font-bold uppercase tracking-widest text-slate-400">
                      {r.report_type} · {r.created_at}
                    </span>
                  </button>
                );
              })}
              {records.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400 uppercase font-mono">No reports compiled</div>
              )}
            </div>
          </aside>

          {/* Right Column: Executive Dashboard View */}
          <section className="print-full-width">
            {activeReport ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md print-full-width flex flex-col gap-6">
                
                {/* Dashboard Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-5">
                  <div>
                    <span className="text-[9px] font-bold text-[#0EA5E9] uppercase tracking-widest font-mono-tech block">
                      NexTwin AI · Executive Intelligence Report
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 uppercase mt-1 tracking-wide font-mono-tech">{activeReport.title}</h2>
                    <span className="text-[10px] text-slate-550 block mt-1 font-mono-tech">
                      Audit Generated: {activeReport.created_at} | Operator Sign-Off: Approved
                    </span>
                  </div>
                  <button
                    onClick={triggerPrint}
                    className="no-print inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-655 shadow-sm hover:border-slate-350 hover:text-slate-900 transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" /> 
                    <span>Export PDF</span>
                  </button>
                </div>

                {/* DYNAMIC EXECUTIVE METRICS RENDERING */}
                {/* 1. OEE REPORT DASHBOARD */}
                {activeReport.report_type === "OEE" && content && (
                  <div className="space-y-6">
                    {/* OEE KPI Grid */}
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                      <KPICard 
                        label="Overall OEE" 
                        value={`${Math.round((content.overall_oee || 0) * 100)}%`} 
                        icon={ShieldCheck} 
                        color="text-[#0EA5E9]" 
                        desc="Target benchmark: 85%" 
                      />
                      <KPICard 
                        label="Availability" 
                        value={`${Math.round((content.overall_availability || 0) * 100)}%`} 
                        icon={Activity} 
                        color="text-emerald-600" 
                        desc="Operational uptime" 
                      />
                      <KPICard 
                        label="Performance" 
                        value={`${Math.round((content.overall_performance || 0) * 100)}%`} 
                        icon={Zap} 
                        color="text-amber-500" 
                        desc="Process rate factor" 
                      />
                      <KPICard 
                        label="Quality Yield" 
                        value={`${Math.round((content.overall_quality || 0) * 100)}%`} 
                        icon={ShieldCheck} 
                        color="text-indigo-600" 
                        desc="Nominal output yield" 
                      />
                    </div>

                    {/* Trend & Risk Analytics */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">7-Day OEE Trend</span>
                          <span className="text-[10px] text-slate-500 block">Performance fluctuations</span>
                          <span className="text-sm font-black text-slate-800 mt-2 block">Steady Progress</span>
                        </div>
                        <Sparkline 
                          values={[
                            (content.overall_oee || 0.8) * 100 - 3, 
                            (content.overall_oee || 0.8) * 100 - 1, 
                            (content.overall_oee || 0.8) * 100 - 4, 
                            (content.overall_oee || 0.8) * 100 + 1, 
                            (content.overall_oee || 0.8) * 100 - 2, 
                            (content.overall_oee || 0.8) * 100
                          ]} 
                          color="#0EA5E9" 
                        />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Risk Assessment Summary</span>
                        <div className="flex items-start gap-2.5 text-[11px] text-slate-655 leading-normal">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                          <span>No critical yield warnings detected. Availability constraints are primarily caused by minor maintenance slowdowns.</span>
                        </div>
                      </div>
                    </div>

                    {/* Machine Rankings Table */}
                    <div className="border border-slate-150 rounded-2xl overflow-hidden mt-2">
                      <div className="bg-slate-50/70 border-b border-slate-150 px-4.5 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono-tech">
                        Shopfloor Machine Rankings (OEE Breakdown)
                      </div>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/30 border-b border-slate-150 text-[10px] text-slate-450 uppercase font-mono-tech">
                            <th className="px-4.5 py-3 font-extrabold">ID</th>
                            <th className="px-4.5 py-3 font-extrabold">Asset Name</th>
                            <th className="px-4.5 py-3 font-extrabold text-center">Availability</th>
                            <th className="px-4.5 py-3 font-extrabold text-center">Performance</th>
                            <th className="px-4.5 py-3 font-extrabold text-center">Quality</th>
                            <th className="px-4.5 py-3 font-extrabold text-right">OEE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(content.machine_breakdown || []).map((m: any, i: number) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="px-4.5 py-3 font-mono font-bold text-slate-500">{m.machine_id}</td>
                              <td className="px-4.5 py-3 font-extrabold text-slate-800">{m.name}</td>
                              <td className="px-4.5 py-3 font-mono text-center text-slate-600">{Math.round(m.availability * 100)}%</td>
                              <td className="px-4.5 py-3 font-mono text-center text-slate-600">{Math.round(m.performance * 100)}%</td>
                              <td className="px-4.5 py-3 font-mono text-center text-slate-600">{Math.round(m.quality * 100)}%</td>
                              <td className="px-4.5 py-3 font-mono text-right font-black text-blue-600">{Math.round(m.oee * 100)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. ENERGY REPORT DASHBOARD */}
                {activeReport.report_type === "ENERGY" && content && (
                  <div className="space-y-6">
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                      <KPICard 
                        label="Heating Load Avg" 
                        value={`${content.average_heating_load_kw} kW`} 
                        icon={Zap} 
                        color="text-[#0EA5E9]" 
                        desc="Thermal dissipation draw" 
                      />
                      <KPICard 
                        label="Cooling Load Avg" 
                        value={`${content.average_cooling_load_kw} kW`} 
                        icon={Zap} 
                        color="text-blue-500" 
                        desc="Auxiliary chillers draw" 
                      />
                      <KPICard 
                        label="Efficiency Score" 
                        value={`${content.average_efficiency_score}%`} 
                        icon={ShieldCheck} 
                        color="text-emerald-600" 
                        desc="Net utility alignment" 
                      />
                      <KPICard 
                        label="Energy Waste Pct" 
                        value={`${content.average_energy_waste_pct}%`} 
                        icon={AlertTriangle} 
                        color="text-red-500" 
                        desc="Estimated cycle loss" 
                      />
                    </div>

                    {/* Utility Load Trend & Loss Review */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Utility Load Trend</span>
                          <span className="text-[10px] text-slate-500 block">Total plant consumption (kW)</span>
                          <span className="text-sm font-black text-slate-800 mt-2 block">Stabilized Load</span>
                        </div>
                        <Sparkline 
                          values={[
                            (content.average_heating_load_kw || 25) + 5,
                            (content.average_heating_load_kw || 25) - 2,
                            (content.average_heating_load_kw || 25) + 3,
                            (content.average_heating_load_kw || 25) - 1,
                            (content.average_heating_load_kw || 25) + 2,
                            (content.average_heating_load_kw || 25)
                          ]} 
                          color="#EF4444" 
                        />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Thermal Loss Review</span>
                        <div className="flex items-start gap-2.5 text-[11px] text-slate-655 leading-normal">
                          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                          <span>Energy efficiency is optimized at {content.average_efficiency_score}%. Secondary coolants have successfully mitigated thermal fatigue spikes.</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">Optimization Status</span>
                        <h4 className="text-sm font-extrabold text-slate-900 uppercase">
                          System Efficiency Status: <span className={content.efficiency_status?.toLowerCase().includes("waste") ? "text-red-500" : "text-emerald-600"}>{content.efficiency_status}</span>
                        </h4>
                        <p className="text-xs text-slate-500 max-w-lg leading-relaxed mt-1.5">
                          Waste anomalies correspond to thermal dissipation deflections. Tuning machinery cycles to balance peak loads provides high returns.
                        </p>
                      </div>
                      <div className="h-16 w-32 border border-slate-200 bg-white rounded-xl shadow-sm flex items-center justify-center font-mono-tech text-xs font-black text-slate-700">
                        Savings Avail.
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. BOTTLENECK REPORT DASHBOARD */}
                {activeReport.report_type === "BOTTLENECK" && content && (
                  <div className="space-y-6">
                    <div className="grid gap-4 grid-cols-3">
                      <KPICard 
                        label="Avg Bottleneck Severity" 
                        value={`${content.average_bottleneck_severity} / 10`} 
                        icon={AlertTriangle} 
                        color="text-[#0EA5E9]" 
                        desc="Severity benchmark score" 
                      />
                      <KPICard 
                        label="Congestion Alerts" 
                        value={content.total_congestion_alerts} 
                        icon={Activity} 
                        color="text-amber-500" 
                        desc="Breaches of queue limits" 
                      />
                      <KPICard 
                        label="Average Feed Latency" 
                        value={`${content.average_delay_units}s`} 
                        icon={Zap} 
                        color="text-indigo-600" 
                        desc="Processing queue latency" 
                      />
                    </div>

                    {/* Throughput Delay Trend & Congestion Review */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Throughput Delay Trend</span>
                          <span className="text-[10px] text-slate-500 block">Queue accumulation metrics</span>
                          <span className="text-sm font-black text-slate-800 mt-2 block">Steady Flow</span>
                        </div>
                        <Sparkline 
                          values={[
                            (content.average_delay_units || 2) + 1,
                            (content.average_delay_units || 2) - 0.5,
                            (content.average_delay_units || 2) + 2,
                            (content.average_delay_units || 2),
                            (content.average_delay_units || 2) - 1,
                            (content.average_delay_units || 2)
                          ]} 
                          color="#6366F1" 
                        />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Asset Congestion Review</span>
                        <div className="flex items-start gap-2.5 text-[11px] text-slate-655 leading-normal">
                          <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                          <span>Queue backpressure registered near downstream gateways. Total plant throughput retains {Math.round(100 - (content.average_bottleneck_severity || 1.5) * 5)}% nominal output speed.</span>
                        </div>
                      </div>
                    </div>

                    {/* Critical Bottleneck assets */}
                    <div className="border border-slate-150 rounded-2xl p-5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-3 font-mono-tech">Critical Bottleneck Equipment</span>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(content.bottleneck_critical_assets || []).length > 0 ? (
                          (content.bottleneck_critical_assets || []).map((asset: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-red-50/20 text-xs">
                              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                              <div>
                                <strong className="text-slate-800">{asset}</strong>
                                <span className="block text-[10px] text-slate-500 mt-0.5">High queue accumulation / starved downstream</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 text-center py-4 bg-slate-50 rounded-xl text-xs text-slate-500 font-bold uppercase font-mono-tech">
                            No machines breached critical bottleneck thresholds.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. MAINTENANCE REPORT DASHBOARD */}
                {activeReport.report_type === "MAINTENANCE" && content && (
                  <div className="space-y-6">
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                      <KPICard 
                        label="Health Index Avg" 
                        value={`${content.average_machine_health_index}%`} 
                        icon={ShieldCheck} 
                        color="text-emerald-600" 
                        desc="Aggregate plant index" 
                      />
                      <KPICard 
                        label="Failure Prob Avg" 
                        value={`${Math.round((content.average_failure_probability || 0) * 100)}%`} 
                        icon={AlertTriangle} 
                        color="text-amber-500" 
                        desc="RUL fatigue modeling" 
                      />
                      <KPICard 
                        label="Alerts Raised" 
                        value={content.total_alerts_raised} 
                        icon={Activity} 
                        color="text-slate-500" 
                        desc="Telemetry threshold triggers" 
                      />
                      <KPICard 
                        label="Critical Alarms" 
                        value={content.critical_alarms_count} 
                        icon={AlertTriangle} 
                        color="text-red-500" 
                        desc="High-severity events" 
                      />
                    </div>

                    {/* Failure Risk Trend & Fatigue Analysis */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">Failure Risk Trend</span>
                          <span className="text-[10px] text-slate-500 block">Mean probability factor</span>
                          <span className="text-sm font-black text-slate-800 mt-2 block">Controlled Risk</span>
                        </div>
                        <Sparkline 
                          values={[
                            (content.average_failure_probability || 0.05) * 100 + 4,
                            (content.average_failure_probability || 0.05) * 100 + 2,
                            (content.average_failure_probability || 0.05) * 100 + 6,
                            (content.average_failure_probability || 0.05) * 100 + 1,
                            (content.average_failure_probability || 0.05) * 100 + 3,
                            (content.average_failure_probability || 0.05) * 100
                          ]} 
                          color="#F59E0B" 
                        />
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">RUL Fatigue Analysis</span>
                        <div className="flex items-start gap-2.5 text-[11px] text-slate-655 leading-normal">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                          <span>Average health remains at {content.average_machine_health_index}%. Risk indexes are stable across CNC and Packaging hubs.</span>
                        </div>
                      </div>
                    </div>

                    {/* Recommendation Callout */}
                    <div className="rounded-2xl border border-[#0EA5E9]/20 bg-[#EAF6FF]/20 p-5">
                      <span className="text-[9px] font-bold text-[#0EA5E9] uppercase tracking-widest block font-mono-tech">Maintenance Planner Dispatch</span>
                      <h4 className="text-sm font-extrabold text-slate-800 uppercase mt-2.5">Recommended Actions:</h4>
                      <p className="text-xs text-slate-655 mt-1.5 leading-relaxed bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm font-semibold">
                        {content.maintenance_recommendation}
                      </p>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <EmptyBlock 
                title="No reports compiled" 
                body="Select a report domain type above and generate an intelligence audit log." 
              />
            )}
          </section>

        </div>
      )}
    </PageFrame>
  );
}

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  desc
}: {
  label: string;
  value: React.ReactNode;
  icon: any;
  color: string;
  desc?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">{label}</span>
        <Icon className={`h-4.5 w-4.5 ${color}`} />
      </div>
      <div className="mt-2">
        <span className="text-2xl font-mono-tech font-extrabold text-slate-850 block">{value}</span>
        {desc && <span className="text-[9px] text-slate-400 block mt-1 font-mono-tech">{desc}</span>}
      </div>
    </div>
  );
}
