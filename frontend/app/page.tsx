"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Factory,
  ArrowRight,
  Activity,
  Zap,
  Brain,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { useCoreFactoryData } from "../hooks/use-nextwin";
import { nextwinApi } from "../services/nextwin-api";
import { useMemo, useState } from "react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F8FBFF] text-slate-900 overflow-x-hidden selection:bg-[#0EA5E9]/10 selection:text-[#0EA5E9] relative">
      {/* Background gradients and technical grid pattern */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none light-industrial-mesh" />

      {/* Minimal Header (No nav menus, no buttons, clean branding only) */}
      <header className="relative z-20 mx-auto max-w-[1400px] px-6 pt-8 lg:px-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-md backdrop-blur-md">
            <Factory className="h-5 w-5 text-[#0EA5E9]" />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-900">
             NEXTWIN <span className="text-[#0EA5E9]">AI</span>
          </span>
        </div>
      </header>

      {/* Hero Section: 40/60 Split, 100vh height */}
      <section className="relative z-10 mx-auto max-w-[1400px] min-h-[calc(100vh-80px)] grid lg:grid-cols-[40%_60%] items-center gap-12 px-6 lg:px-16 py-12 lg:py-0">
        
        {/* Left Column - 40% Width Content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col justify-center gap-6"
        >
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 backdrop-blur-md shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-650">
              Industrial AI Platform
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-sm font-black uppercase tracking-[0.3em] text-[#0EA5E9]">
              NexTwin AI
            </h1>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl xl:text-6xl leading-[1.1]">
              Industrial Intelligence <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0EA5E9] via-[#06B6D4] to-slate-800">
                Beyond Monitoring
              </span>
            </h2>
            <p className="text-base text-slate-600 leading-relaxed max-w-lg">
              AI-Powered Digital Twin Platform for Predictive Manufacturing, Machine Health Monitoring, Energy Optimization, and Factory Intelligence.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/command-center"
              className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#0EA5E9] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#0EA5E9]/10 transition duration-300 hover:-translate-y-0.5 hover:bg-[#38BDF8]"
            >
              Launch Platform
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/digital-twin"
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-white px-8 py-4 text-sm font-bold text-slate-750 transition duration-300 hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5"
            >
              Explore Digital Twin
            </Link>
          </div>
        </motion.div>

        {/* Right Column - 60% Width Premium Image */}
        <div className="relative w-full flex items-center justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative w-full max-w-[560px] aspect-[4/3] sm:aspect-square lg:aspect-[4/3] xl:aspect-[1.1] z-10"
          >
            {/* Organic curved blob image container */}
            <div className="absolute inset-0 organic-blob glass-surface overflow-hidden p-3 shadow-2xl flex items-center justify-center">
              <img
                src="/hero-machine.png"
                alt="Industrial Machine"
                className="w-full h-full object-cover rounded-[inherit] transition-transform duration-700 hover:scale-102"
              />
            </div>
            
            {/* Elegant HUD float labels */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 rounded-2xl border border-slate-200/60 bg-white/90 px-4 py-3 backdrop-blur-md shadow-lg hidden sm:block"
            >
              <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-550">FACTORY GATEWAY</span>
              <span className="text-[11px] font-black uppercase text-emerald-600 flex items-center gap-1.5 mt-1 font-mono-tech">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SYSTEM ONLINE
              </span>
            </motion.div>
            
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-4 -left-4 rounded-2xl border border-slate-200/60 bg-white/90 px-4 py-3 backdrop-blur-md shadow-lg hidden sm:block"
            >
              <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-550">EDGE RUNTIMES</span>
              <span className="text-[11px] font-black text-slate-900 flex items-center gap-1.5 mt-1 font-mono-tech">
                100% OPERATIONAL
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Why NexTwin AI Section */}
      <section className="relative z-10 py-24 bg-[#EAF6FF]/30 border-t border-slate-150">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-16">
          <div className="mb-16 max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#0EA5E9]">Why NexTwin AI</span>
            <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              Next-Generation Industrial Intelligence
            </h2>
            <p className="mt-4 text-slate-600 text-sm leading-relaxed">
              Empowering manufacturing teams with live predictive diagnostics, spatial twin integrations, and multi-node optimization tools.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {/* Card 1 */}
            <motion.div
              whileHover={{ y: -5 }}
              className="rounded-3xl border border-slate-150 bg-white p-8 shadow-sm transition-all hover:border-[#0EA5E9]/20 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0EA5E9]/10 text-[#0EA5E9] mb-6">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Predictive Diagnostics</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Forecast component fatigue and mechanical failure risk up to 90 days in advance. Turn reactive maintenance into structured diagnostics.
              </p>
            </motion.div>
            
            {/* Card 2 */}
            <motion.div
              whileHover={{ y: -5 }}
              className="rounded-3xl border border-slate-150 bg-white p-8 shadow-sm transition-all hover:border-[#0EA5E9]/20 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#06B6D4]/10 text-[#06B6D4] mb-6">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Energy Optimization</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Analyze plant power draw and optimize machinery thermal efficiency under peak workload conditions, reducing waste margins.
              </p>
            </motion.div>
            
            {/* Card 3 */}
            <motion.div
              whileHover={{ y: -5 }}
              className="rounded-3xl border border-slate-150 bg-white p-8 shadow-sm transition-all hover:border-[#0EA5E9]/20 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0EA5E9]/10 text-[#0EA5E9] mb-6">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Machine Intelligence</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Bridge edge telemetry and predictive algorithms to discover bottleneck zones, generate incident audits, and run floor actions.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Digital Twin Preview Section */}
      <section className="relative z-10 py-24 bg-white/60 border-t border-b border-slate-100">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-16">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            
            {/* Text description */}
            <div className="space-y-6">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#0EA5E9]">Digital Twin Preview</span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                Real-Time Factory Pipeline Mapping
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Deploy full spatial layouts of your assembly lines and factory nodes. Our Digital Twin integrates directly with physical sensors on the plant floor, visualizing OEE factors, conveyor speeds, and mechanical failures.
              </p>
              <div className="pt-2">
                <Link
                  href="/digital-twin"
                  className="inline-flex items-center gap-2 rounded-full bg-[#0EA5E9] hover:bg-[#38BDF8] px-6 py-3 text-xs font-bold text-white transition duration-300 shadow-sm shadow-[#0EA5E9]/10"
                >
                  Explore Digital Twin
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
            
            {/* Visual Image Preview with Framer Motion Zoom */}
            <motion.div
              whileHover={{ scale: 1.015 }}
              transition={{ duration: 0.4 }}
              className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-xl"
            >
              <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-50">
                <img
                  src="/digital-twin-preview.png"
                  alt="Digital Twin Preview"
                  className="h-full w-full object-cover opacity-90 transition duration-500 hover:opacity-100"
                />
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Machine Showcase Section (GET /api/v1/machines) */}
      <MachineShowcaseSection />

      {/* AI Copilot Preview Section (POST /api/v1/copilot/chat) */}
      <AiCopilotPreviewSection />

      {/* Call to Action Section */}
      <section className="relative z-10 py-32 bg-white overflow-hidden border-t border-slate-150">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-[#0EA5E9]/5 blur-[150px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-16 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl mb-6">
            Ready to Transform Industrial Operations?
          </h2>
          <p className="text-slate-600 text-base max-w-xl mx-auto leading-relaxed mb-10">
            Deploy NexTwin's machine intelligence model to predict failures, balance power draws, and coordinate factory processes with confidence.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/command-center"
              className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#0EA5E9] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#0EA5E9]/10 transition duration-300 hover:-translate-y-0.5 hover:bg-[#38BDF8]"
            >
              Launch Platform
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/digital-twin"
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-white px-8 py-4 text-sm font-bold text-slate-700 shadow-sm transition duration-300 hover:border-slate-350 hover:bg-slate-50 hover:-translate-y-0.5"
            >
              View Digital Twin
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="relative z-10 bg-white border-t border-slate-150 py-12 text-slate-500 text-xs">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-16 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Factory className="h-4.5 w-4.5 text-[#0EA5E9]" />
            <span className="font-bold uppercase tracking-[0.2em] text-slate-900">
              NexTwin <span className="text-[#0EA5E9]">AI</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-slate-600">
            <Link href="/command-center" className="hover:text-[#0EA5E9] transition">Platform Dashboard</Link>
            <Link href="/digital-twin" className="hover:text-[#0EA5E9] transition">Digital Twin System</Link>
            <span className="text-slate-300">·</span>
            <span>Investor Deck</span>
            <span>Documentation</span>
          </div>
          <div>
            © {new Date().getFullYear()} NexTwin AI Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}

