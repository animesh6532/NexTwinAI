"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Send, Terminal, Play, CheckSquare, Sparkles, MessageSquare, AlertCircle } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { PageFrame } from "../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/data-states";
import { nextwinApi } from "../../services/nextwin-api";
import { queryKeys, useCoreFactoryData } from "../../hooks/use-nextwin";

const suggestionActions = [
  { label: "Summarize plant risks", query: "Summarize the current factory risk." },
  { label: "Alert root causes", query: "Explain root cause candidates for active alerts." },
  { label: "Priority maintenance", query: "Which machine should maintenance inspect first?" },
  { label: "Thermal load savings", query: "How can we reduce energy waste today?" },
];

// Technical audit logging feed
const intelligenceFeed = [
  { time: "07:52:11", type: "INFO", message: "System OEE audit completed. Overall: Nominal." },
  { time: "07:52:45", type: "WARN", message: "M_003 Stamping unit registers temperature cycle deflection." },
  { time: "07:53:02", type: "INFO", message: "Energy load model generated optimization recommendation: -12.4 kW load offset." },
  { time: "07:53:50", type: "CRIT", message: "Anomaly trigger on M_004 Robotic joint. Risk exceeded 78% threshold." },
  { time: "07:54:15", type: "INFO", message: "Automatic alert notification scheduled for Maintenance shift." },
];

export const dynamic = "force-dynamic";

export default function CopilotPage() {
  const queryClient = useQueryClient();
  const { health, machines, twin, alerts } = useCoreFactoryData();
  const history = useQuery({ queryKey: queryKeys.copilotHistory, queryFn: nextwinApi.copilotHistory, refetchInterval: 60_000 });
  const [message, setMessage] = useState("");
  
  const chat = useMutation({
    mutationFn: (text: string) => nextwinApi.askCopilot(text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.copilotHistory }),
  });

  const summary = useMemo(() => ({
    machines: machines.data?.length || 0,
    states: twin.data?.length || 0,
    alerts: (alerts.data || []).filter((alert) => !alert.is_resolved).length,
    backend: health.data?.status || "Connecting",
  }), [machines.data, twin.data, alerts.data, health.data]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    chat.mutate(text);
    setMessage("");
  }

  function runSuggested(queryText: string) {
    chat.mutate(queryText);
  }

  return (
    <PageFrame title="AI Copilot" kicker="Cognitive Operating System">
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        
        {/* Left Column: Logs, Quick Actions, Stats */}
        <aside className="flex flex-col gap-4">
          
          {/* Quick Stats Context Card */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Terminal className="h-4.5 w-4.5" />
              </span>
              <div>
                <span className="metric-label">COGNITIVE INDEX</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Model Context Deck</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-bold uppercase text-slate-500 font-mono-tech">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className="block text-slate-400">Node Status:</span>
                <span className="block text-xs font-black text-slate-800 mt-1">{summary.backend}</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className="block text-slate-400">Total Engines:</span>
                <span className="block text-xs font-black text-slate-800 mt-1">{summary.machines} Units</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className="block text-slate-400">Twin Nodes:</span>
                <span className="block text-xs font-black text-slate-800 mt-1">{summary.states} Map</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <span className="block text-slate-400">Active Alerts:</span>
                <span className="block text-xs font-black text-red-500 mt-1">{summary.alerts} Logs</span>
              </div>
            </div>
          </section>

          {/* Quick AI Action suggestions */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md">
            <span className="metric-label">SUGGESTED DISPATCH QUERIES</span>
            <div className="mt-3.5 grid gap-2">
              {suggestionActions.map((act) => (
                <button
                  key={act.label}
                  disabled={chat.isPending}
                  onClick={() => runSuggested(act.query)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-150 bg-white text-left text-xs font-extrabold uppercase tracking-wider text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                >
                  <span>{act.label}</span>
                  <Play className="h-3 w-3 fill-current text-blue-600" />
                </button>
              ))}
            </div>
          </section>

          {/* Live intelligence feed log console */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md flex-1">
            <span className="metric-label">OPERATIONS LOG AUDIT</span>
            <div className="mt-3.5 space-y-3 font-mono-tech text-[10px] max-h-[220px] overflow-y-auto pr-1">
              {intelligenceFeed.map((log, i) => (
                <div key={i} className="flex gap-2.5 items-start leading-relaxed border-b border-slate-100/50 pb-2">
                  <span className="text-slate-400 shrink-0">[{log.time}]</span>
                  <span className={`font-bold shrink-0 ${
                    log.type === "CRIT" ? "text-red-500" : log.type === "WARN" ? "text-amber-500" : "text-blue-500"
                  }`}>[{log.type}]</span>
                  <span className="text-slate-600">{log.message}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* Right Column: AI Chat Panel */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-lg flex flex-col min-h-[580px]">
          <div className="border-b border-slate-200 bg-white/50 px-5 py-4.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-blue-600 animate-pulse" />
              <div>
                <span className="metric-label">COG-COMM CHANNEL</span>
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-0.5">Automated Risk Analysis</h2>
              </div>
            </div>
          </div>

          {/* Conversation history lists */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {history.isLoading && <LoadingBlock label="Initializing cognitive logs..." />}
            {history.error && <ErrorBlock error={history.error} onRetry={() => history.refetch()} />}
            {chat.error && <ErrorBlock error={chat.error} />}

            {(history.data || []).map((item, index) => (
              <div key={item.id || index} className="space-y-4">
                {item.message && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs font-medium leading-relaxed text-slate-800 shadow-sm flex gap-3 items-start">
                      <MessageSquare className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{item.message}</span>
                    </div>
                  </div>
                )}
                {item.response && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl border border-slate-150 bg-white p-4 text-xs font-medium leading-relaxed text-slate-700 shadow-sm flex gap-3 items-start">
                      <Bot className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono-tech">AI Copilot Analysis</div>
                        <span>{item.response}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {chat.isPending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl border border-slate-150 bg-white p-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-mono-tech shadow-sm flex gap-3 items-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping" />
                  <span>Synthesizing plant context logs...</span>
                </div>
              </div>
            )}

            {!history.isLoading && !history.error && (!history.data || history.data.length === 0) && (
              <EmptyBlock 
                title="Copilot Console Idle" 
                body="Enter an operational prompt below or execute a suggested dispatch query to summarize OEE risk data." 
              />
            )}
          </div>

          {/* Prompt Entry Form */}
          <form onSubmit={submit} className="flex gap-2.5 border-t border-slate-200 p-4 bg-slate-50/30">
            <input 
              value={message} 
              onChange={(event) => setMessage(event.target.value)} 
              placeholder="Query factory parameters (e.g. explain M_004 failure risk)" 
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium shadow-inner"
            />
            <button 
              disabled={chat.isPending || !message.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dispatch</span>
            </button>
          </form>
        </section>

      </div>
    </PageFrame>
  );
}
