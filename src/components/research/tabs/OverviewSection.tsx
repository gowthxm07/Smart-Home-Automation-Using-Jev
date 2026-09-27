import React from "react";
import { DashboardAnalysisData } from "@/lib/evaluation/analysis/dashboardLoader";
import { ComparisonBar } from "../visual/ComparisonBar";
import {
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Target,
  ShieldCheck,
  Hash,
  Info,
} from "lucide-react";

interface OverviewSectionProps {
  data: DashboardAnalysisData;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ data }) => {
  const laya = data.providerSummaries["LAYA"];
  const llm = data.providerSummaries["LLM"];

  return (
    <div className="space-y-6">
      {/* Methodology Mandatory Research Notice */}
      <div className="rounded-xl p-4 bg-slate-900/90 border border-blue-500/20 flex items-start gap-3 text-xs">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <span className="font-semibold text-blue-300">
            Research Evaluation Methodology Note
          </span>
          <p className="text-slate-300 leading-relaxed">
            Descriptive comparison of independently measured provider behavior over
            the same frozen scenario dataset. No composite score or overall ranking
            is used.
          </p>
        </div>
      </div>

      {/* Dataset & Experiment Scope Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl glass-card border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Dataset Scenarios</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {data.manifest.datasetScenarioCount}
            </span>
            <span className="text-xs text-slate-400 font-mono">scenarios</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            7 ground-truth categories
          </span>
        </div>

        <div className="rounded-xl glass-card border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Repetition Protocol</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">5</span>
            <span className="text-xs text-slate-400 font-mono">repetitions/scenario</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            180 scheduled executions/provider
          </span>
        </div>

        <div className="rounded-xl glass-card border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Evaluated Providers</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">2</span>
            <span className="text-xs text-slate-400 font-mono">baselines</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1 font-mono">
            LAYA &bull; LLM (llama3.2:3b)
          </span>
        </div>

        <div className="rounded-xl glass-card border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Dataset Verification</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xs font-mono text-cyan-300 font-semibold truncate block">
              66de3242...
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1 font-mono">
            SHA-256 Verified
          </span>
        </div>
      </div>

      {/* Side-by-Side Provider Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LAYA Provider Overview Card */}
        <div className="rounded-xl glass-card border border-cyan-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  LAYA Baseline
                </h3>
                <span className="text-xs font-mono text-cyan-400">
                  {laya?.engineId ?? "laya-system-one"}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
              System One
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Experiment ID:</span>
              <span className="font-mono text-slate-200">
                {laya?.experimentId ?? "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Total Execution Attempts:</span>
              <span className="font-mono font-medium text-slate-200">
                {laya?.totalRepetitionAttempts ?? 0}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Successful Executions:
              </span>
              <span className="font-mono font-medium text-emerald-400">
                {laya?.reliability.successfulExecutions ?? 0} (
                {((laya?.reliability.successRate ?? 0) * 100).toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Unsupported Executions:
              </span>
              <span className="font-mono font-medium text-amber-400">
                {laya?.reliability.unsupportedExecutions ?? 0} (
                {((laya?.reliability.unsupportedRate ?? 0) * 100).toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                Failed Executions:
              </span>
              <span className="font-mono font-medium text-slate-300">
                {laya?.reliability.failedExecutions ?? 0} (
                {((laya?.reliability.failureRate ?? 0) * 100).toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Mean State Accuracy:</span>
              <span className="font-mono font-medium text-cyan-300">
                {((laya?.actionMetrics.stateAccuracyRatio.mean ?? 0) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Mean Decision Latency:</span>
              <span className="font-mono font-medium text-slate-200">
                {(laya?.latency.decisionLatencyMs.mean ?? 0).toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}{" "}
                ms
              </span>
            </div>
          </div>
        </div>

        {/* LLM Provider Overview Card */}
        <div className="rounded-xl glass-card border border-purple-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-purple-400" />
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Conventional LLM Baseline
                </h3>
                <span className="text-xs font-mono text-purple-400">
                  {llm?.engineId ?? "llm-ollama"} (llama3.2:3b)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-[10px] font-mono text-purple-300">
              Local Ollama
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Experiment ID:</span>
              <span className="font-mono text-slate-200">
                {llm?.experimentId ?? "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Total Execution Attempts:</span>
              <span className="font-mono font-medium text-slate-200">
                {llm?.totalRepetitionAttempts ?? 0}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Successful Executions:
              </span>
              <span className="font-mono font-medium text-emerald-400">
                {llm?.reliability.successfulExecutions ?? 0} (
                {((llm?.reliability.successRate ?? 0) * 100).toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Unsupported Executions:
              </span>
              <span className="font-mono font-medium text-slate-300">
                {llm?.reliability.unsupportedExecutions ?? 0} (
                {((llm?.reliability.unsupportedRate ?? 0) * 100).toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                Failed Executions:
              </span>
              <span className="font-mono font-medium text-rose-400">
                {llm?.reliability.failedExecutions ?? 0} (
                {((llm?.reliability.failureRate ?? 0) * 100).toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Mean State Accuracy:</span>
              <span className="font-mono font-medium text-purple-300">
                {((llm?.actionMetrics.stateAccuracyRatio.mean ?? 0) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Mean Decision Latency:</span>
              <span className="font-mono font-medium text-slate-200">
                {(llm?.latency.decisionLatencyMs.mean ?? 0).toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}{" "}
                ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metric Comparison Bars */}
      <div className="rounded-xl glass-card border border-slate-800 p-5 space-y-4">
        <h4 className="text-sm font-semibold text-slate-200">
          Core Metric Comparisons
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ComparisonBar
            label="Mean State Accuracy Ratio"
            layaValue={laya?.actionMetrics.stateAccuracyRatio.mean ?? 0}
            llmValue={llm?.actionMetrics.stateAccuracyRatio.mean ?? 0}
            formatValue={(v) => `${(v * 100).toFixed(2)}%`}
            maxValue={1.0}
            description="Evaluated on successful runs"
          />

          <ComparisonBar
            label="Mean Decision Latency"
            layaValue={laya?.latency.decisionLatencyMs.mean ?? 0}
            llmValue={llm?.latency.decisionLatencyMs.mean ?? 0}
            formatValue={(v) => `${(v / 1000).toFixed(1)}s`}
            maxValue={Math.max(
              laya?.latency.decisionLatencyMs.mean ?? 0,
              llm?.latency.decisionLatencyMs.mean ?? 0
            )}
            description="Wall-clock decision time"
          />

          <ComparisonBar
            label="Supported Success Executions"
            layaValue={laya?.reliability.successfulExecutions ?? 0}
            llmValue={llm?.reliability.successfulExecutions ?? 0}
            formatValue={(v) => `${v} / 180`}
            maxValue={180}
            description="Executions completed without failure/unsupported"
          />

          <ComparisonBar
            label="Mean Matched Required Actions"
            layaValue={laya?.actionMetrics.matchedRequiredActions.mean ?? 0}
            llmValue={llm?.actionMetrics.matchedRequiredActions.mean ?? 0}
            formatValue={(v) => v.toFixed(2)}
            maxValue={Math.max(
              laya?.actionMetrics.matchedRequiredActions.mean ?? 0,
              llm?.actionMetrics.matchedRequiredActions.mean ?? 0
            )}
            description="Ground-truth actions matched per scenario"
          />
        </div>
      </div>
    </div>
  );
};
