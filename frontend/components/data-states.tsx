"use client";

import { RefreshCcw } from "lucide-react";
import { getApiError } from "../services/nextwin-api";

export function LoadingBlock({ label = "Loading live factory data" }: { label?: string }) {
  return (
    <div className="premium-card flex min-h-40 items-center justify-center p-6 text-center">
      <div>
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="mt-3 text-sm font-semibold text-textSecondary">{label}</p>
      </div>
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="premium-card border-red-100 bg-red-50 p-5">
      <div className="text-sm font-bold text-critical">Backend request failed</div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{getApiError(error)}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-md bg-critical px-3 py-2 text-xs font-bold text-white">
          <RefreshCcw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="premium-card p-6 text-center">
      <div className="text-sm font-bold">{title}</div>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-textSecondary">{body}</p>
    </div>
  );
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="text-[11px] font-bold uppercase text-textSecondary">{label}</div>
      <div className="mt-2 text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}

export function StatusPill({ status }: { status?: string }) {
  const normalized = (status || "").toLowerCase();
  const color = normalized.includes("critical")
    ? "border-red-100 bg-red-50 text-critical"
    : normalized.includes("warning")
      ? "border-amber-100 bg-amber-50 text-warning"
      : normalized.includes("maintenance")
        ? "border-slate-200 bg-slate-100 text-slate-700"
        : "border-emerald-100 bg-emerald-50 text-success";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${color}`}>{status || "Unknown"}</span>;
}

export function MiniLine({ values, tone = "blue" }: { values: number[]; tone?: "blue" | "green" | "amber" | "red" }) {
  if (!values.length) return <div className="h-20 rounded-md border border-dashed border-border" />;
  const width = 360;
  const height = 96;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / spread) * (height - 16) - 8;
    return `${x},${y}`;
  }).join(" ");
  const stroke = tone === "green" ? "#10B981" : tone === "amber" ? "#F59E0B" : tone === "red" ? "#EF4444" : "#2563EB";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full overflow-visible">
      <polyline fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" points={points} />
    </svg>
  );
}
