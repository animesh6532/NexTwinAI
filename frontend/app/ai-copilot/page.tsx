"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Send, Terminal, Play, Sparkles, MessageSquare, Plus, Clock, Cpu } from "lucide-react";
import { FormEvent, useMemo, useState, useEffect } from "react";
import { PageFrame } from "../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/data-states";
import { nextwinApi } from "../../services/nextwin-api";
import { useCoreFactoryData } from "../../hooks/use-nextwin";

const suggestionActions = [
  { label: "Summarize plant risks", query: "Summarize the current factory risk." },
  { label: "Alert root causes", query: "Explain root cause candidates for active alerts." },
  { label: "Priority maintenance", query: "Which machine should maintenance inspect first?" },
  { label: "Thermal load savings", query: "How can we reduce energy waste today?" },
];

const intelligenceFeed = [
  { time: "08:24:11", type: "INFO", message: "System OEE audit completed. Overall: Nominal." },
  { time: "08:24:45", type: "WARN", message: "M_003 Welder unit registers temperature cycle deflection." },
  { time: "08:25:02", type: "INFO", message: "Energy load model generated optimization recommendation: -12.4 kW load offset." },
  { time: "08:25:50", type: "CRIT", message: "Anomaly trigger on M_001 joint. Risk exceeded 88% threshold." },
  { time: "08:26:15", type: "INFO", message: "Automatic alert notification scheduled for Maintenance shift." },
];

// Inline Bold formatting helper (**text** -> <strong>text</strong>)
function parseInlineBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="text-slate-900 font-extrabold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function MarkdownRenderer({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed font-medium">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        if (trimmed.startsWith("###")) {
          return (
            <h4 key={idx} className="text-[11px] font-black uppercase tracking-wider text-slate-800 mt-4 mb-2 border-b border-slate-100 pb-1 font-mono-tech">
              {trimmed.replace("###", "").trim()}
            </h4>
          );
        }
        if (trimmed.startsWith("##")) {
          return (
            <h3 key={idx} className="text-xs font-black text-slate-900 mt-5 mb-2 font-mono-tech">
              {trimmed.replace("##", "").trim()}
            </h3>
          );
        }
        if (trimmed.startsWith("#")) {
          return (
            <h2 key={idx} className="text-sm font-extrabold text-slate-900 mt-6 mb-3 font-mono-tech">
              {trimmed.replace("#", "").trim()}
            </h2>
          );
        }
        if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
          const content = trimmed.substring(1).trim();
          return (
            <div key={idx} className="flex gap-2 items-start pl-2">
              <span className="text-[#0EA5E9] font-extrabold shrink-0">•</span>
              <span className="flex-1">{parseInlineBold(content)}</span>
            </div>
          );
        }
        if (trimmed === "") {
          return <div key={idx} className="h-2" />;
        }
        return <p key={idx}>{parseInlineBold(trimmed)}</p>;
      })}
    </div>
  );
}

export const dynamic = "force-dynamic";

