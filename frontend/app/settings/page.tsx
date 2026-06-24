"use client";

import { useNotificationStore } from "../../store/use-notification-store";
import { soundSynthesizer } from "../../services/notification-sound";
import { PageFrame } from "../../components/nextwin-shell";
import { 
  Volume2, 
  VolumeX, 
  Volume1, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  Play, 
  Zap,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const {
    soundEnabled,
    soundVolume,
    soundMuted,
    setSoundEnabled,
    setSoundVolume,
    setSoundMuted,
    addToast
  } = useNotificationStore();

  const handleTestSound = (type: "critical" | "warning" | "success" | "maintenance" | "simulation" | "energy") => {
    // Play sound via Web Audio synthesizer
    soundSynthesizer.play(type, soundVolume, soundMuted || !soundEnabled);
    
    // Add toast to verify visual feedback
    const capitalNames = {
      critical: "Critical Alert Chime",
      warning: "Warning Notification",
      success: "Action Succeeded",
      maintenance: "Maintenance Triggered",
      simulation: "Simulation Finished",
      energy: "Energy Threshold Crossed"
    };

    addToast({
      title: "Audio Test Triggered",
      description: `Playing: ${capitalNames[type]}`,
      type: type === "critical" ? "critical" : type === "warning" ? "warning" : "success"
    });
  };

  const soundTestCards = [
    {
      id: "critical",
      title: "Critical Alert",
      description: "Alternating double-bell chime for machinery breakdown & severe failures",
      icon: ShieldAlert,
      color: "border-red-200 bg-red-50/20 text-red-650 hover:bg-red-50/50 hover:border-red-400"
    },
    {
      id: "warning",
      title: "Warning Tone",
      description: "Soft sliding sweep to flag system parameters deviating from tolerances",
      icon: AlertTriangle,
      color: "border-amber-200 bg-amber-50/20 text-amber-600 hover:bg-amber-50/50 hover:border-amber-400"
    },
    {
      id: "success",
      title: "Success Chime",
      description: "Ascending major triad chord for page actions, exports, and saves",
      icon: CheckCircle2,
      color: "border-emerald-200 bg-emerald-50/20 text-emerald-600 hover:bg-emerald-50/50 hover:border-emerald-400"
    },
    {
      id: "maintenance",
      title: "Maintenance Due",
      description: "Low-frequency double bell for routine maintenance intervals & checklists",
      icon: Wrench,
      color: "border-slate-200 bg-slate-50/20 text-slate-600 hover:bg-slate-50/50 hover:border-slate-400"
    },
    {
      id: "simulation",
      title: "Simulation Complete",
      description: "Sci-fi frequency drop indicating sandbox computational runs finished",
      icon: Play,
      color: "border-indigo-200 bg-indigo-50/20 text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-400"
    },
    {
      id: "energy",
      title: "Energy Threshold",
      description: "Mellow double resonance pulse signaling peak power grid threshold triggers",
      icon: Zap,
      color: "border-yellow-250 bg-yellow-50/20 text-yellow-600 hover:bg-yellow-50/50 hover:border-yellow-450"
    }
  ];

  return (
    <PageFrame
      title="OS Settings Console"
      kicker="Platform control parameters"
    >
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        
        {/* Left Column: Master Audio Controls */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00AEEF]/10 text-[#00AEEF]">
                <Activity className="h-4.5 w-4.5" />
              </span>
              <div>
                <span className="metric-label">AUDIO CHUTES</span>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Master Controls</h3>
              </div>
            </div>

            {/* Toggle: Sound Effects Enabled */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-700">Sound Effects</label>
                <p className="text-[10px] text-slate-455 mt-0.5 leading-normal">Toggle synthesizers globally</p>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  soundEnabled ? "bg-[#00AEEF]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    soundEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Volume Slider */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center text-xs font-black uppercase text-slate-700">
                <span className="flex items-center gap-1.5">
                  {soundMuted ? <VolumeX className="h-4 w-4 text-red-500" /> : 
                   soundVolume > 0.6 ? <Volume2 className="h-4 w-4 text-[#00AEEF]" /> :
                   <Volume1 className="h-4 w-4 text-[#00AEEF]" />}
                  Volume Level
                </span>
                <span className="font-mono-tech">{Math.round(soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                disabled={!soundEnabled}
                onChange={(e) => setSoundVolume(Number(e.target.value))}
                className="w-full accent-[#00AEEF] bg-slate-100 h-1.5 rounded-lg disabled:opacity-40"
              />
            </div>

            {/* Toggle: Mute */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-700">Mute Audio</label>
                <p className="text-[10px] text-slate-455 mt-0.5 leading-normal">Silences all interface events</p>
              </div>
              <button
                onClick={() => setSoundMuted(!soundMuted)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  soundMuted ? "bg-red-500" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    soundMuted ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Audio Tester Grid */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div>
              <span className="metric-label">SYNTHESIZED ALERTS</span>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Sound Board Testing</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Click any alarm below to synthesize its notification chime in real time using the browser's native Web Audio oscillators.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              {soundTestCards.map((card) => {
                const Icon = card.icon;
                return (
                  <motion.button
                    key={card.id}
                    onClick={() => handleTestSound(card.id as any)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${card.color}`}
                  >
                    <span className="p-2.5 rounded-xl border border-white/40 bg-white shrink-0 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider">{card.title}</div>
                      <div className="text-[10px] text-slate-500 mt-1.5 leading-normal">{card.description}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

      </div>
    </PageFrame>
  );
}
