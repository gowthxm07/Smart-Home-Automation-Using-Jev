"use client";

import React, { useState } from "react";
import { useHome } from "@/context/HomeContext";
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Bot,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Info,
} from "lucide-react";
import { ConfigurationRun } from "@/lib/evaluation/comparison/dualConfigRunner";

export const DualConfigurationTracePanel: React.FC = () => {
  const {
    dualConfigurationResult,
    activeExecutionState,
    executionError,
    multiEngineDriver,
    setMultiEngineDriver,
  } = useHome();

  // Tab within Configuration A: "LAYA" | "LLM"
  const [configATab, setConfigATab] = useState<"LAYA" | "LLM">("LAYA");

  if (!dualConfigurationResult) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Comparative Dual-Configuration Execution Traces
            </h2>
            <p className="text-xs text-slate-400">
              Side-by-side analysis of Configuration A (Multi-Engine) vs Configuration B (LLM-Only)
            </p>
          </div>
        </div>

        <div className="py-12 text-center text-slate-500 text-xs space-y-2 border border-dashed border-slate-800 rounded-xl">
          <Bot className="w-8 h-8 mx-auto text-slate-600 mb-1" />
          <p className="text-slate-300 font-medium">No Dual-Configuration Execution Recorded Yet</p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Execute a scenario or custom intent in Section 1 to evaluate both configurations on independent state clones.
          </p>
        </div>
      </div>
    );
  }

  const { isControlled, scenarioId, prompt, configurationA, configurationB } = dualConfigurationResult;
  const runA = configATab === "LAYA" ? configurationA.layaRun : configurationA.llmRun;
  const runB = configurationB.llmRun;

  const renderMetricsGrid = (run: ConfigurationRun) => {
    if (isControlled && run.evaluationResult) {
      const metrics = run.evaluationResult.metrics;
      const getVal = (name: string) => metrics.find((m) => m.name === name)?.value ?? 0;
      const stateAcc = Number(getVal("state_accuracy_ratio"));

      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">State Accuracy</span>
            <span className="text-xs font-semibold text-emerald-400">
              {(stateAcc * 100).toFixed(1)}%
            </span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">Matched Required</span>
            <span className="text-xs font-semibold text-blue-400 font-mono">
              {getVal("matched_required_actions_count")}
            </span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">Missed Required</span>
            <span className="text-xs font-semibold text-rose-400 font-mono">
              {getVal("missed_required_actions_count")}
            </span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">Forbidden</span>
            <span className="text-xs font-semibold text-amber-400 font-mono">
              {getVal("forbidden_actions_count")}
            </span>
          </div>
        </div>
      );
    }

    // Free-form prompt: Explicitly show N/A for ground-truth metrics
    return (
      <div className="pt-2 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>
            <strong>Ground-Truth Accuracy:</strong> N/A — Free-form Input (No predefined target state or expected actions).
          </span>
        </div>
      </div>
    );
  };

  const renderRunCard = (run: ConfigurationRun, title: string, isDriver: boolean) => {
    return (
      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 space-y-3 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-100">{run.displayName}</span>
                {isDriver && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    Floor Plan Driver
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Provider: {run.providerId} &bull; Config: {run.configurationId}
              </span>
            </div>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                run.status === "SUCCESS"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : run.status === "UNSUPPORTED"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              }`}
            >
              {run.status}
            </span>
          </div>

          {run.error && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-[11px] text-rose-300 font-mono">
              {run.error}
            </div>
          )}

          {/* Operational Latencies */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
              <span className="text-[9px] uppercase font-mono text-slate-500 block">Decision</span>
              <span className="text-xs font-mono font-semibold text-cyan-400">
                {run.latencyMs.decision} ms
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
              <span className="text-[9px] uppercase font-mono text-slate-500 block">Simulation</span>
              <span className="text-xs font-mono font-semibold text-slate-300">
                {run.latencyMs.simulation} ms
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
              <span className="text-[9px] uppercase font-mono text-slate-500 block">Evaluation</span>
              <span className="text-xs font-mono font-semibold text-slate-300">
                {run.latencyMs.evaluation} ms
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
              <span className="text-[9px] uppercase font-mono text-slate-500 block">Total</span>
              <span className="text-xs font-mono font-semibold text-blue-400">
                {run.latencyMs.total} ms
              </span>
            </div>
          </div>

          {/* Action Counts */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] uppercase font-mono">Executed Actions</span>
                <span className="font-mono text-emerald-400 font-semibold">{run.executedActions.length}</span>
              </div>
              {run.executedActions.length === 0 ? (
                <span className="text-[11px] text-slate-600 italic">No actions executed</span>
              ) : (
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                  {run.executedActions.map((a, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    >
                      {a.actionType} &rarr; {a.deviceId}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] uppercase font-mono">Redundant Filtered</span>
                <span className="font-mono text-amber-400 font-semibold">
                  {run.skippedRedundantActions.length}
                </span>
              </div>
              {run.skippedRedundantActions.length === 0 ? (
                <span className="text-[11px] text-slate-600 italic">0 redundant actions</span>
              ) : (
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                  {run.skippedRedundantActions.map((desc, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    >
                      {desc}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Evaluation Metrics */}
        {renderMetricsGrid(run)}
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Comparative Dual-Configuration Execution
            </h2>
            <p className="text-xs text-slate-400">
              Prompt: <span className="text-slate-200 font-medium">"{prompt}"</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isControlled ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Controlled Scenario: {scenarioId}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              Free-Form Input
            </span>
          )}
        </div>
      </div>

      {/* Side-by-Side Dual Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* COLUMN 1: CONFIGURATION A - MULTI-ENGINE */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-teal-300 uppercase font-mono block">
                Configuration A: Multi-Engine
              </span>
              <span className="text-[11px] text-slate-400">
                Independent concurrent execution of Laya and LLM
              </span>
            </div>

            {/* Inspect Run Switcher within Config A */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setConfigATab("LAYA")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
                  configATab === "LAYA"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Bot className="w-3 h-3" />
                Laya Run
              </button>
              <button
                type="button"
                onClick={() => setConfigATab("LLM")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
                  configATab === "LLM"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Cpu className="w-3 h-3" />
                LLM Run
              </button>
            </div>
          </div>

          {renderRunCard(
            runA,
            "Multi-Engine",
            multiEngineDriver === configATab
          )}
        </div>

        {/* COLUMN 2: CONFIGURATION B - LLM-ONLY */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-emerald-300 uppercase font-mono block">
                Configuration B: LLM-Only
              </span>
              <span className="text-[11px] text-slate-400">
                Standalone conventional LLM baseline on independent clone
              </span>
            </div>

            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
              Standalone Baseline
            </span>
          </div>

          {renderRunCard(runB, "LLM-Only", true)}
        </div>
      </div>

      {/* Methodological Integrity Note */}
      <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
        <Info className="w-4 h-4 text-blue-400 shrink-0" />
        <span>
          <strong>Methodological Principle:</strong> All executions receive identical initial HomeState clones and identical prompts. Zero cross-engine state leakage, zero fallbacks, and zero composite rankings.
        </span>
      </div>
    </div>
  );
};
