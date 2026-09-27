"use client";

import React, { useState } from "react";
import { DashboardAnalysisData } from "@/lib/evaluation/analysis/dashboardLoader";
import { ResearchHeader } from "./ResearchHeader";
import { OverviewSection } from "./tabs/OverviewSection";
import { ReliabilitySection } from "./tabs/ReliabilitySection";
import { ActionMetricsSection } from "./tabs/ActionMetricsSection";
import { LatencySection } from "./tabs/LatencySection";
import { ScenarioExplorerSection } from "./tabs/ScenarioExplorerSection";
import { CategoryExplorerSection } from "./tabs/CategoryExplorerSection";
import { RepetitionConsistencySection } from "./tabs/RepetitionConsistencySection";
import { FailureAnalysisSection } from "./tabs/FailureAnalysisSection";
import { TraceabilitySection } from "./tabs/TraceabilitySection";
import {
  BarChart2,
  ShieldAlert,
  Sliders,
  Clock,
  Search,
  Layers,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

interface ResearchDashboardClientProps {
  data: DashboardAnalysisData;
}

type TabType =
  | "overview"
  | "reliability"
  | "action-metrics"
  | "latency"
  | "scenario-explorer"
  | "category-explorer"
  | "consistency"
  | "failures"
  | "traceability";

interface TabDefinition {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDefinition[] = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "reliability", label: "Reliability", icon: ShieldAlert },
  { id: "action-metrics", label: "Action Metrics", icon: Sliders },
  { id: "latency", label: "Latency", icon: Clock },
  { id: "scenario-explorer", label: "Scenario Explorer", icon: Search },
  { id: "category-explorer", label: "Category Explorer", icon: Layers },
  { id: "consistency", label: "Repetition Consistency", icon: RefreshCw },
  { id: "failures", label: "Failure Analysis", icon: AlertTriangle },
  { id: "traceability", label: "Traceability", icon: ShieldCheck },
];

export const ResearchDashboardClient: React.FC<
  ResearchDashboardClientProps
> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <ResearchHeader
        analysisId={data.manifest.analysisId}
        scenarioCount={data.manifest.datasetScenarioCount}
        datasetHash={data.manifest.datasetHash}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Tab Navigation Bar */}
        <div className="glass-panel rounded-2xl p-1.5 border border-slate-800 overflow-x-auto">
          <nav
            role="tablist"
            className="flex items-center gap-1 min-w-max"
            aria-label="Research Dashboard Navigation Tabs"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all select-none ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content Display Area */}
        <div className="space-y-6">
          {activeTab === "overview" && <OverviewSection data={data} />}
          {activeTab === "reliability" && <ReliabilitySection data={data} />}
          {activeTab === "action-metrics" && (
            <ActionMetricsSection data={data} />
          )}
          {activeTab === "latency" && <LatencySection data={data} />}
          {activeTab === "scenario-explorer" && (
            <ScenarioExplorerSection data={data} />
          )}
          {activeTab === "category-explorer" && (
            <CategoryExplorerSection data={data} />
          )}
          {activeTab === "consistency" && (
            <RepetitionConsistencySection data={data} />
          )}
          {activeTab === "failures" && (
            <FailureAnalysisSection data={data} />
          )}
          {activeTab === "traceability" && (
            <TraceabilitySection data={data} />
          )}
        </div>
      </main>
    </div>
  );
};
