"use client";

import Link from "next/link";
import { PageFrame } from "../../components/nextwin-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/data-states";
import { 
  useCoreFactoryData, 
  useRegisterMachine, 
  useUpdateMachine, 
  useDeleteMachine 
} from "../../hooks/use-nextwin";
import { motion } from "framer-motion";
import { 
  Cpu, 
  MapPin, 
  ChevronRight, 
  Activity, 
  Zap, 
  AlertTriangle, 
  Plus, 
  Pencil, 
  Trash2, 
  X 
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Machine } from "../../types/nextwin";

function statusColor(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("critical")) return "#EF4444";
  if (normalized.includes("warning")) return "#F59E0B";
  if (normalized.includes("maintenance")) return "#64748B";
  return "#10B981";
}

export default function MachinesCatalogPage() {
  const { machines, twin } = useCoreFactoryData();
  
  // Modals Open State
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  // Form States
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("M");
  const [newLocation, setNewLocation] = useState("");
  const [newStatus, setNewStatus] = useState("Active");

  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("M");
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState("Active");

  // Notifications State
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // API hooks
  const registerMachine = useRegisterMachine();
  const updateMachine = useUpdateMachine();
  const deleteMachine = useDeleteMachine();

  const loading = machines.isLoading || twin.isLoading;
  const machineTwinMap = useMemo(() => {
    if (!twin.data) return new Map();
    return new Map(twin.data.map((item) => [item.machine_id, item]));
  }, [twin.data]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newName.trim()) return;

    registerMachine.mutate({
      id: newId.trim(),
      name: newName.trim(),
      type: newType,
      location: newLocation.trim() || undefined,
      operational_status: newStatus
    }, {
      onSuccess: () => {
        setCreateOpen(false);
        setNewId("");
        setNewName("");
        setNewLocation("");
        setNotification({ type: "success", message: `Machine node ${newId} registered successfully!` });
        setTimeout(() => setNotification(null), 5000);
      },
      onError: (err: any) => {
        const msg = err.response?.data?.detail || "Failed to register machine asset.";
        setNotification({ type: "error", message: msg });
        setTimeout(() => setNotification(null), 5000);
      }
    });
  };

  const handleEditClick = (m: Machine) => {
    setSelectedMachine(m);
    setEditName(m.name);
    setEditType(m.type);
    setEditLocation(m.location || "");
    setEditStatus(m.operational_status || "Active");
    setEditOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine || !editName.trim()) return;

    updateMachine.mutate({
      machineId: selectedMachine.id,
      payload: {
        name: editName.trim(),
        type: editType,
        location: editLocation.trim() || undefined,
        operational_status: editStatus
      }
    }, {
      onSuccess: () => {
        setEditOpen(false);
        setNotification({ type: "success", message: `Machine node ${selectedMachine.id} updated successfully!` });
        setTimeout(() => setNotification(null), 5000);
      },
      onError: (err: any) => {
        const msg = err.response?.data?.detail || "Failed to update machine asset.";
        setNotification({ type: "error", message: msg });
        setTimeout(() => setNotification(null), 5000);
      }
    });
  };

  const handleDeleteClick = (m: Machine) => {
    setSelectedMachine(m);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedMachine) return;

    deleteMachine.mutate(selectedMachine.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setNotification({ type: "success", message: `Machine node ${selectedMachine.id} decommissioned successfully.` });
        setTimeout(() => setNotification(null), 5000);
      },
      onError: (err: any) => {
        const msg = err.response?.data?.detail || "Failed to decommission machine.";
        setNotification({ type: "error", message: msg });
        setTimeout(() => setNotification(null), 5000);
      }
    });
  };

  return (
    <PageFrame 
      title="Asset Catalog" 
      kicker="Platform Inventory"
      actions={
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[#0EA5E9] hover:bg-[#0284c7] px-4 py-2 text-xs font-bold text-white transition-all shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Machine</span>
        </button>
      }
    >
      {/* Toast notification panel */}
      {notification && (
        <div className={`mb-5 p-4 rounded-xl border text-xs font-bold shadow-sm ${
          notification.type === "success" 
            ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
            : "bg-red-50 border-red-100 text-red-700"
        }`}>
          {notification.message}
        </div>
      )}

      {loading && <LoadingBlock label="Retrieving registered factory assets..." />}
      {machines.error && <ErrorBlock error={machines.error} onRetry={() => machines.refetch()} />}
      {twin.error && <ErrorBlock error={twin.error} onRetry={() => twin.refetch()} />}

      {!loading && !machines.error && !twin.error && (
        <div className="grid gap-6">
          {/* Summary counters bar */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <CatalogTile label="Active Assets" value={machines.data?.length || 0} icon={Cpu} tone="blue" />
            <CatalogTile 
              label="Critical Alerts" 
              value={twin.data?.filter(t => t.status.toLowerCase().includes("critical")).length || 0} 
              icon={AlertTriangle} 
              tone="red" 
            />
            <CatalogTile 
              label="Maintenance Tasks" 
              value={twin.data?.filter(t => t.status.toLowerCase().includes("maintenance")).length || 0} 
              icon={Activity} 
              tone="slate" 
            />
            <CatalogTile 
              label="Nominal Units" 
              value={twin.data?.filter(t => t.status.toLowerCase().includes("healthy")).length || 0} 
              icon={ShieldCheck} 
              tone="green" 
            />
          </div>

          {/* Cards Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-2">
            {(machines.data || []).map((m) => {
              const twinState = machineTwinMap.get(m.id);
              const color = statusColor(twinState?.status);

              return (
                <motion.div
                  key={m.id}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Link 
                    href={`/machines/${m.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#0EA5E9]/25 hover:shadow-md transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="font-mono-tech text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.id}</span>
                        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mt-1">{m.name}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 border border-slate-100 rounded-full px-2.5 py-0.5 bg-slate-50">
                        <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                        <span className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color }}>
                          {twinState?.status || "Healthy"}
                        </span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="mt-4 flex flex-col gap-2 border-y border-slate-100 py-3 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-3.5 w-3.5 text-slate-400" />
                        <span>Type: <strong className="text-slate-800 uppercase font-mono-tech">{m.type}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>Location: <strong className="text-slate-800">{m.location || "Plant Floor"}</strong></span>
                      </div>
                    </div>

                    {/* Metrics preview */}
                    {twinState && (
                      <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2">
                          <span className="text-[8px] font-bold text-slate-450 uppercase tracking-wider block font-mono-tech">Health Index</span>
                          <span className="text-xs font-mono-tech font-black text-slate-800 mt-1 block">{twinState.health_score}%</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2">
                          <span className="text-[8px] font-bold text-slate-450 uppercase tracking-wider block font-mono-tech">Power Draw</span>
                          <span className="text-xs font-mono-tech font-black text-slate-800 mt-1 block">{twinState.energy_usage} kW</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2">
                          <span className="text-[8px] font-bold text-slate-450 uppercase tracking-wider block font-mono-tech">Anomaly Score</span>
                          <span className="text-xs font-mono-tech font-black text-red-600 mt-1 block">{twinState.anomaly_score}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2">
                          <span className="text-[8px] font-bold text-slate-455 uppercase tracking-wider block font-mono-tech">Failure Risk</span>
                          <span className="text-xs font-mono-tech font-black text-slate-800 mt-1 block">{Math.round(twinState.failure_probability * 100)}%</span>
                        </div>
                      </div>
                    )}

                    {/* Bottom Actions footer */}
                    <div className="mt-4 flex justify-between items-center border-t border-slate-100 pt-3">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.preventDefault(); handleEditClick(m); }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-[#0EA5E9] hover:text-[#0EA5E9] transition-all bg-white"
                          title="Edit Metadata"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); handleDeleteClick(m); }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-red-500 hover:text-red-500 transition-all bg-white"
                          title="Decommission Node"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#0EA5E9] font-mono-tech">
                        <span>Inspect Asset</span>
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>

                  </Link>
                </motion.div>
              );
            })}
          </div>

          {(machines.data || []).length === 0 && (
            <EmptyBlock 
              title="No assets registered" 
              body="The database currently lists zero monitored machine equipment nodes." 
            />
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Register Machinery Node</h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs font-semibold text-slate-600">
              <div>
                <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Machine Node ID</label>
                <input
                  type="text"
                  placeholder="e.g. M_006"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-mono-tech uppercase font-bold text-slate-850 focus:border-[#0EA5E9]"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Machine Name</label>
                <input
                  type="text"
                  placeholder="e.g. Conveyor Belt E"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-850 focus:border-[#0EA5E9]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grade Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 focus:border-[#0EA5E9]"
                  >
                    <option value="L">L (Low Grade)</option>
                    <option value="M">M (Medium Grade)</option>
                    <option value="H">H (High Grade)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Op Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 focus:border-[#0EA5E9]"
                  >
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Offline">Offline</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plant Location</label>
                <input
                  type="text"
                  placeholder="e.g. Bay D (Robotics)"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-850 focus:border-[#0EA5E9]"
                />
              </div>
              <button
                type="submit"
                disabled={registerMachine.isPending}
                className="w-full h-11 rounded-xl bg-[#0EA5E9] hover:bg-[#0284c7] text-white font-bold uppercase tracking-wider shadow-md transition disabled:opacity-50"
              >
                Create Machine Node
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Edit Machine details ({selectedMachine.id})</h3>
              <button onClick={() => setEditOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4 mt-4 text-xs font-semibold text-slate-600">
              <div>
                <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Machine Name</label>
                <input
                  type="text"
                  placeholder="e.g. CNC Mill B"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-850 focus:border-[#0EA5E9]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grade Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 focus:border-[#0EA5E9]"
                  >
                    <option value="L">L (Low Grade)</option>
                    <option value="M">M (Medium Grade)</option>
                    <option value="H">H (High Grade)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Op Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 focus:border-[#0EA5E9]"
                  >
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Offline">Offline</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plant Location</label>
                <input
                  type="text"
                  placeholder="e.g. Bay D"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-850 focus:border-[#0EA5E9]"
                />
              </div>
              <button
                type="submit"
                disabled={updateMachine.isPending}
                className="w-full h-11 rounded-xl bg-[#0EA5E9] hover:bg-[#0284c7] text-white font-bold uppercase tracking-wider shadow-md transition disabled:opacity-50"
              >
                Save Machine Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteOpen && selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto animate-bounce" />
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mt-4">Confirm Decommission</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to decommission and permanently delete the machinery asset node <strong className="text-slate-800">{selectedMachine.name} ({selectedMachine.id})</strong>? This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setDeleteOpen(false)}
                className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider transition shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteMachine.isPending}
                className="h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-[10px] tracking-wider transition shadow-sm disabled:opacity-50"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </PageFrame>
  );
}

function CatalogTile({ 
  label, 
  value, 
  icon: Icon, 
  tone 
}: { 
  label: string; 
  value: React.ReactNode; 
  icon: any; 
  tone: "blue" | "red" | "slate" | "green" 
}) {
  const styles = {
    blue: "text-[#0EA5E9] bg-blue-50 border-blue-100",
    red: "text-red-600 bg-red-50 border-red-100",
    slate: "text-slate-500 bg-slate-50 border-slate-100",
    green: "text-emerald-600 bg-emerald-50 border-emerald-100"
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
      <div>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono-tech">{label}</span>
        <span className="text-xl font-mono-tech font-extrabold text-slate-800 block mt-2">{value}</span>
      </div>
      <span className={`p-2.5 rounded-full border ${styles[tone]}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth="2" 
      stroke="currentColor" 
      className={props.className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  );
}
