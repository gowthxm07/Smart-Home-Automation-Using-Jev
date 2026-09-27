import React from "react";
import { DashboardAnalysisData } from "@/lib/evaluation/analysis/dashboardLoader";
import { PercentileChart } from "../visual/PercentileChart";
import { LatencyBucketChart } from "../visual/LatencyBucketChart";
import { MetricStatTile } from "../visual/MetricStatTile";
import { Clock, Info, Activity } from "lucide-react";

interface LatencySectionProps {
  data: DashboardAnalysisData;
}

export const LatencySection: React.FC<LatencySectionProps> = ({ data }) => {
  const laya = data.latencyAnalysis["LAYA"];
  const llm = data.latencyAnalysis["LLM"];

  const buildPercentileSet = (stat: typeof laya.decisionLatencyMs) => ({
    min: stat.min,
    p50: stat.percentiles?.p50 ?? stat.median,
    p75: stat.percentiles?.p75 ?? stat.median,
    p90: stat.percentiles?.p90 ?? stat.max,
    p95: stat.percentiles?.p95 ?? stat.max,
    p99: stat.percentiles?.p99 ?? stat.max,
    max: stat.max,
  });

  return (
    <div className="space-y-6">
      {/* Scope Clarification Notice */}
      <div className="rounded-xl p-4 bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
          <Clock className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <span className="font-semibold text-slate-200">
            Latency Measurement Protocol
          </span>
          <p className="text-slate-400 leading-relaxed">
            All latency measurements represent wall-clock time in milliseconds captured
            during controlled benchmark execution. Decision latency measures the engine
            reasoning and command generation phase; total latency includes discrete-event
            simulation and evaluation verification.
          </p>
        </div>
      </div>

      {/* Latency Percentile Visualizations */}
      <div className="space-y-6">
        {laya?.decisionLatencyMs && llm?.decisionLatencyMs && (
          <PercentileChart
            title="Decision Latency Percentiles"
            subtitle="Provider reasoning latency across empirical percentiles (P50 through P99)"
            layaData={buildPercentileSet(laya.decisionLatencyMs)}
            llmData={buildPercentileSet(llm.decisionLatencyMs)}
          />
        )}

        {laya?.totalLatencyMs && llm?.totalLatencyMs && (
          <PercentileChart
            title="Total End-to-End Latency Percentiles"
            subtitle="Full execution pipeline duration including discrete simulation"
            layaData={buildPercentileSet(laya.totalLatencyMs)}
            llmData={buildPercentileSet(llm.totalLatencyMs)}
          />
        )}
      </div>

      {/* Empirical Latency Bucket Distribution */}
      {laya?.distributionBuckets && llm?.distributionBuckets && (
        <LatencyBucketChart
          layaBuckets={laya.distributionBuckets}
          llmBuckets={llm.distributionBuckets}
        />
      )}

      {/* Descriptive Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricStatTile
          title="Decision Latency"
          definition="Wall-clock time for the decision engine to process intent and generate commands."
          unit="ms"
          layaStats={laya?.decisionLatencyMs}
          llmStats={llm?.decisionLatencyMs}
          digits={1}
        />

        <MetricStatTile
          title="Simulation Latency"
          definition="Duration of the discrete-event simulation engine resolving physical state transitions."
          unit="ms"
          layaStats={laya?.simulationLatencyMs}
          llmStats={llm?.simulationLatencyMs}
          digits={2}
        />

        <MetricStatTile
          title="Evaluation Latency"
          definition="Duration of the evaluation engine verifying state accuracy against ground truth."
          unit="ms"
          layaStats={laya?.evaluationLatencyMs}
          llmStats={llm?.evaluationLatencyMs}
          digits={2}
        />
      </div>
    </div>
  );
};
