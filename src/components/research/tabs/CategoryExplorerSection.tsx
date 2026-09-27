import React from "react";
import { DashboardAnalysisData } from "@/lib/evaluation/analysis/dashboardLoader";
import { Layers, Info } from "lucide-react";

interface CategoryExplorerSectionProps {
  data: DashboardAnalysisData;
}

export const CategoryExplorerSection: React.FC<CategoryExplorerSectionProps> = ({
  data,
}) => {
  const categories = data.categoryAnalysis;

  return (
    <div className="space-y-6">
      {/* Category Framework Notice */}
      <div className="rounded-xl p-4 bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <span className="font-semibold text-slate-200">
            Categorical Evaluation Taxonomy
          </span>
          <p className="text-slate-400 leading-relaxed">
            The frozen benchmark organizes 36 scenarios into seven independent functional categories.
            No category or provider ranking is applied; performance is reported side-by-side as
            empirical descriptive distributions.
          </p>
        </div>
      </div>

      {/* Categories Cards List */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const laya = cat.providers["LAYA"];
          const llm = cat.providers["LLM"];

          return (
            <div
              key={cat.category}
              className="rounded-xl glass-card border border-slate-800 p-5 space-y-4"
            >
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Layers className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white font-mono">
                      {cat.category}
                    </h3>
                    <span className="text-xs text-slate-400">
                      Functional Benchmark Group
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
                    {cat.scenarioCount} Scenarios
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
                    {cat.scenarioCount * 5} Executions / Provider
                  </span>
                </div>
              </div>

              {/* Side-by-Side Category Metrics Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                      <th className="py-2 px-3">Metric Dimension</th>
                      <th className="py-2 px-3 text-cyan-400">LAYA Mean</th>
                      <th className="py-2 px-3 text-purple-400">LLM Mean</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Status (Success / Unsupported / Fail)
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {laya?.successCount ?? 0} / {laya?.unsupportedCount ?? 0} / {laya?.failureCount ?? 0}
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {llm?.successCount ?? 0} / {llm?.unsupportedCount ?? 0} / {llm?.failureCount ?? 0}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        State Accuracy Ratio
                      </td>
                      <td className="py-2 px-3 text-cyan-300 font-semibold">
                        {((laya?.stateAccuracy.mean ?? 0) * 100).toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 text-purple-300 font-semibold">
                        {((llm?.stateAccuracy.mean ?? 0) * 100).toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Matched Required Actions
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {laya?.matchedRequired.mean.toFixed(2) ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {llm?.matchedRequired.mean.toFixed(2) ?? "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Missed Required Actions
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {laya?.missedRequired.mean.toFixed(2) ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {llm?.missedRequired.mean.toFixed(2) ?? "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Forbidden Actions Executed
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {laya?.forbidden.mean.toFixed(2) ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {llm?.forbidden.mean.toFixed(2) ?? "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Unnecessary Actions Executed
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {laya?.unnecessary.mean.toFixed(2) ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {llm?.unnecessary.mean.toFixed(2) ?? "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Redundant Actions Executed
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {laya?.redundant.mean.toFixed(2) ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {llm?.redundant.mean.toFixed(2) ?? "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Mean Decision Latency
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {(laya?.decisionLatencyMs.mean ?? 0).toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}{" "}
                        ms
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {(llm?.decisionLatencyMs.mean ?? 0).toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}{" "}
                        ms
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Mean Total Latency
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {(laya?.totalLatencyMs.mean ?? 0).toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}{" "}
                        ms
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {(llm?.totalLatencyMs.mean ?? 0).toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}{" "}
                        ms
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