export default function CopilotPage() {
  const queryClient = useQueryClient();
  const { health, machines, twin, alerts } = useCoreFactoryData();
  
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [localLogs, setLocalLogs] = useState<{prompt: string, response?: string}[]>([]);

  // Fetch all sessions/conversations
  const conversations = useQuery({
    queryKey: ["copilotConversations"],
    queryFn: nextwinApi.copilotConversations,
    refetchInterval: 12_000,
  });

  // Fetch messages for active session
  const activeLogsQuery = useQuery({
    queryKey: ["copilotLogs", selectedConversationId],
    queryFn: () => selectedConversationId ? nextwinApi.copilotConversationLogs(selectedConversationId) : Promise.resolve([]),
    enabled: selectedConversationId !== null,
  });

  // Send message mutation
  const chat = useMutation({
    mutationFn: (payload: { text: string; conversationId?: number }) => 
      nextwinApi.askCopilot(payload.text, payload.conversationId || undefined),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["copilotConversations"] });
      if (selectedConversationId) {
        queryClient.invalidateQueries({ queryKey: ["copilotLogs", selectedConversationId] });
      } else {
        // Auto-select newly created conversation session
        setSelectedConversationId(data.conversation_id);
        setLocalLogs([]);
      }
    },
  });

  const summary = useMemo(() => ({
    machines: machines.data?.length || 0,
    states: twin.data?.length || 0,
    alerts: (alerts.data || []).filter((alert) => !alert.is_resolved).length,
    backend: health.data?.status || "Connecting",
  }), [machines.data, twin.data, alerts.data, health.data]);

  // If selecting a different conversation, clear local logs
  useEffect(() => {
    setLocalLogs([]);
  }, [selectedConversationId]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;

    if (!selectedConversationId) {
      setLocalLogs([{ prompt: text }]);
    }
    chat.mutate({ text, conversationId: selectedConversationId || undefined });
    setMessage("");
  }

  function runSuggested(queryText: string) {
    if (!selectedConversationId) {
      setLocalLogs([{ prompt: queryText }]);
    }
    chat.mutate({ text: queryText, conversationId: selectedConversationId || undefined });
  }

  const activeLogs = activeLogsQuery.data || [];
  const displayLogs = selectedConversationId ? activeLogs : localLogs;

  const activeSessionTitle = useMemo(() => {
    if (!selectedConversationId || !conversations.data) return "New Conversation Session";
    const session = conversations.data.find(c => c.id === selectedConversationId);
    return session ? session.title : "Active Conversation";
  }, [selectedConversationId, conversations.data]);

  return (
    <PageFrame title="AI Copilot" kicker="Cognitive Operating System">
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        
        {/* Left Column: Sessions sidebar, Context deck, Quick actions */}
        <aside className="flex flex-col gap-5">
          
          {/* Quick Stats Context Card */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Terminal className="h-4.5 w-4.5" />
              </span>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">COGNITIVE DECK</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Model Context</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold uppercase text-slate-500 font-mono-tech">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                <span className="block text-slate-400">Node Status:</span>
                <span className="block text-xs font-black text-slate-800 mt-1">{summary.backend}</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                <span className="block text-slate-400">Total Engines:</span>
                <span className="block text-xs font-black text-slate-800 mt-1">{summary.machines} Units</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                <span className="block text-slate-400">Twin Nodes:</span>
                <span className="block text-xs font-black text-slate-800 mt-1">{summary.states} Map</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                <span className="block text-slate-400">Active Alerts:</span>
                <span className="block text-xs font-black text-red-500 mt-1">{summary.alerts} Logs</span>
              </div>
            </div>
          </section>

          {/* Conversation Sessions List */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md flex flex-col min-h-[220px] max-h-[350px]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-blue-600" />
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">CHAT SESSIONS</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Conversations</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedConversationId(null)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 hover:bg-blue-100 transition-all"
              >
                <Plus className="h-3 w-3" />
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {conversations.isLoading && <LoadingBlock label="Fetching conversations..." />}
              {!conversations.isLoading && (
                <>
                  <button
                    onClick={() => setSelectedConversationId(null)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex gap-3 items-center ${
                      selectedConversationId === null
                        ? "bg-[#EAF6FF] border-[#0EA5E9]/30 text-slate-850 font-bold"
                        : "bg-white border-slate-100 hover:border-slate-200 text-slate-500"
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="text-[11px] truncate font-extrabold">New Conversation</span>
                  </button>
                  
                  {conversations.data?.map((conv) => {
                    const active = selectedConversationId === conv.id;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversationId(conv.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex gap-3 items-center ${
                          active
                            ? "bg-[#EAF6FF] border-[#0EA5E9]/30 text-slate-850 font-bold"
                            : "bg-white border-slate-100 hover:border-slate-200 text-slate-500"
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="text-[11px] truncate font-extrabold">{conv.title}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </section>

          {/* Quick AI Action suggestions */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">SUGGESTED DISPATCH QUERIES</span>
            <div className="mt-3.5 grid gap-2">
              {suggestionActions.map((act) => (
                <button
                  key={act.label}
                  disabled={chat.isPending}
                  onClick={() => runSuggested(act.query)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-150 bg-white text-left text-[9px] font-black uppercase tracking-wider text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                >
                  <span>{act.label}</span>
                  <Play className="h-3 w-3 fill-current text-blue-600" />
                </button>
              ))}
            </div>
          </section>

          {/* Live intelligence feed log console */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">OPERATIONS LOG AUDIT</span>
            <div className="mt-3.5 space-y-3 font-mono-tech text-[10px] max-h-[150px] overflow-y-auto pr-1">
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
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono-tech block">COG-COMM CHANNEL</span>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mt-0.5">{activeSessionTitle}</h2>
              </div>
            </div>
            <Clock className="h-4.5 w-4.5 text-slate-400" />
          </div>

          {/* Conversation history lists */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {selectedConversationId && activeLogsQuery.isLoading && <LoadingBlock label="Retrieving session logs..." />}
            {activeLogsQuery.error && <ErrorBlock error={activeLogsQuery.error} />}
            {chat.error && <ErrorBlock error={chat.error} />}

            {displayLogs.map((item: any, index) => (
              <div key={item.id || index} className="space-y-4">
                {item.prompt && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs font-semibold leading-relaxed text-slate-800 shadow-sm flex gap-3 items-start">
                      <MessageSquare className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{item.prompt}</span>
                    </div>
                  </div>
                )}
                {item.response && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl border border-slate-150 bg-white p-4 text-xs leading-relaxed text-slate-700 shadow-sm flex gap-3 items-start">
                      <Bot className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono-tech">AI Copilot Analysis</div>
                        <MarkdownRenderer text={item.response} />
                        
                        {item.sources && item.sources.length > 0 && (
                          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap gap-2.5">
                            {item.sources.map((src: any, srcIdx: number) => (
                              <span key={srcIdx} className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-50 border border-slate-150 text-slate-500 font-mono-tech">
                                <Cpu className="h-2.5 w-2.5 text-blue-500" />
                                {src.type === "agentic_tool" && `Tool: ${src.tool}`}
                                {src.type === "root_cause_analysis" && `Root Cause: ${src.machine_id}`}
                                {src.type === "database_query" && `DB: ${src.table}`}
                                {src.type === "factory_summary" && "Summary"}
                                {src.type === "greeting_intent" && "Intent"}
                              </span>
                            ))}
                          </div>
                        )}
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

            {!activeLogsQuery.isLoading && displayLogs.length === 0 && (
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
              placeholder="Query factory parameters (e.g. explain M_001 failure risk)" 
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium shadow-inner focus:border-[#0EA5E9]/40 focus:ring-0 focus:outline-none"
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
