"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCcw, Bell, ShieldAlert, CheckCircle, Terminal } from "lucide-react";
import { PageFrame } from "../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock, StatusPill } from "../../components/data-states";
import { nextwinApi } from "../../services/nextwin-api";
import { queryKeys } from "../../hooks/use-nextwin";
import { useMemo } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const alerts = useQuery({ queryKey: queryKeys.alerts, queryFn: () => nextwinApi.alerts(), refetchInterval: 20_000 });
  const resolve = useMutation({
    mutationFn: (alertId: number) => nextwinApi.resolveAlert(alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
  });
  
  const records = alerts.data || [];
  
  const critical = useMemo(() => records.filter((alert) => !alert.is_resolved && alert.severity.toLowerCase() === "critical"), [records]);
  const warning = useMemo(() => records.filter((alert) => !alert.is_resolved && alert.severity.toLowerCase() === "warning"), [records]);
  const resolved = useMemo(() => records.filter((alert) => alert.is_resolved), [records]);

  return (
    <PageFrame
      title="Alerts Console"
      kicker="Incident Notification Room"
      actions={
        <button 
          onClick={() => alerts.refetch()} 
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:border-slate-350 hover:text-slate-900 transition-all shadow-sm"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> 
          <span>Revalidate Logs</span>
        </button>
      }
    >
      {alerts.isLoading && <LoadingBlock label="Retrieving active incident registers..." />}
      {alerts.error && <ErrorBlock error={alerts.error} onRetry={() => alerts.refetch()} />}
      {resolve.error && <ErrorBlock error={resolve.error} />}
      
      {!alerts.isLoading && !alerts.error && (
        <div className="grid gap-5">
          {/* Severity tally widgets */}
          <div className="grid gap-4 grid-cols-3">
            <AlertTile label="Unresolved Critical" value={critical.length} icon={ShieldAlert} tone="red" />
            <AlertTile label="Unresolved Warning" value={warning.length} icon={Bell} tone="amber" />
            <AlertTile label="Resolved Actions" value={resolved.length} icon={CheckCircle} tone="green" />
          </div>

          {/* Timeline Incident Grid */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="h-4.5 w-4.5 text-slate-400" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech block">INCIDENT TIMELINE STREAM</span>
            </div>
            <div className="grid gap-3.5">
              {records.map((alert) => {
                const isCrit = !alert.is_resolved && alert.severity.toLowerCase() === "critical";
                
                return (
                  <div 
                    key={alert.id} 
                    className={`grid gap-4 rounded-xl border p-4 md:grid-cols-[1fr_auto_auto] md:items-center shadow-sm transition-all ${
                      isCrit 
                        ? "bg-red-50/50 border-red-100 text-slate-800" 
                        : "bg-white border-slate-200/60 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">{alert.title}</span>
                        <Link 
                          href={`/machines/${alert.machine_id}`}
                          className="font-mono-tech text-[9px] font-bold text-[#0EA5E9] bg-blue-50 border border-blue-150 px-2.5 py-0.5 rounded hover:bg-blue-100 transition-colors"
                        >
                          Node: {alert.machine_id}
                        </Link>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-650 font-medium">{alert.message}</p>
                      <p className="mt-2 text-[9px] font-bold text-slate-450 font-mono-tech uppercase tracking-wider">Logged cycle: {alert.created_at}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <StatusPill status={alert.is_resolved ? "Resolved" : alert.severity} />
                    </div>

                    <div className="flex items-center">
                      {!alert.is_resolved ? (
                        <button 
                          onClick={() => resolve.mutate(alert.id)} 
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-sky-600 shadow-sm transition-all"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" /> 
                          <span>Resolve</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-2 font-mono-tech">ARCHIVED</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {records.length === 0 && <EmptyBlock title="No incidents logged" body="No active anomaly alerts are flagged on the sensor grids." />}
            </div>
          </section>
        </div>
      )}
    </PageFrame>
  );
}

function AlertTile({ 
  label, 
  value, 
  icon: Icon, 
  tone 
}: { 
  label: string; 
  value: React.ReactNode; 
  icon: any; 
  tone: "red" | "amber" | "green" 
}) {
  const styles = {
    red: "text-red-600 bg-red-50 border border-red-100",
    amber: "text-amber-600 bg-amber-50 border border-amber-100",
    green: "text-emerald-600 bg-emerald-50 border border-emerald-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex items-center justify-between">
      <div>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono-tech block">{label}</span>
        <span className="text-xl font-mono-tech font-extrabold text-slate-900 block mt-2">{value}</span>
      </div>
      <span className={`p-2.5 rounded-full ${styles[tone]}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
    </div>
  );
}
