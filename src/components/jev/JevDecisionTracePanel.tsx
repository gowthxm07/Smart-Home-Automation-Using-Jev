"use client";

import React from "react";
import { useHome } from "@/context/HomeContext";
import {
  Cpu,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  BarChart3,
  HelpCircle,
  Play,
  RotateCcw,
  Zap,
  ShieldAlert,
} from "lucide-react";
import { JevDecisionTrace, JevDecisionTraceItem } from "@/lib/jev/trace";

export const JevDecisionTracePanel: React.FC = () => {
  const {
    homeState,
    jevExecutionState,
    jevError,
    latestDecisionResult,
    latestDecisionTrace,
    latestAppliedActions,
    latestSkippedActions,
    runJevAutomation,
    clearJevTrace,
  } = useHome();

  const isGoingToSleepScenario =
    homeState.currentScenario?.id === "GOING_TO_SLEEP" ||
    homeState.currentIntentText.toLowerCase().includes("sleep");

  const getStatusBadge = () => {
    switch (jevExecutionState) {
      case "EVALUATING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            EVALUATING JEV (8 QUESTIONS)...
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            COMPLETED
          </span>
        );
      case "ERROR":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            ERROR
          </span>
        );
      case "IDLE":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
            IDLE
          </span>
        );
    }
  };

  const renderDecisionCard = (decision: JevDecisionTraceItem) => {
    const isNoul = decision.questionType === "noul";
    const isChoice = decision.questionType === "choice";

    // Format primary probability percentage
    const primaryProbPercent =
      typeof decision.probability === "number"
        ? Math.round(decision.probability * 100)
        : null;

    const confidencePercent = Math.round(decision.confidence * 100);

    // Identify if this decision produced an action or was skipped
    const wasApplied = latestAppliedActions.some((a) => a.deviceId === decision.questionId);
    const skippedReason = latestSkippedActions.find((s) => s.startsWith(decision.questionId));

    return (
      <div
        key={decision.questionId}
        className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80 hover:border-slate-700 transition space-y-3"
      >
        {/* Top: Question Type & ID */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
              isNoul
                ? "bg-purple-500/10 text-purple-300 border border-purple-500/25"
                : "bg-blue-500/10 text-blue-300 border border-blue-500/25"
            }`}
          >
            {decision.questionType}
          </span>
          <span className="text-[11px] font-mono text-slate-400">{decision.questionId}</span>
        </div>

        {/* Question Instructions */}
        <p className="text-xs text-slate-200 font-medium leading-snug">
          {decision.instructions}
        </p>

        {/* Decision & Confidence */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Decision</span>
            {isNoul && (
              <span
                className={`font-mono font-bold ${
                  decision.affirmative ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {decision.affirmative ? "YES" : "NO"}
                {primaryProbPercent !== null ? ` (${primaryProbPercent}%)` : ""}
              </span>
            )}
            {isChoice && (
              <span className="font-mono font-bold text-cyan-300 uppercase">
                {decision.selectedChoice ?? "N/A"}
                {primaryProbPercent !== null ? ` (${primaryProbPercent}%)` : ""}
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Confidence</span>
            <span className="font-mono font-bold text-slate-200">{confidencePercent}%</span>
          </div>
        </div>

        {/* Distribution / Probability Details */}
        {isNoul && primaryProbPercent !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>YES: {primaryProbPercent}%</span>
              <span>NO: {100 - primaryProbPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${primaryProbPercent}%` }}
              ></div>
              <div
                className="bg-rose-500/60 h-full transition-all duration-300"
                style={{ width: `${100 - primaryProbPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {isChoice && decision.probabilities && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Distribution:</span>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              {Object.entries(decision.probabilities).map(([choiceKey, prob]) => {
                const pct = Math.round(prob * 100);
                const isSelected = decision.selectedChoice?.toLowerCase() === choiceKey.toLowerCase();
                return (
                  <div
                    key={choiceKey}
                    className={`px-2 py-1 rounded flex justify-between items-center ${
                      isSelected
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold"
                        : "bg-slate-800/60 text-slate-400"
                    }`}
                  >
                    <span>{choiceKey}:</span>
                    <span>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Outcome Indicator */}
        <div className="pt-2 border-t border-slate-800/80">
          {wasApplied ? (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Action Generated &bull; Executed</span>
            </div>
          ) : skippedReason ? (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Skipped &bull; Already in target state</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span>No Action &bull; Negative decision</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-100">Jev Decision Trace & Observability</h2>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live inspection of TypeSafe Jev structured decisions, probability distributions, and policy mapping
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {latestDecisionTrace && (
            <button
              onClick={clearJevTrace}
              className="px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Trace
            </button>
          )}

          <button
            onClick={() => runJevAutomation()}
            disabled={jevExecutionState === "EVALUATING"}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition whitespace-nowrap ${
              jevExecutionState === "EVALUATING"
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/25"
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {jevExecutionState === "EVALUATING"
                ? "Evaluating with Jev..."
                : "Run Jev Automation (GOING_TO_SLEEP)"}
            </span>
          </button>
        </div>
      </div>

      {/* Evaluating Loading State Card */}
      {jevExecutionState === "EVALUATING" && (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
          <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Cpu className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              Querying TypeSafe Jev System One Engine...
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Submitting 8 structured decision questions conditioned on current HomeState.
            </p>
          </div>
        </div>
      )}

      {/* Error State Card */}
      {jevExecutionState === "ERROR" && jevError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>Jev Decision Evaluation Failed</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
            Reason: {jevError}
          </p>
          <p className="text-[11px] text-slate-400">
            HomeState was preserved without changes. No fallback fake decisions were applied.
          </p>
        </div>
      )}

      {/* Decision Trace Active Content */}
      {latestDecisionTrace && (
        <div className="space-y-4">
          {/* Metadata Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Model</span>
              <span className="font-semibold text-slate-200">{latestDecisionTrace.modelUsed}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Tokens</span>
              <span className="font-semibold text-slate-200">
                In: {latestDecisionTrace.tokenUsage?.input_tokens ?? 0} &bull; Out:{" "}
                {latestDecisionTrace.tokenUsage?.output_tokens ?? 0}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Avg Confidence</span>
              <span className="font-semibold text-emerald-400">
                {Math.round(latestDecisionTrace.overallConfidence * 100)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Latency</span>
              <span className="font-semibold text-cyan-400">
                {latestDecisionResult?.decisionTimeMs ?? 0} ms
              </span>
            </div>
          </div>

          {/* Decisions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Object.values(latestDecisionTrace.decisions).map((decision) =>
              renderDecisionCard(decision as JevDecisionTraceItem)
            )}
          </div>

          {/* Bottom Action Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Generated Actions */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Generated Actions Applied ({latestAppliedActions.length})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                  Source: JEV
                </span>
              </div>
              {latestAppliedActions.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No actions were generated (all devices were already in target sleep states).
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs font-mono">
                  {latestAppliedActions.map((act) => (
                    <li
                      key={act.id}
                      className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                    >
                      <span className="text-slate-300 font-semibold">{act.deviceId}</span>
                      <span className="text-cyan-300 font-medium">
                        {act.actionType} {act.value !== undefined ? `(${act.value})` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Skipped Redundant Actions */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Skipped Redundant Actions ({latestSkippedActions.length})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">
                  Non-Redundant Policy
                </span>
              </div>
              {latestSkippedActions.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No actions were skipped.
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs font-mono">
                  {latestSkippedActions.map((skip, idx) => (
                    <li
                      key={idx}
                      className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-400"
                    >
                      {skip}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Idle Notice when no trace has been run yet */}
      {jevExecutionState === "IDLE" && !latestDecisionTrace && (
        <div className="py-8 text-center text-slate-500 text-xs space-y-1.5 border border-dashed border-slate-800/80 rounded-xl">
          <BarChart3 className="w-7 h-7 mx-auto mb-1 text-slate-600" />
          <p className="text-slate-300 font-medium">No Jev Evaluation Trace Recorded Yet</p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Click <strong>"Run Jev Automation (GOING_TO_SLEEP)"</strong> above to evaluate the bedtime workflow against current virtual device states.
          </p>
        </div>
      )}
    </div>
  );
};
