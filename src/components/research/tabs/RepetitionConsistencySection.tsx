import React from "react";
import { DashboardAnalysisData } from "@/lib/evaluation/analysis/dashboardLoader";
import { Sliders, Info, Check, X, Clock, RefreshCw } from "lucide-react";

interface RepetitionConsistencySectionProps {
  data: DashboardAnalysisData;
}

export const RepetitionConsistencySection: React.FC<
  RepetitionConsistencySectionProps
> = ({ data }) => {
  const laya = data.providerSummaries["LAYA"]?.repetitionConsistency;
  const llm = data.providerSummaries["LLM"]?.repetitionConsistency;

  const scenarios = data.scenarioAnalysis;

  return (
    <div className="space-y-6">
      {/* Interpretive Integrity Clarification */}
      <div className="rounded-xl p-4 bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <span className="font-semibold text-slate-200">
            Repetition Consistency Definition
          </span>
          <p className="text-slate-400 leading-relaxed">
            Measures the variance across 5 independent repetitions of each scenario.
            <strong className="text-slate-300"> Consistency is an architectural measurement of determinism, not quality.</strong> A
            provider can consistently produce the same sub-optimal action or deterministically
            adhere to deterministic logic. Latency range reflects the span between minimum and
            maximum execution time within the 5 repetitions.
          </p>
        </div>
      </div>

      {/* Side-by-Side Consistency Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LAYA Consistency Profile */}
        <div className="rounded-xl glass-card border border-cyan-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                LAYA Repetition Determinism
              </h3>
            </div>
            <span className="font-mono text-xs text-cyan-300">
              {laya?.totalScenarios ?? 36} Scenarios
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Scenarios with Identical Actions:</span>
              <span className="font-mono font-medium text-slate-200">
                {laya?.scenariosWithIdenticalActions ?? 0} / 36 (
                {((laya?.actionConsistencyRate ?? 0) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Scenarios with Identical Accuracy:</span>
              <span className="font-mono font-medium text-slate-200">
                {laya?.scenariosWithIdenticalAccuracy ?? 0} / 36 (
                {((laya?.accuracyConsistencyRate ?? 0) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Scenarios with Identical Metrics:</span>
              <span className="font-mono font-medium text-slate-200">
                {laya?.scenariosWithIdenticalMetrics ?? 0} / 36 (
                {((laya?.metricConsistencyRate ?? 0) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Mean Latency Spread (Max - Min):</span>
              <span className="font-mono font-medium text-cyan-300">
                {(laya?.meanLatencyRangeMs ?? 0).toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}{" "}
                ms
              </span>
            </div>
          </div>
        </div>

        {/* LLM Consistency Profile */}
        <div className="rounded-xl glass-card border border-purple-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                LLM Repetition Determinism
              </h3>
            </div>
            <span className="font-mono text-xs text-purple-300">
              {llm?.totalScenarios ?? 36} Scenarios
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Scenarios with Identical Actions:</span>
              <span className="font-mono font-medium text-slate-200">
                {llm?.scenariosWithIdenticalActions ?? 0} / 36 (
                {((llm?.actionConsistencyRate ?? 0) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Scenarios with Identical Accuracy:</span>
              <span className="font-mono font-medium text-slate-200">
                {llm?.scenariosWithIdenticalAccuracy ?? 0} / 36 (
                {((llm?.accuracyConsistencyRate ?? 0) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Scenarios with Identical Metrics:</span>
              <span className="font-mono font-medium text-slate-200">
                {llm?.scenariosWithIdenticalMetrics ?? 0} / 36 (
                {((llm?.metricConsistencyRate ?? 0) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Mean Latency Spread (Max - Min):</span>
              <span className="font-mono font-medium text-purple-300">
                {(llm?.meanLatencyRangeMs ?? 0).toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}{" "}
                ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario-Level Consistency Table */}
      <div className="rounded-xl glass-card border border-slate-800 p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-slate-400" />
            Scenario-by-Scenario Repetition Audit
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit of identical actions, accuracy, and latency range across 5 repetitions.
          </p>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[11px] z-10">
              <tr>
                <th className="py-2 px-3">Scenario ID</th>
                <th className="py-2 px-3 text-cyan-400">LAYA Identical Actions</th>
                <th className="py-2 px-3 text-purple-400">LLM Identical Actions</th>
                <th className="py-2 px-3 text-cyan-400">LAYA Latency Range</th>
                <th className="py-2 px-3 text-purple-400">LLM Latency Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {scenarios.map((s) => {
                const layaCons = laya?.scenarioConsistency?.[s.scenarioId];
                const llmCons = llm?.scenarioConsistency?.[s.scenarioId];

                return (
                  <tr key={s.scenarioId} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-sans font-medium text-slate-200">
                      {s.scenarioId}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {layaCons?.identicalActions ? "IDENTICAL" : "VARIED"}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {llmCons?.identicalActions ? "IDENTICAL" : "VARIED"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-cyan-300">
                      {((layaCons?.latencyRangeMs ?? 0) / 1000).toFixed(2)}s
                    </td>
                    <td className="py-2 px-3 text-purple-300">
                      {((llmCons?.latencyRangeMs ?? 0) / 1000).toFixed(2)}s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
