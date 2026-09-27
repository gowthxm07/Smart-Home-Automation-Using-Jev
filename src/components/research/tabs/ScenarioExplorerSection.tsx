import React, { useState, useMemo } from "react";
import {
  DashboardAnalysisData,
  EnrichedScenarioAnalysisRecord,
} from "@/lib/evaluation/analysis/dashboardLoader";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Layers,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface ScenarioExplorerSectionProps {
  data: DashboardAnalysisData;
}

export const ScenarioExplorerSection: React.FC<ScenarioExplorerSectionProps> = ({
  data,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [
    "ALL",
    "NORMAL",
    "PARTIAL_STATE",
    "NO_OP",
    "MULTI_DEVICE",
    "CONTEXT_SENSITIVE",
    "SECURITY",
    "AMBIGUOUS",
  ];

  const filteredScenarios = useMemo(() => {
    return data.scenarioAnalysis.filter((scenario) => {
      const matchesCategory =
        selectedCategory === "ALL" ||
        scenario.scenarioCategory === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        scenario.scenarioId.toLowerCase().includes(q) ||
        scenario.name.toLowerCase().includes(q) ||
        scenario.intent.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [data.scenarioAnalysis, searchQuery, selectedCategory]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by scenario ID, title, or intent..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "ALL" ? "All Categories (36)" : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Counter */}
      <div className="flex justify-between items-center text-xs text-slate-400 px-1 font-mono">
        <span>Showing {filteredScenarios.length} of {data.scenarioAnalysis.length} scenarios</span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-blue-400 hover:underline"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Scenarios List */}
      <div className="space-y-3">
        {filteredScenarios.map((scenario) => {
          const isExpanded = expandedId === scenario.scenarioId;
          const laya = scenario.providers["LAYA"];
          const llm = scenario.providers["LLM"];

          return (
            <div
              key={scenario.scenarioId}
              className="rounded-xl glass-card border border-slate-800 overflow-hidden transition-colors"
            >
              {/* Row Header */}
              <div
                onClick={() => toggleExpand(scenario.scenarioId)}
                className="p-4 cursor-pointer hover:bg-slate-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-blue-400">
                      {scenario.scenarioId}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {scenario.scenarioCategory}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">
                    {scenario.name}
                  </h4>
                  <p className="text-xs text-slate-400 italic line-clamp-1">
                    &ldquo;{scenario.intent}&rdquo;
                  </p>
                </div>

                {/* Quick Side-by-Side Snapshot */}
                <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                  {/* LAYA Quick Stat */}
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-right min-w-[130px]">
                    <span className="text-[10px] text-cyan-400 block font-semibold">
                      LAYA ({laya?.successfulRepetitions ?? 0}/5 OK)
                    </span>
                    <span className="text-slate-200">
                      Acc: {((laya?.stateAccuracy.mean ?? 0) * 100).toFixed(0)}%
                    </span>
                    <span className="text-slate-400 text-[10px] block">
                      {((laya?.decisionLatencyMs.mean ?? 0) / 1000).toFixed(1)}s
                    </span>
                  </div>

                  {/* LLM Quick Stat */}
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-purple-500/20 text-right min-w-[130px]">
                    <span className="text-[10px] text-purple-400 block font-semibold">
                      LLM ({llm?.successfulRepetitions ?? 0}/5 OK)
                    </span>
                    <span className="text-slate-200">
                      Acc: {((llm?.stateAccuracy.mean ?? 0) * 100).toFixed(0)}%
                    </span>
                    <span className="text-slate-400 text-[10px] block">
                      {((llm?.decisionLatencyMs.mean ?? 0) / 1000).toFixed(1)}s
                    </span>
                  </div>

                  <div className="text-slate-500 p-1">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-300" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Detailed Breakdown */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-4">
                  {/* Scenario Full Context */}
                  <div className="space-y-2 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[11px] uppercase font-mono">
                        Prompt Intent:
                      </span>
                      <p className="text-slate-200 font-mono italic mt-0.5">
                        &ldquo;{scenario.intent}&rdquo;
                      </p>
                    </div>
                    {scenario.description && (
                      <div className="pt-2 border-t border-slate-800/60">
                        <span className="text-slate-400 font-semibold block text-[11px] uppercase font-mono">
                          Scenario Description:
                        </span>
                        <p className="text-slate-300 mt-0.5">
                          {scenario.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Detailed Metric Comparison Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                          <th className="py-2 px-3">Metric</th>
                          <th className="py-2 px-3 text-cyan-400">LAYA Mean</th>
                          <th className="py-2 px-3 text-purple-400">LLM Mean</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        <tr>
                          <td className="py-2 px-3 text-slate-300 font-sans">
                            Execution Status (Success / Unsupported / Fail)
                          </td>
                          <td className="py-2 px-3 text-slate-200">
                            {laya?.successfulRepetitions ?? 0} / {laya?.unsupportedRepetitions ?? 0} / {laya?.failedRepetitions ?? 0}
                          </td>
                          <td className="py-2 px-3 text-slate-200">
                            {llm?.successfulRepetitions ?? 0} / {llm?.unsupportedRepetitions ?? 0} / {llm?.failedRepetitions ?? 0}
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
                            Decision Latency
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
                            Total Execution Latency
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
