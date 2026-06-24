"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bot,
  Boxes,
  BrainCircuit,
  Command as CommandIcon,
  Factory,
  FileText,
  Gauge,
  Home,
  Menu,
  Network,
  Search,
  X,
  Zap,
  Cpu,
  Database,
  Send,
  MessageSquare,
  Sparkles,
  Play,
  Radio,
  Bell,
  Volume2,
  VolumeX,
  CheckCircle,
  Settings as SettingsIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useCoreFactoryData, queryKeys, useSimulations } from "../hooks/use-nextwin";
import { useInterfaceStore } from "../store/use-interface-store";
import { useNotificationStore } from "../store/use-notification-store";
import { soundSynthesizer } from "../services/notification-sound";
import { nextwinApi } from "../services/nextwin-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EmptyBlock, LoadingBlock } from "./data-states";
import type { Alert, Simulation } from "../types/nextwin";

export type NavItem = {
  label: string;
  href: string;
  icon: any;
  description: string;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home, description: "Live platform, machine, and alert status" },
  { label: "Digital Twin", href: "/digital-twin", icon: Factory, description: "Factory layout and machine state layer" },
  { label: "Machines", href: "/machines", icon: Boxes, description: "Monitored industrial asset cards" },
  { label: "Sensors", href: "/sensors", icon: Radio, description: "Physical sensor registrations and telemetry feeds" },
  { label: "Maintenance", href: "/predictive-maintenance", icon: BrainCircuit, description: "Health prediction and maintenance priority" },
  { label: "Anomaly", href: "/anomaly-center", icon: AlertTriangle, description: "Anomaly severity, history, and impact" },
  { label: "Simulation", href: "/simulation-center", icon: Play, description: "Scenario testing and failure simulations" },
  { label: "Reports", href: "/reports", icon: FileText, description: "Generated factory reports" },
  { label: "Settings", href: "/settings", icon: SettingsIcon, description: "Manage notification sounds, mute, and volumes" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppShell({ children, hideHeader = false }: { children: React.ReactNode; hideHeader?: boolean }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { setCommandOpen } = useInterfaceStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Core API Queries
  const { health, alerts, twin, machines } = useCoreFactoryData();
  const simulations = useSimulations();

  // Notification Store
  const {
    toasts,
    removeToast,
    notifications,
    addNotification,
    addToast,
    soundVolume,
    soundMuted,
    markAllAsRead,
    clearNotifications,
  } = useNotificationStore();

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Real-Time Alert & Simulation Observer
  const [seenAlertIds, setSeenAlertIds] = useState<Set<number>>(new Set());
  const [seenSimulations, setSeenSimulations] = useState<Map<number, boolean>>(new Map()); // id -> hasResults
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Observer Effect
  useEffect(() => {
    if (alerts.isLoading || simulations.isLoading) return;

    const currentAlerts = alerts.data || [];
    const currentSims = simulations.data || [];

    if (isInitialLoad) {
      // First run: silently catalog existing IDs
      const initialAlertSet = new Set(currentAlerts.map((a) => a.id));
      setSeenAlertIds(initialAlertSet);

      const initialSimMap = new Map(currentSims.map((s) => [s.id, Boolean(s.results)]));
      setSeenSimulations(initialSimMap);

      setIsInitialLoad(false);
      return;
    }

    // Check for new alerts
    let hasNewAlerts = false;
    currentAlerts.forEach((alert) => {
      if (!seenAlertIds.has(alert.id)) {
        setSeenAlertIds((prev) => {
          const next = new Set(prev);
          next.add(alert.id);
          return next;
        });

        if (!alert.is_resolved) {
          hasNewAlerts = true;

          // Determine severity & sound trigger
          const isCritical = alert.severity?.toLowerCase() === "critical";
          const isWarning = alert.severity?.toLowerCase() === "warning";
          const soundType = isCritical ? "critical" : isWarning ? "warning" : "success";
          const toastType = isCritical ? "critical" : isWarning ? "warning" : "info";

          // Play Audio chime
          soundSynthesizer.play(soundType, soundVolume, soundMuted);

          // Add Toast notification
          addToast({
            title: isCritical ? "Critical Alert Raised" : isWarning ? "Warning Incident" : "System Update",
            description: `${alert.machine_id}: ${alert.title}`,
            type: toastType,
          });

          // Add to Notification Dropdown List
          addNotification({
            id: `alert-${alert.id}`,
            title: alert.title,
            description: `${alert.machine_id} - ${alert.message}`,
            category: isCritical ? "critical" : isWarning ? "warning" : "system",
          });
        }
      }
    });

    // Check for simulation completion status shifts
    currentSims.forEach((sim) => {
      const prevCompletion = seenSimulations.get(sim.id);
      const currentCompletion = Boolean(sim.results);

      if (prevCompletion === undefined) {
        // New simulation registered
        setSeenSimulations((prev) => {
          const next = new Map(prev);
          next.set(sim.id, currentCompletion);
          return next;
        });

        if (currentCompletion) {
          soundSynthesizer.play("simulation", soundVolume, soundMuted);
          addToast({
            title: "Simulation Completed",
            description: `What-if scan "${sim.name}" finished executing.`,
            type: "success",
          });
          addNotification({
            id: `sim-${sim.id}`,
            title: `Simulation Finished`,
            description: `Scenario: ${sim.name}`,
            category: "simulation",
          });
        }
      } else if (!prevCompletion && currentCompletion) {
        // Shifted from running to completed!
        setSeenSimulations((prev) => {
          const next = new Map(prev);
          next.set(sim.id, true);
          return next;
        });

        soundSynthesizer.play("simulation", soundVolume, soundMuted);
        addToast({
          title: "Simulation Completed",
          description: `What-if scan "${sim.name}" finished executing.`,
          type: "success",
        });
        addNotification({
          id: `sim-${sim.id}`,
          title: `Simulation Completed`,
          description: `Scenario "${sim.name}" results compiled.`,
          category: "simulation",
        });
        hasNewAlerts = true; // triggers OEE/twin state invalidate
      }
    });

    // If new alerts/simulation updates occurred, invalidate other widgets
    if (hasNewAlerts) {
      queryClient.invalidateQueries({ queryKey: queryKeys.twin });
      queryClient.invalidateQueries({ queryKey: queryKeys.machines });
    }
  }, [alerts.data, simulations.data, isInitialLoad, soundVolume, soundMuted]);

  // Keyboard shortcut listener (Ctrl + K)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  return (
    <div className="min-h-screen bg-[#F7FBFF] text-slate-900 relative selection:bg-[#00AEEF]/10 selection:text-[#00AEEF]">
      {/* Light mesh gradient background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none light-industrial-mesh" />

      <div className="relative z-10 w-full min-h-screen flex flex-col">
        
        {/* Main Content Body (No top header, content fills space, with bottom dock space padding) */}
        <div className="w-full flex-1">
          {children}
        </div>

        {/* ONE SINGLE FLOATING BOTTOM NAVIGATION DOCK - Positioned at bottom: 24px, left: 50% */}
        {!hideHeader && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] max-w-[95vw] w-fit">
            
            {/* Desktop Dock View */}
            <div className="hidden lg:flex h-[58px] items-center gap-1.5 rounded-full border border-white/60 bg-white/40 px-5 shadow-2xl backdrop-blur-2xl glass-nav-container">
              
              {/* Navigation Items (Single horizontal line, mixed case, no wrapping) */}
              <div className="flex items-center gap-1">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cx(
                        "relative rounded-full px-3.5 py-1.5 text-[10.5px] font-bold tracking-tight transition-all duration-250 flex items-center gap-1.5 select-none",
                        active 
                          ? "text-[#00AEEF] font-black scale-105 shadow-[0_0_16px_rgba(0,174,239,0.18)]" 
                          : "text-slate-655 hover:text-slate-950 hover:-translate-y-0.5 hover:scale-102 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)] hover:border-[#38BDF8]/20"
                      )}
                    >
                      {active && (
                        <>
                          {/* Glow background */}
                          <motion.div
                            layoutId="active-pill-glow"
                            className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00AEEF]/10 to-[#38BDF8]/10 border border-[#00AEEF]/20 shadow-[0_0_12px_rgba(0,174,239,0.15)] pointer-events-none"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                          {/* Underline */}
                          <motion.div
                            layoutId="active-pill-line"
                            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-gradient-to-r from-[#00AEEF] to-[#38BDF8]"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        </>
                      )}
                      <item.icon className={cx("h-3.5 w-3.5 relative z-10", active ? "text-[#00AEEF]" : "text-slate-500")} />
                      <span className="relative z-10">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Vertical Glass Divider */}
              <div className="h-6 w-[1.5px] bg-slate-900/10 mx-1.5" />

              {/* Action items inside same container */}
              <div className="flex items-center gap-2 relative">
                
                {/* Universal Search Button */}
                <button
                  onClick={() => setCommandOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-900/5 hover:-translate-y-0.5 hover:scale-105 text-slate-500 hover:text-[#00AEEF] transition duration-200"
                  aria-label="Universal Search"
                >
                  <Search className="h-4.5 w-4.5 text-[#00AEEF]" />
                </button>

                {/* Notifications Bell (Pops UP directly above the dock) */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotificationPanelOpen(!notificationPanelOpen);
                      setProfileMenuOpen(false);
                      if (!notificationPanelOpen) {
                        markAllAsRead();
                      }
                    }}
                    className={cx(
                      "flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-900/5 hover:-translate-y-0.5 hover:scale-105 text-slate-500 hover:text-[#00AEEF] transition duration-200",
                      notificationPanelOpen && "text-[#00AEEF] bg-[#00AEEF]/5"
                    )}
                    aria-label="Notifications Dropdown"
                  >
                    <Bell className="h-4.5 w-4.5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[7px] font-black text-white ring-2 ring-white animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notificationPanelOpen && (
                      <NotificationDropdown 
                        notifications={notifications} 
                        clear={clearNotifications}
                        onClose={() => setNotificationPanelOpen(false)} 
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile Avatar (Pops UP directly above the dock) */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(!profileMenuOpen);
                      setNotificationPanelOpen(false);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border border-slate-200/60 bg-white/70 hover:border-[#00AEEF]/40 hover:-translate-y-0.5 hover:scale-105 transition duration-200 shadow-sm"
                    aria-label="Profile Options"
                  >
                    <div className="h-full w-full bg-gradient-to-tr from-[#00AEEF] to-[#60A5FA] flex items-center justify-center text-white text-[9px] font-black uppercase tracking-wider font-mono-tech">
                      OP
                    </div>
                  </button>

                  <AnimatePresence>
                    {profileMenuOpen && (
                      <ProfileDropdown onClose={() => setProfileMenuOpen(false)} />
                    )}
                  </AnimatePresence>
                </div>

              </div>

            </div>

            {/* Compact Mobile Dock View */}
            <div className="lg:hidden flex h-[48px] items-center justify-between gap-6 rounded-full border border-white/60 bg-white/40 px-4 shadow-xl backdrop-blur-2xl glass-nav-container w-[310px]">
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <Factory className="h-4 w-4 text-[#00AEEF]" />
                <span className="text-[9px] font-black uppercase tracking-wider font-mono-tech">NEXTWIN</span>
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCommandOpen(true)}
                  className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-slate-900/5 text-[#00AEEF]"
                >
                  <Search className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setMobileOpen(true)}
                  className="h-7 w-7 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-855"
                  aria-label="Open mobile navigation"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Global Overlays */}
        <CommandPalette />
        <MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <ToastOverlay toasts={toasts} removeToast={removeToast} />

        {/* Floating AI Copilot Assistant */}
        <FloatingCopilot />
      </div>
    </div>
  );
}

