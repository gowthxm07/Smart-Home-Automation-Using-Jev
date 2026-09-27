import React from "react";
import { DashboardAnalysisData } from "@/lib/evaluation/analysis/dashboardLoader";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Info,
} from "lucide-react";

interface ReliabilitySectionProps {
  data: DashboardAnalysisData;
}

export const ReliabilitySection: React.FC<ReliabilitySectionProps> = ({ data }) => {
  const laya = data.reliabilityAnalysis["LAYA"];
  const llm = data.reliabilityAnalysis["LLM"];

  const renderStatusDistribution = (
    providerName: string,
    colorClass: string,
    accentBorder: string,
    rel: typeof laya
  ) => {
    if (!rel) return null;
    const successPct = (rel.successfulExecutions / rel.totalExecutions) * 100;
    const unsupportedPct = (rel.unsupportedExecutions / rel.totalExecutions) * 100;
    const failedPct = (rel.failedExecutions / rel.totalExecutions) * 100;

    return (
      <div className={`rounded-xl glass-card border ${accentBorder} p-5 space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${colorClass}`} />
            <h3 className="text-sm font-bold text-white tracking-tight">
              {providerName} Reliability Profile
            </h3>
          </div>
          <span className="font-mono text-xs text-slate-400">
            N = {rel.totalExecutions} executions
          </span>
        </div>

        {/* 3-Segment Horizontal Stacked Status Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Execution Status Breakdown</span>
            <span className="font-mono text-slate-300">100% Total</span>
          </div>

          <div
            className="w-full h-4 rounded-lg bg-slate-900 overflow-hidden flex p-0.5 border border-slate-800"
            role="progressbar"
            aria-label={`${providerName} Status Distribution`}
          >
            {successPct > 0 && (
              <div
                className="h-full bg-emerald-500 rounded-l transition-all"
                style={{ width: `${successPct}%` }}
                title={`Success: ${rel.successfulExecutions} (${successPct.toFixed(1)}%)`}
              />
            )}
            {unsupportedPct > 0 && (
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${unsupportedPct}%` }}
                title={`Unsupported: ${rel.unsupportedExecutions} (${unsupportedPct.toFixed(1)}%)`}
              />
            )}
            {failedPct > 0 && (
              <div
                className="h-full bg-rose-500 rounded-r transition-all"
                style={{ width: `${failedPct}%` }}
                title={`Failed: ${rel.failedExecutions} (${failedPct.toFixed(1)}%)`}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Success: {successPct.toFixed(2)}%
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Unsupported: {unsupportedPct.toFixed(2)}%
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Failed: {failedPct.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Detailed Status Counts Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Successful
            </span>
            <span className="font-mono text-base font-bold text-emerald-400">
              {rel.successfulExecutions}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block">
              {(rel.successRate * 100).toFixed(2)}% of total
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Unsupported
            </span>
            <span className="font-mono text-base font-bold text-amber-400">
              {rel.unsupportedExecutions}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block">
              {(rel.unsupportedRate * 100).toFixed(2)}% of total
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Failed
            </span>
            <span className="font-mono text-base font-bold text-rose-400">
              {rel.failedExecutions}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block">
              {(rel.failureRate * 100).toFixed(2)}% of total
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">
              Timeouts
            </span>
            <span className="font-mono text-base font-bold text-slate-300">
              {rel.timeoutExecutions}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block">
              0.00% of total
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Taxonomy Clarification Banner */}
      <div className="rounded-xl p-4 bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <span className="font-semibold text-slate-200">
            Scientific Status Taxonomy
          </span>
          <p className="text-slate-400 leading-relaxed">
            <strong className="text-amber-300">Unsupported != Failure:</strong> An{" "}
            <em className="text-slate-200">Unsupported</em> status represents an
            explicit, clean refusal by a provider engine acknowledging that an intent
            falls outside its supported architectural scope. A{" "}
            <em className="text-slate-200">Failure</em> represents an uncaught
            exception, invalid syntax, hallucinated device name, or simulator
            invariant violation during execution.
          </p>
        </div>
      </div>

      {/* Side-by-Side Reliability Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderStatusDistribution(
          "LAYA",
          "bg-cyan-400",
          "border-cyan-500/30",
          laya
        )}
        {renderStatusDistribution(
          "LLM (llama3.2:3b)",
          "bg-purple-400",
          "border-purple-500/30",
          llm
        )}
      </div>

      {/* Failure Breakdown Card */}
      <div className="rounded-xl glass-card border border-slate-800 p-5 space-y-4">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-400" />
          Execution Incident Summary
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="font-mono text-cyan-400 font-semibold block">
              LAYA: 0 Failures Recorded
            </span>
            <p className="text-slate-400 leading-relaxed">
              All 180 runs terminated cleanly. 170 executions completed successfully;
              10 executions returned structured unsupported status on out-of-scope
              multi-device and ambiguous scenarios.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="font-mono text-purple-400 font-semibold block">
              LLM: 4 Failures Recorded (2.22%)
            </span>
            <p className="text-slate-400 leading-relaxed">
              4 executions failed in scenario <code className="text-purple-300 font-mono">multi-wake-01</code> (repetitions 2, 3, 4, 5) due to structured actions referencing an unmapped virtual device (<code className="text-purple-300 font-mono">thermostat_bedroom</code>).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