function MachineShowcaseSection() {
  const { machines, twin } = useCoreFactoryData();

  const machineTwinMap = useMemo(() => {
    if (!twin.data) return new Map<string, typeof twin.data[number]>();
    return new Map(twin.data.map((item) => [item.machine_id, item]));
  }, [twin.data]);

  const sampleMachines = useMemo(() => (machines.data || []).slice(0, 4), [machines.data]);

  return (
    <section className="relative z-10 py-24 bg-white/40">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-16">
        <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#0EA5E9]">Machine Showcase</span>
            <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              Real Backend Machinery Showcase
            </h2>
          </div>
          <Link
            href="/command-center"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0EA5E9] hover:text-[#38BDF8] transition"
          >
            Launch Platform Catalog
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {machines.isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-48 rounded-3xl bg-slate-100 border border-slate-200/60 animate-pulse" />
            ))}
          </div>
        )}

        {!machines.isLoading && sampleMachines.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
            No equipment telemetry reported in database. Run backend or edge simulation first.
          </div>
        )}

        {!machines.isLoading && sampleMachines.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {sampleMachines.map((machine) => {
              const state = machineTwinMap.get(machine.id);
              const status = state?.status || "Healthy";
              
              const statusStyles = status.toLowerCase().includes("critical")
                ? "text-red-650 bg-red-50 border-red-200"
                : status.toLowerCase().includes("warning")
                ? "text-amber-600 bg-amber-50 border-amber-200"
                : "text-emerald-600 bg-emerald-50 border-emerald-200";

              return (
                <Link
                  key={machine.id}
                  href={`/machines/${machine.id}`}
                  className="group relative block rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:border-[#0EA5E9]/25 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono-tech text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        {machine.id}
                      </span>
                      <h3 className="mt-2 text-base font-bold text-slate-900 group-hover:text-[#0EA5E9] transition">
                        {machine.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {machine.type} · {machine.location || "Plant Floor"}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusStyles}`}>
                      {status}
                    </span>
                  </div>
                  
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                      <span className="text-[9px] uppercase tracking-wider text-slate-455 block font-mono-tech font-bold">Health</span>
                      <span className="text-sm font-black text-slate-900 mt-1 block font-mono-tech">{state?.health_score ?? 100}%</span>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                      <span className="text-[9px] uppercase tracking-wider text-slate-455 block font-mono-tech font-bold">Fail Risk</span>
                      <span className="text-sm font-black text-slate-900 mt-1 block font-mono-tech">
                        {state?.failure_probability !== undefined ? Math.round(state.failure_probability * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center gap-1.5 text-[10px] font-bold text-[#0EA5E9] opacity-0 group-hover:opacity-100 transition tracking-wider uppercase font-mono-tech">
                    <span>Inspect Metrics</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function AiCopilotPreviewSection() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Hello! I am your factory intelligence copilot. Ask me questions about OEE index, machinery risks, energy optimization, or maintenance actions." }
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async (text: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setQuery("");

    try {
      const response = await nextwinApi.askCopilot(text);
      const reply = response?.response || response?.message || "Operational diagnostics successfully completed.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error communicating with the industrial model. Ensure backend service is running." }]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "What is the top failure risk in the line?",
    "Recommend preventive maintenance actions for CNC unit M_002.",
    "Summarize energy savings opportunity across the plant."
  ];

  return (
    <section className="relative z-10 py-24 bg-[#EAF6FF]/35 border-t border-b border-slate-150">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          
          {/* Information Column */}
          <div className="space-y-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#0EA5E9]">AI Copilot Preview</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              Operator-Assisted Intelligence
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              NexTwin AI Copilot parses streaming factory readings, active threshold alarms, and historical maintenance registries. Operators can query mechanical failure symptoms or request step-by-step diagnostic checks directly from the floor.
            </p>
            <div className="pt-4 space-y-3">
              <span className="text-[9px] uppercase tracking-wider text-slate-555 font-mono-tech block font-bold">Suggested Floor Queries:</span>
              <div className="flex flex-col gap-2">
                {sampleQuestions.map((q) => (
                  <button
                    key={q}
                    disabled={loading}
                    onClick={() => handleAsk(q)}
                    className="w-fit text-left text-xs text-[#0EA5E9] border border-[#0EA5E9]/15 bg-white hover:border-[#0EA5E9]/40 hover:bg-[#0EA5E9]/5 px-4 py-2.5 rounded-2xl transition duration-200 shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Copilot Panel */}
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xl flex flex-col h-[420px] relative z-10">
            <div className="border-b border-slate-150 bg-slate-55/45 px-6 py-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0EA5E9]/10 text-[#0EA5E9]">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Operational Copilot</h4>
                <span className="text-[8px] font-semibold uppercase tracking-widest text-[#0EA5E9]">Real-time Context Engine</span>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#0EA5E9] text-white font-semibold"
                      : "border border-slate-150 bg-white text-slate-700 shadow-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-slate-150 bg-white px-4 py-3 text-[10px] text-slate-400 font-mono-tech flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#0EA5E9] animate-ping" />
                    Querying factory layers...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk(query);
              }}
              className="border-t border-slate-150 p-3 bg-slate-50/30 flex gap-2"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask operational questions..."
                className="flex-1 h-10 border border-slate-200 bg-white rounded-xl px-3 text-xs text-slate-850 placeholder-slate-400 focus:border-[#0EA5E9]/40"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="h-10 px-4 bg-[#0EA5E9] hover:bg-[#38BDF8] disabled:opacity-40 disabled:hover:bg-[#0EA5E9] rounded-xl text-xs font-bold text-white transition"
              >
                Send
              </button>
            </form>
          </div>

        </div>
      </div>
    </section>
  );
}
