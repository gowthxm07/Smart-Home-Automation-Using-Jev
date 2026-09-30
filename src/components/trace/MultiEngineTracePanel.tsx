"use client";

import React, { useState, useEffect } from "react";
import { useHome } from "@/context/HomeContext";
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  BarChart3,
  RotateCcw,
  Bot,
  Zap,
  Info,
} from "lucide-react";
import { Action } from "@/types/action";
import { DecisionResult } from "@/types/engine";

export const MultiEngineTracePanel: React.FC = () => {
  const {
    latestMultiEngineResults,
    latestAppliedActions,
    latestSkippedActions,
    activeExecutionState,
    executionError,
    primaryFloorPlanEngine,
    clearExecutionTrace,
  } = useHome();

  // Determine available tabs based on results in latestMultiEngineResults
  const hasLaya = Boolean(latestMultiEngineResults?.["LAYA"]);
  const hasLLM = Boolean(latestMultiEngineResults?.["LLM"]);
  const hasAnyResults = hasLaya || hasLLM;

  const defaultTab =
    primaryFloorPlanEngine && latestMultiEngineResults?.[primaryFloorPlanEngine]
      ? primaryFloorPlanEngine
      : hasLaya
      ? "LAYA"
      : hasLLM
      ? "LLM"
      : "LAYA";

  // Active tab: "LAYA" | "LLM"
  const [activeTab, setActiveTab] = useState<string>(() => defaultTab);

  // Auto-switch to active provider when results arrive
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Identify which engine drove the virtual home floor plan in this run
  const activeFloorPlanDriver =
    primaryFloorPlanEngine || (hasLaya ? "LAYA" : hasLLM ? "LLM" : null);

  // ---------------------------------------------------------------------------
  // LAYA TAB RENDERER
  // ---------------------------------------------------------------------------
  const renderLayaTab = () => {
    const layaRes = latestMultiEngineResults?.["LAYA"];
    const decResult: DecisionResult | undefined = layaRes?.decisionResult;
    const isError = layaRes && !layaRes.success;
    const errorMsg = layaRes && !layaRes.success ? layaRes.error : null;

    if (isError) {
      return (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>Laya Decision Evaluation Failed</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
            Reason: {errorMsg || "Laya daemon unreachable or service returned an error."}
          </p>
          <p className="text-[11px] text-slate-400">
            HomeState was preserved without modification. Start the local daemon via{" "}
            <code className="text-cyan-300">laya-serve</code>.
          </p>
        </div>
      );
    }

    if (!decResult) {
      return (
        <div className="py-8 text-center text-slate-500 text-xs space-y-1.5 border border-dashed border-slate-800/80 rounded-xl">
          <Bot className="w-7 h-7 mx-auto mb-1 text-slate-600" />
          <p className="text-slate-300 font-medium">No Laya Evaluation Trace Recorded Yet</p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Execute an intent automation in Section 1 to probe Laya's ModernBERT System-1 decision model.
          </p>
        </div>
      );
    }

    const latencyMs = decResult.decisionTimeMs ?? 0;
    const confVal = decResult.confidence;
    const rawProbabilities = decResult.metadata?.probabilities as Record<string, number> | undefined;
    const actions: Action[] = decResult.actions || [];
    const skipped: string[] = (decResult.metadata?.skippedRedundantActions as string[]) || [];

    return (
      <div className="space-y-4">
        {/* Top Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Model</span>
            <span className="font-semibold text-slate-200">
              {(decResult.metadata?.model as string) || "convai/laya-system-one-421m"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Runtime</span>
            <span className="font-semibold text-teal-300">laya-serve (FastAPI)</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Model Confidence</span>
            <span className="font-semibold text-teal-400">
              {typeof confVal === "number" ? (
                <>
                  {Math.round(confVal * 100)}%{" "}
                  <span className="text-[10px] text-slate-500 font-normal">
                    (model-reported, uncalibrated)
                  </span>
                </>
              ) : (
                <span className="text-slate-500 italic">Not reported</span>
              )}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Decision Latency</span>
            <span className="font-semibold text-cyan-400">{latencyMs} ms</span>
          </div>
        </div>

        {/* Question Probabilities (if returned by model) */}
        {rawProbabilities && Object.keys(rawProbabilities).length > 0 ? (
          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
              <span>Question Probabilities ({Object.keys(rawProbabilities).length} evaluated)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {Object.entries(rawProbabilities).map(([qid, prob]) => {
                const pct = Math.round((prob as number) * 100);
                const isAffirmative = pct >= 50;
                return (
                  <div
                    key={qid}
                    className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-mono text-slate-300 block">{qid}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {isAffirmative ? "Target: True" : "Target: False"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-mono font-semibold ${
                          isAffirmative ? "text-teal-400" : "text-slate-400"
                        }`}
                      >
                        {pct}%
                      </span>
                      <div className="w-12 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full ${isAffirmative ? "bg-teal-500" : "bg-slate-600"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>
              Per-question probabilities not returned in this model execution. Parsed device actions were directly decoded.
            </span>
          </div>
        )}

        {/* Action Generation & Redundancy Filtering */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-teal-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Generated Actions ({actions.length})
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300">
                Source: LAYA
              </span>
            </div>
            {actions.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No state modifications required by Laya for this intent.
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs font-mono">
                {actions.map((act) => (
                  <li
                    key={act.id}
                    className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                  >
                    <span className="text-slate-300 font-semibold">{act.deviceId}</span>
                    <span className="text-teal-300 font-medium">
                      {act.actionType} {act.value !== undefined ? `(${act.value})` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Skipped Redundant Actions ({skipped.length})
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">
                Non-Redundant Policy
              </span>
            </div>
            {skipped.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No actions were skipped.</p>
            ) : (
              <ul className="space-y-1.5 text-xs font-mono">
                {skipped.map((skip, idx) => (
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
    );
  };

  // ---------------------------------------------------------------------------
  // CONVENTIONAL LLM TAB RENDERER
  // ---------------------------------------------------------------------------
  const renderLLMTab = () => {
    const llmRes = latestMultiEngineResults?.["LLM"];
    const decResult: DecisionResult | undefined = llmRes?.decisionResult;
    const isError = llmRes && !llmRes.success;
    const errorMsg = llmRes && !llmRes.success ? llmRes.error : null;

    if (isError) {
      return (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>Conventional LLM Evaluation Failed</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
            Reason: {errorMsg || "Local Ollama daemon unreachable or returned an error."}
          </p>
          <p className="text-[11px] text-slate-400">
            HomeState was preserved without changes. Verify Ollama is running at{" "}
            <code className="text-cyan-300">http://localhost:11434</code>.
          </p>
        </div>
      );
    }

    if (!decResult) {
      return (
        <div className="py-8 text-center text-slate-500 text-xs space-y-1.5 border border-dashed border-slate-800/80 rounded-xl">
          <Cpu className="w-7 h-7 mx-auto mb-1 text-slate-600" />
          <p className="text-slate-300 font-medium">No Conventional LLM Trace Recorded Yet</p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Execute an intent automation in Section 1 to evaluate via local Ollama generative completion.
          </p>
        </div>
      );
    }

    const latencyMs = decResult.decisionTimeMs ?? 0;
    const actions: Action[] = decResult.actions || [];
    const skipped: string[] = (decResult.metadata?.skippedRedundantActions as string[]) || [];
    const modelName = (decResult.metadata?.model as string) || "llama3.2:latest";
    const decisionSummary = decResult.metadata?.summary as string | undefined;

    return (
      <div className="space-y-4">
        {/* Top Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Model</span>
            <span className="font-semibold text-slate-200">{modelName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Runtime</span>
            <span className="font-semibold text-emerald-300">Ollama Local Daemon</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Confidence</span>
            {/* Strictly "Not provided" - ZERO fabrication */}
            <span className="font-semibold text-slate-400 italic">Not provided</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Generation Latency</span>
            <span className="font-semibold text-cyan-400">{latencyMs} ms</span>
          </div>
        </div>

        {/* Structured Decision Summary (Concise output without exposing chain-of-thought) */}
        {decisionSummary && (
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
              Provider Decision Summary
            </span>
            <p className="text-xs text-slate-200 font-sans leading-relaxed">
              {decisionSummary}
            </p>
          </div>
        )}

        {/* Action Generation & Redundancy Filtering */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Generated Actions ({actions.length})
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                Source: LLM
              </span>
            </div>
            {actions.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No actions generated by the LLM baseline for this intent.
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs font-mono">
                {actions.map((act) => (
                  <li
                    key={act.id}
                    className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                  >
                    <span className="text-slate-300 font-semibold">{act.deviceId}</span>
                    <span className="text-emerald-300 font-medium">
                      {act.actionType} {act.value !== undefined ? `(${act.value})` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Skipped Redundant Actions ({skipped.length})
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">
                Non-Redundant Policy
              </span>
            </div>
            {skipped.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No actions were skipped.</p>
            ) : (
              <ul className="space-y-1.5 text-xs font-mono">
                {skipped.map((skip, idx) => (
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
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-100">
                Multi-Engine Decision Traces & Observability
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live side-by-side inspection of structured decisions, confidence, and action generation across AI engines
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {hasAnyResults && (
            <button
              onClick={clearExecutionTrace}
              className="px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Traces
            </button>
          )}
        </div>
      </div>

      {/* Evaluating Loading State */}
      {activeExecutionState === "EVALUATING" && (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
          <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Cpu className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Evaluating Across Active Decision Engines...</h4>
            <p className="text-xs text-slate-400 mt-1">
              Executing intent on independent state clones with zero cross-engine leakage.
            </p>
          </div>
        </div>
      )}

      {/* Execution Error Banner */}
      {executionError && activeExecutionState === "ERROR" && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>Execution Dispatch Failed</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed font-mono">Reason: {executionError}</p>
        </div>
      )}

      {/* Provider Selector Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          {/* LAYA Tab */}
          <button
            onClick={() => setActiveTab("LAYA")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 border transition ${
              activeTab === "LAYA"
                ? "bg-teal-600/20 border-teal-500/50 text-teal-200 shadow-sm"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-teal-400" />
            <span>Laya (System-1)</span>
            {activeFloorPlanDriver === "LAYA" && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                Driver
              </span>
            )}
          </button>

          {/* LLM Tab */}
          <button
            onClick={() => setActiveTab("LLM")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 border transition ${
              activeTab === "LLM"
                ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-200 shadow-sm"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Conventional LLM</span>
            {activeFloorPlanDriver === "LLM" && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Driver
              </span>
            )}
          </button>
        </div>

        {activeFloorPlanDriver && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span>Floor Plan Driver: <strong>{activeFloorPlanDriver}</strong></span>
          </div>
        )}
      </div>

      {/* Tab Content Display */}
      {activeTab === "LAYA" && renderLayaTab()}
      {activeTab === "LLM" && renderLLMTab()}
    </div>
  );
};