/* ========================================================
   GLOBAL TOAST NOTIFICATIONS OVERLAY
   ======================================================== */
function ToastOverlay({ toasts, removeToast }: { toasts: any[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const typeColors = {
            critical: "border-red-200 bg-red-50/95 text-red-805",
            warning: "border-amber-200 bg-amber-50/95 text-amber-805",
            success: "border-emerald-200 bg-emerald-50/95 text-emerald-805",
            info: "border-blue-200 bg-blue-50/95 text-blue-805",
          };
          const emoji = {
            critical: "🚨",
            warning: "⚠️",
            success: "✅",
            info: "🔔",
          };

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              className={cx(
                "pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md glass-toast",
                typeColors[t.type as keyof typeof typeColors] || typeColors.info
              )}
            >
              <span className="text-sm shrink-0">{emoji[t.type as keyof typeof emoji] || "🔔"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider">{t.title}</div>
                <div className="text-[11px] font-semibold opacity-90 mt-0.5 leading-normal truncate">{t.description}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-450 hover:text-slate-700 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================
   SLIDE-UP NOTIFICATIONS DROPDOWN PANEL (Pops UP above bottom dock)
   ======================================================== */
function NotificationDropdown({
  notifications,
  clear,
  onClose,
}: {
  notifications: any[];
  clear: () => void;
  onClose: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Group notifications into requested sections
  const grouped = useMemo(() => {
    return {
      critical: notifications.filter((n) => n.category === "critical"),
      warning: notifications.filter((n) => n.category === "warning"),
      maintenance: notifications.filter((n) => n.category === "maintenance"),
      simulation: notifications.filter((n) => n.category === "simulation"),
      system: notifications.filter((n) => n.category === "system"),
      prediction: notifications.filter((n) => n.category === "prediction"),
    };
  }, [notifications]);

  const hasAny = notifications.length > 0;

  return (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute right-0 bottom-full mb-4 w-88 max-w-[calc(100vw-2rem)] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl glass-dropdown-panel z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Notification Feed</h4>
        {hasAny && (
          <button
            onClick={clear}
            className="text-[9px] font-bold uppercase tracking-wider text-[#00AEEF] hover:text-[#38BDF8]"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
        {hasAny ? (
          Object.keys(grouped).map((cat) => {
            const list = grouped[cat as keyof typeof grouped] || [];
            if (list.length === 0) return null;

            const categoryHeaders = {
              critical: "🚨 Critical Alerts",
              warning: "⚠️ Warnings",
              maintenance: "🔧 Maintenance Events",
              simulation: "📊 Simulation Results",
              system: "⚙️ System Events",
              prediction: "🧠 Prediction Events",
            };

            return (
              <div key={cat} className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono-tech block">
                  {categoryHeaders[cat as keyof typeof categoryHeaders]}
                </span>
                <div className="space-y-1.5">
                  {list.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs text-slate-700 hover:bg-slate-50 transition"
                    >
                      <div className="font-extrabold text-slate-900">{item.title}</div>
                      <div className="text-[10px] text-slate-505 mt-0.5 leading-normal">{item.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-slate-400 font-bold uppercase tracking-wider text-[10px] font-mono-tech">
            🟢 No Active Notifications
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ========================================================
   PROFILE DROPDOWN MENU (Pops UP above bottom dock)
   ======================================================== */
function ProfileDropdown({ onClose }: { onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute right-0 bottom-full mb-4 w-48 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl glass-dropdown-panel z-50 text-xs font-semibold text-slate-700"
    >
      <div className="px-2 py-1.5 border-b border-slate-100 mb-1.5">
        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Operator Profile</span>
        <span className="block font-extrabold text-slate-800 mt-0.5 truncate">sys_operator_1</span>
      </div>
      
      <button
        onClick={() => { router.push("/profile"); onClose(); }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50 text-left transition"
      >
        <span>Profile</span>
      </button>
      <button
        onClick={() => { router.push("/settings"); onClose(); }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50 text-left transition"
      >
        <span>Preferences</span>
      </button>
      <button
        onClick={() => { router.push("/settings"); onClose(); }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50 text-left transition"
      >
        <span>Theme (Light)</span>
      </button>
      <button
        onClick={() => { router.push("/settings"); onClose(); }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50 text-left transition"
      >
        <span>Settings</span>
      </button>
      
      <div className="h-[1px] bg-slate-100 my-1" />

      <button
        onClick={() => { router.push("/"); onClose(); }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50 text-left text-red-500 transition"
      >
        <span>Logout</span>
      </button>
    </motion.div>
  );
}

/* ========================================================
   UNIVERSAL SEARCH COMMAND PALETTE (CTRL+K)
   ======================================================== */
function CommandPalette() {
  const router = useRouter();
  const { commandOpen, setCommandOpen } = useInterfaceStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Core API Queries
  const { health, alerts, twin, machines } = useCoreFactoryData();
  const simulations = useSimulations();

  // Combine items to search across
  const searchItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      category: string;
      href: string;
      icon: any;
    }> = [];

    // Pages
    navItems.forEach((n) => {
      items.push({
        id: `page-${n.href}`,
        title: n.label,
        description: n.description || `Navigate to ${n.label}`,
        category: "Navigation Center",
        href: n.href,
        icon: n.icon || CommandIcon,
      });
    });

    // Extra Hidden Pages
    items.push({
      id: "page-forecasting",
      title: "Forecasting Center",
      description: "90D failure, throughput, and energy predictions",
      category: "Navigation Center",
      href: "/forecasting",
      icon: Gauge,
    });
    items.push({
      id: "page-energy",
      title: "Energy Intelligence",
      description: "Plant thermal optimization metrics",
      category: "Navigation Center",
      href: "/energy-intelligence",
      icon: Zap,
    });
    items.push({
      id: "page-bottlenecks",
      title: "Bottleneck Center",
      description: "Buffer queues delay optimization layout",
      category: "Navigation Center",
      href: "/bottleneck-center",
      icon: Network,
    });
    items.push({
      id: "page-models",
      title: "ML Model Status",
      description: "Registry and training dates of inference systems",
      category: "Navigation Center",
      href: "/model-status",
      icon: Cpu,
    });

    // Machines
    if (machines.data) {
      machines.data.forEach((m) => {
        items.push({
          id: `machine-${m.id}`,
          title: m.name,
          description: `Machine Asset · Type: ${m.type} · Location: ${m.location || "Floor"}`,
          category: "Machines Inventory",
          href: `/machines/${m.id}`,
          icon: Boxes,
        });
      });
    }

    // Digital Twin Nodes
    if (twin.data) {
      twin.data.forEach((t) => {
        items.push({
          id: `twin-${t.machine_id}`,
          title: `Digital Twin: ${t.machine_id}`,
          description: `OEE Health Score: ${t.health_score}% · Risk: ${Math.round(t.failure_probability * 100)}%`,
          category: "Digital Twin Nodes",
          href: `/machines/${t.machine_id}`,
          icon: Factory,
        });
      });
    }

    // Alerts
    if (alerts.data) {
      alerts.data.forEach((a) => {
        items.push({
          id: `alert-${a.id}`,
          title: a.title,
          description: `${a.severity.toUpperCase()} Alert: ${a.message} (${a.machine_id})`,
          category: "Incidents & Alerts",
          href: "/alerts",
          icon: AlertTriangle,
        });
      });
    }

    // Simulations
    if (simulations.data) {
      simulations.data.forEach((s) => {
        items.push({
          id: `sim-${s.id}`,
          title: s.name,
          description: s.description || "What-if simulation record",
          category: "Simulations Catalog",
          href: "/simulation-center",
          icon: Play,
        });
      });
    }

    return items;
  }, [machines.data, twin.data, alerts.data, simulations.data]);

  // Fuzzy match filter
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchItems.slice(0, 10); // show top 10 items default

    return searchItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query, searchItems]);

  // Reset highlighted item when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Command palette navigation
  function go(href: string) {
    setCommandOpen(false);
    setQuery("");
    router.push(href);
  }

  // Keyboard navigation
  useEffect(() => {
    if (!commandOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredResults.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          go(filteredResults[selectedIndex].href);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setCommandOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandOpen, filteredResults, selectedIndex]);

  return (
    <AnimatePresence>
      {commandOpen && (
        <motion.div
          className="fixed inset-0 z-[80] bg-slate-900/10 p-4 backdrop-blur-md flex items-start justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={() => setCommandOpen(false)}
        >
          <motion.div
            className="mt-24 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl backdrop-blur-xl glass-dropdown-panel"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.97 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* Input bar */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <Search className="h-5 w-5 text-[#00AEEF]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search machines, anomalies, simulations, reports, pages..."
                className="h-10 flex-1 border-0 bg-transparent text-sm text-slate-800 placeholder-slate-400 shadow-none focus:shadow-none focus:ring-0 focus:border-0"
              />
              <span className="hidden sm:inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-400 font-mono-tech uppercase">
                ESC
              </span>
              <button
                className="p-1 rounded-full border border-slate-200 bg-slate-50 text-slate-450 hover:text-slate-800"
                onClick={() => setCommandOpen(false)}
                aria-label="Close command palette"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[380px] overflow-y-auto p-2.5 space-y-1">
              {filteredResults.map((item, idx) => {
                const highlighted = idx === selectedIndex;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    className={cx(
                      "flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition duration-150",
                      highlighted
                        ? "bg-[#00AEEF]/8 border border-[#00AEEF]/20 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                        : "hover:bg-slate-50 border border-transparent text-slate-700"
                    )}
                    onClick={() => go(item.href)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span
                      className={cx(
                        "flex h-8.5 w-8.5 items-center justify-center rounded-xl transition",
                        highlighted ? "bg-[#00AEEF] text-white" : "bg-[#00AEEF]/10 text-[#00AEEF]"
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="block text-xs font-extrabold uppercase tracking-wide">
                          {item.title}
                        </span>
                        <span className="text-[8px] font-mono-tech font-bold uppercase tracking-wider text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                          {item.category}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-slate-505 mt-1 leading-none">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}

              {filteredResults.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 font-bold uppercase tracking-wider font-mono-tech">
                  No records matched your search.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ========================================================
   MOBILE ACCORDION DRAWER OVERLAY
   ======================================================== */
function MobileNavigation({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] bg-slate-900/10 p-3 backdrop-blur-md lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="ml-auto h-full max-w-xs overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl glass-dropdown-panel"
            initial={{ x: 50 }}
            animate={{ x: 0 }}
            exit={{ x: 50 }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="text-xs font-black text-slate-900 uppercase tracking-widest">NEXTWIN AI OS</div>
              <button
                className="p-1 rounded-full border border-slate-200 bg-slate-50 text-slate-450 hover:text-slate-800"
                onClick={onClose}
                aria-label="Close navigation"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cx(
                      "flex items-center gap-3.5 rounded-2xl border p-3.5 transition",
                      active
                        ? "bg-[#00AEEF]/5 border-[#00AEEF]/25 text-[#00AEEF] font-extrabold"
                        : "border-slate-100/50 bg-slate-50/50 hover:bg-slate-100 text-slate-655"
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-8 w-8 items-center justify-center rounded-xl",
                        active ? "bg-[#00AEEF] text-white" : "bg-[#00AEEF]/10 text-[#00AEEF]"
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span>
                      <span className="block text-xs font-extrabold uppercase tracking-wide">
                        {item.label}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ========================================================
   UPGRADED MICROSOFT COPILOT-STYLE FLOATING ASSISTANT
   ======================================================== */
const defaultCopilotPrompts = {
  "/": [
    "Check factory safety indicators",
    "Find CnC unit failure rates",
    "List anomaly events raised today",
  ],
  "/dashboard": [
    "Explain OEE drops below 90%",
    "Suggest preventive maintenance priority",
    "Analyze plant power grids",
  ],
  "/digital-twin": [
    "Identify conveyor bottleneck nodes",
    "Which machine status is Critical?",
    "Summarize M_004 sensory deflection",
  ],
  "/predictive-maintenance": [
    "Fatigue breakdown projections",
    "Explain RUL contributing factors",
    "List CNC spindle maintenance tasks",
  ],
  "/anomaly-center": [
    "What algorithms run deflection audits?",
    "List critical anomalies in Bay D",
    "Run sensor deflection scan",
  ],
};

function FloatingCopilot() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Core Data
  const { health, machines, twin, alerts } = useCoreFactoryData();
  const simulations = useSimulations();

  const history = useQuery({
    queryKey: queryKeys.copilotHistory,
    queryFn: nextwinApi.copilotHistory,
    enabled: open,
    refetchInterval: 30_000,
  });

  const chat = useMutation({
    mutationFn: (text: string) => nextwinApi.askCopilot(text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.copilotHistory });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
  });

  // Calculate current context payload values
  const summary = useMemo(() => {
    return {
      machines: machines.data?.length || 0,
      states: twin.data?.length || 0,
      alerts: (alerts.data || []).filter((a) => !a.is_resolved).length,
      status: health.data?.status || "Live",
    };
  }, [machines.data, twin.data, alerts.data, health.data]);

  // Context-aware dynamic greeting questions
  const pagePrompts = useMemo(() => {
    const pathKey = pathname as keyof typeof defaultCopilotPrompts;
    return defaultCopilotPrompts[pathKey] || defaultCopilotPrompts["/"];
  }, [pathname]);

  // Prepend hidden context tags before dispatching askCopilot REST call
  function handleAsk(promptText: string) {
    if (chat.isPending || !promptText.trim()) return;

    const criticalList = (alerts.data || [])
      .filter((a) => !a.is_resolved && a.severity?.toLowerCase() === "critical")
      .map((a) => `${a.machine_id}: ${a.title}`)
      .join(", ");

    const systemOee = twin.data
      ? Math.round(twin.data.reduce((sum, m) => sum + m.health_score, 0) / twin.data.length)
      : 98;

    const contextTag = `[SYSTEM CONTEXT: User route is "${pathname}". OEE Health: ${systemOee}%. Critical Alarms: ${criticalList || "None"}. Online Nodes: ${summary.machines}]. `;
    
    chat.mutate(contextTag + promptText);
    setMessage("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    handleAsk(message);
  }

  // Filter out system context strings from the chat list UI
  const displayHistory = useMemo(() => {
    return (history.data || []).map((item) => {
      const rawPrompt = item.prompt || item.message || "";
      const cleanedPrompt = rawPrompt.replace(/^\[SYSTEM CONTEXT:[\s\S]*?\]\. /, "");
      return {
        ...item,
        displayPrompt: cleanedPrompt,
        displayResponse: item.response || "",
      };
    });
  }, [history.data]);

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "instant" }), 150);
    }
  }, [open, history.data]);

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="mb-4 w-96 max-w-[calc(100vw-2rem)] h-[540px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden glass-copilot-container"
          >
            {/* Header */}
            <div className="border-b border-slate-100/60 bg-white/40 p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8.5 w-8.5 items-center justify-center rounded-2xl bg-[#00AEEF]/10 text-[#00AEEF] relative">
                  <Bot className="h-4.5 w-4.5" />
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-white animate-pulse" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">NexTwin AI Copilot</h4>
                  <div className="text-[8px] font-bold uppercase tracking-wider text-[#00AEEF] font-mono-tech mt-0.5">
                    Operational Intelligence
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-full border border-slate-200 bg-white/60 text-slate-450 hover:text-slate-800"
                aria-label="Close assistant panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Context Widget Indicators */}
            <div className="grid grid-cols-3 border-b border-slate-100/40 bg-slate-50/20 p-2.5 text-[9px] font-bold text-slate-500 text-center font-mono-tech">
              <div>
                <span>Machines: </span>
                <strong className="text-slate-800">{summary.machines}</strong>
              </div>
              <div className="border-x border-slate-150">
                <span>Active Alerts: </span>
                <strong className={summary.alerts > 0 ? "text-red-500 font-black animate-pulse" : "text-slate-855"}>
                  {summary.alerts}
                </strong>
              </div>
              <div>
                <span>Link Health: </span>
                <strong className="text-emerald-600">{summary.status}</strong>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4.5 space-y-4 bg-slate-50/10">
              {history.isLoading && <LoadingBlock label="Calling database logs..." />}

              {!history.isLoading && displayHistory.length === 0 && (
                <div className="space-y-4 py-2">
                  <div className="rounded-2xl border border-[#00AEEF]/20 bg-white/80 p-5 text-center shadow-sm">
                    <Sparkles className="h-6.5 w-6.5 text-[#00AEEF] mx-auto animate-pulse" />
                    <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-wider mt-3">
                      Industrial Copilot
                    </h5>
                    <p className="text-[10px] text-slate-505 mt-2 leading-relaxed">
                      Aware of the active page <strong>{pathname}</strong>, active alerts, and factory inventory nodes.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block font-mono-tech">
                      Suggested page questions:
                    </span>
                    {pagePrompts.map((p) => (
                      <button
                        key={p}
                        onClick={() => handleAsk(p)}
                        disabled={chat.isPending}
                        className="w-full text-left rounded-xl border border-slate-200/80 bg-white hover:border-[#00AEEF]/40 hover:bg-[#00AEEF]/5 px-3.5 py-2.5 text-[11px] font-semibold text-slate-700 transition shadow-sm"
                      >
                        ⚡ {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!history.isLoading &&
                displayHistory.map((item, idx) => (
                  <div key={idx} className="space-y-3.5">
                    {item.displayPrompt && (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl border border-[#00AEEF]/10 bg-[#00AEEF]/5 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-slate-800 shadow-sm flex gap-2.5 items-start">
                          <MessageSquare className="h-4 w-4 text-[#00AEEF] shrink-0 mt-0.5" />
                          <span>{item.displayPrompt}</span>
                        </div>
                      </div>
                    )}
                    {item.displayResponse && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl border border-slate-150 bg-white px-3.5 py-2.5 text-xs font-medium leading-relaxed text-slate-700 shadow-sm flex gap-2.5 items-start">
                          <Bot className="h-4 w-4 text-[#00AEEF] shrink-0 mt-0.5" />
                          <span className="whitespace-pre-line">{item.displayResponse}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              {chat.isPending && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl border border-slate-150 bg-white px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono-tech shadow-sm flex gap-2 items-center">
                    <span className="h-2 w-2 rounded-full bg-[#00AEEF] animate-ping" />
                    <span>Resolving payload...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {displayHistory.length > 0 && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/40 flex gap-1.5 overflow-x-auto select-none no-scrollbar">
                {pagePrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleAsk(p)}
                    disabled={chat.isPending}
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-bold text-slate-655 hover:border-[#00AEEF]/40 hover:text-[#00AEEF] transition"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Text Input */}
            <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-3 bg-white">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask manufacturing specs..."
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-800 focus:border-[#00AEEF]/40"
              />
              <button
                disabled={chat.isPending || !message.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#00AEEF] hover:bg-[#38BDF8] text-white shadow-sm disabled:opacity-40 transition"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assistant Bubble Trigger */}
      <div className="flex items-center gap-2">
        <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-md text-[9px] font-black text-[#00AEEF] uppercase tracking-wider animate-pulse select-none pointer-events-none">
          Industrial AI OS Active
        </span>
        <button
          onClick={() => setOpen(!open)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00AEEF] hover:bg-[#38BDF8] text-white shadow-lg transition-transform active:scale-95 hover:scale-105"
          aria-label="Toggle copilot panel"
        >
          {open ? <X className="h-5.5 w-5.5" /> : <Bot className="h-5.5 w-5.5" />}
        </button>
      </div>
    </div>
  );
}

/* ========================================================
   PAGE FRAME WRAPPER (pt-8 top, pb-32 bottom to avoid Dock)
   ======================================================== */
export function PageFrame({
  title,
  kicker,
  children,
  actions,
}: {
  title: string;
  kicker: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-32 sm:px-6 relative z-10">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="metric-label text-[#00AEEF] font-bold">{kicker}</div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 uppercase">
              {title}
            </h1>
          </div>
          {actions}
        </div>
        {children}
      </main>
    </AppShell>
  );
}
