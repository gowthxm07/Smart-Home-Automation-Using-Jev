import React from "react";
import { DashboardAnalysisData } from "@/lib/evaluation/analysis/dashboardLoader";
import { MetricStatTile } from "../visual/MetricStatTile";
import { Info, CheckSquare, ListFilter, Sliders } from "lucide-react";

interface ActionMetricsSectionProps {
  data: DashboardAnalysisData;
}

export const ActionMetricsSection: React.FC<ActionMetricsSectionProps> = ({
  data,
}) => {
  const laya = data.providerSummaries["LAYA"];
  const llm = data.providerSummaries["LLM"];

  const layaMetrics = laya?.actionMetrics;
  const llmMetrics = llm?.actionMetrics;

  const layaAccounting = laya?.actionAccounting;
  const llmAccounting = llm?.actionAccounting;

  return (
    <div className="space-y-6">
      {/* Scope Clarification Notice */}
      <div className="rounded-xl p-4 bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <span className="font-semibold text-slate-200">
            Action Metrics Evaluation Scope
          </span>
          <p className="text-slate-400 leading-relaxed">
            Evaluated across successful executions (LAYA N = 170, LLM N = 176). Each
            metric is calculated independently against scenario ground-truth criteria.
            HomeMind strictly avoids weighted composite scoring to preserve empirical
            neutrality.
          </p>
        </div>
      </div>

      {/* Grid of Independent Metric Stat Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricStatTile
          title="State Accuracy Ratio"
          definition="Proportion of evaluated smart devices matching expected ground truth physical state after simulation."
          unit="%"
          layaStats={layaMetrics?.stateAccuracyRatio}
          llmStats={llmMetrics?.stateAccuracyRatio}
          digits={2}
        />

        <MetricStatTile
          title="Matched Required Actions"
          definition="Ground-truth mandatory device state transitions successfully produced and executed by the provider."
          unit="count"
          layaStats={layaMetrics?.matchedRequiredActions}
          llmStats={llmMetrics?.matchedRequiredActions}
          digits={2}
        />

        <MetricStatTile
          title="Missed Required Actions"
          definition="Ground-truth mandatory device state transitions omitted by the decision engine."
          unit="count"
          layaStats={layaMetrics?.missedRequiredActions}
          llmStats={llmMetrics?.missedRequiredActions}
          digits={2}
        />

        <MetricStatTile
          title="Forbidden Actions"
          definition="Safety-violating or hazardous device actions explicitly forbidden by scenario constraints."
          unit="count"
          layaStats={layaMetrics?.forbiddenActions}
          llmStats={llmMetrics?.forbiddenActions}
          digits={2}
        />

        <MetricStatTile
          title="Unnecessary Actions"
          definition="Actions executed that were neither required nor optional in the scenario context."
          unit="count"
          layaStats={layaMetrics?.unnecessaryActions}
          llmStats={llmMetrics?.unnecessaryActions}
          digits={2}
        />

        <MetricStatTile
          title="Redundant Actions"
          definition="Actions targeting devices that were already physically in the desired state."
          unit="count"
          layaStats={layaMetrics?.redundantActions}
          llmStats={llmMetrics?.redundantActions}
          digits={2}
        />

        <MetricStatTile
          title="Optional Actions"
          definition="Contextually valid but non-mandatory smart home adjustments executed."
          unit="count"
          layaStats={layaMetrics?.optionalActions}
          llmStats={llmMetrics?.optionalActions}
          digits={2}
        />
      </div>

      {/* Action Accounting Table */}
      <div className="rounded-xl glass-card border border-slate-800 p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-slate-400" />
            Empirical Action Accounting
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit of raw actions proposed, skipped redundant actions, and final simulated commands across the full benchmark batch.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2 px-3">Accounting Dimension</th>
                <th className="py-2 px-3 text-cyan-400">LAYA Total (N=170)</th>
                <th className="py-2 px-3 text-purple-400">LLM Total (N=176)</th>
                <th className="py-2 px-3 text-cyan-400">LAYA Mean / Run</th>
                <th className="py-2 px-3 text-purple-400">LLM Mean / Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr>
                <td className="py-2.5 px-3 text-slate-300 font-sans font-medium">
                  Proposed Actions
                </td>
                <td className="py-2.5 px-3 text-slate-200">
                  {layaAccounting?.totalProposed ?? 0}
                </td>
                <td className="py-2.5 px-3 text-slate-200">
                  {llmAccounting?.totalProposed ?? 0}
                </td>
                <td className="py-2.5 px-3 text-cyan-300">
                  {layaAccounting?.meanProposedPerRun.toFixed(2) ?? "—"}
                </td>
                <td className="py-2.5 px-3 text-purple-300">
                  {llmAccounting?.meanProposedPerRun.toFixed(2) ?? "—"}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-slate-300 font-sans font-medium">
                  Skipped Redundant Actions
                </td>
                <td className="py-2.5 px-3 text-slate-200">
                  {layaAccounting?.totalSkipped ?? 0}
                </td>
                <td className="py-2.5 px-3 text-slate-200">
                  {llmAccounting?.totalSkipped ?? 0}
                </td>
                <td className="py-2.5 px-3 text-cyan-300">
                  {layaAccounting?.meanSkippedPerRun.toFixed(2) ?? "—"}
                </td>
                <td className="py-2.5 px-3 text-purple-300">
                  {llmAccounting?.meanSkippedPerRun.toFixed(2) ?? "—"}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-slate-300 font-sans font-medium">
                  Executable / Simulated Actions
                </td>
                <td className="py-2.5 px-3 text-slate-200">
                  {layaAccounting?.totalExecutable ?? 0}
                </td>
                <td className="py-2.5 px-3 text-slate-200">
                  {llmAccounting?.totalExecutable ?? 0}
                </td>
                <td className="py-2.5 px-3 text-cyan-300">
                  {layaAccounting?.meanExecutablePerRun.toFixed(2) ?? "—"}
                </td>
                <td className="py-2.5 px-3 text-purple-300">
                  {llmAccounting?.meanExecutablePerRun.toFixed(2) ?? "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
