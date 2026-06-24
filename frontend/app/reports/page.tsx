"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FilePlus2, RefreshCcw, FileText, Database, Layers, Terminal } from "lucide-react";
import { useState, useMemo } from "react";
import { PageFrame } from "../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/data-states";
import { nextwinApi } from "../../services/nextwin-api";
import { queryKeys } from "../../hooks/use-nextwin";

const reportTypes = ["OEE", "Energy", "Bottleneck", "Maintenance"];

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [reportType, setReportType] = useState(reportTypes[0]);
  const reports = useQuery({ queryKey: queryKeys.reports, queryFn: nextwinApi.reports, refetchInterval: 60_000 });
  
  const create = useMutation({
    mutationFn: () => nextwinApi.createReport({ title: `${reportType} Plant Intelligence Report`, report_type: reportType }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
  });
  
  const records = reports.data || [];

  function downloadReport(report: { title: string; content: Record<string, unknown> }) {
    const blob = new Blob([JSON.stringify(report.content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.title.replace(/\s+/g, "-").toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
        <button 
          onClick={() => reports.refetch()} 
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all shadow-sm backdrop-blur-md"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> 
          <span>Revalidate Reports</span>
        </button>
      }
    >
      {/* Parameter builder card */}
      <div className="bg-white mb-5 flex flex-col gap-4 p-5 rounded-2xl border border-slate-200 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech">Category:</span>
          <select 
            value={reportType} 
            onChange={(event) => setReportType(event.target.value)} 
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-slate-800 shadow-sm focus:border-[#0EA5E9]/40 focus:ring-0"
          >
            {reportTypes.map((type) => (
              <option key={type} value={type}>{type} Optimization</option>
            ))}
          </select>
        </div>
        <button 
          disabled={create.isPending}
          onClick={() => create.mutate()} 
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] hover:bg-[#38BDF8] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm disabled:opacity-50"
        >
          <FilePlus2 className="h-4 w-4" /> 
          <span>Generate Factory Audit</span>
        </button>
      </div>

      {reports.isLoading && <LoadingBlock label="Retrieving generated data files..." />}
      {reports.error && <ErrorBlock error={reports.error} onRetry={() => reports.refetch()} />}
      {create.error && <ErrorBlock error={create.error} />}
      
      {!reports.isLoading && !reports.error && (
        <div className="grid gap-5">
          {/* Metadata counters */}
          <div className="grid gap-4 grid-cols-3">
            <ReportStat label="Compiled Audits" value={records.length} icon={FileText} tone="blue" />
            <ReportStat label="Category Filter" value={reportType} icon={Layers} tone="amber" />
            <ReportStat label="Latest Generation" value={latestTime} icon={Database} tone="green" />
          </div>

          {/* Generated Documents list */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="h-4.5 w-4.5 text-slate-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">INTELLIGENCE REGISTRY</span>
            </div>
            <div className="grid gap-4">
              {records.map((report) => (
                <div 
                  key={report.id} 
                  className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4.5 md:grid-cols-[1fr_auto] md:items-center shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">{report.title}</div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 font-mono-tech tracking-wider">
                      Module: {report.report_type} | Compiled: {report.created_at}
                    </div>
                    {/* Collapsible/Clean JSON view */}
                    <div className="mt-3.5 relative rounded-xl border border-slate-150 bg-white p-4">
                      <div className="absolute right-3.5 top-3.5 font-mono-tech text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                        JSON PAYLOAD
                      </div>
                      <pre className="max-h-36 overflow-auto text-[10px] font-mono-tech text-slate-600 leading-normal">
                        {JSON.stringify(report.content, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <button 
                    onClick={() => downloadReport(report)} 
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 shadow-sm hover:border-slate-350 hover:text-slate-900 transition-all self-start md:self-center"
                  >
                    <Download className="h-3.5 w-3.5" /> 
                    <span>Download</span>
                  </button>
                </div>
              ))}
              {records.length === 0 && <EmptyBlock title="No reports generated" body="Configure parameter ranges above to compile the first plant intelligence audit report." />}
            </div>
          </section>
        </div>
      )}
    </PageFrame>
  );
}

function ReportStat({ 
  label, 
  value, 
  icon: Icon, 
  tone 
}: { 
  label: string; 
  value: React.ReactNode; 
  icon: any; 
  tone: "blue" | "amber" | "green" 
}) {
  const styles = {
    blue: "text-[#0EA5E9] bg-blue-50 border-blue-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    green: "text-emerald-600 bg-emerald-50 border-emerald-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
      <div className="min-w-0">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">{label}</span>
        <span className="text-sm font-mono-tech font-extrabold text-slate-800 block mt-2 truncate">{value}</span>
      </div>
      <span className={`p-2.5 rounded-full shrink-0 border ${styles[tone]}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
    </div>
  );
}
