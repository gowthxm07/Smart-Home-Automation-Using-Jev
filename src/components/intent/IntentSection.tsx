"use client";

import React from "react";
import { useHome } from "@/context/HomeContext";
import { PREDEFINED_SCENARIOS } from "@/lib/scenarios.config";
import { ScenarioPreset } from "@/types/scenario";
import {
  Sparkles,
  Send,
  Moon,
  LogOut,
  Film,
  Briefcase,
  Home,
  Coffee,
  Sun,
  AlertCircle,
  Cpu,
} from "lucide-react";

export const IntentSection: React.FC = () => {
  const {
    homeState,
    selectScenario,
    setIntentText,
    runIntentAutomation,
    activeExecutionState,
    executableProvidersCount,
    executionError,
    providersLoading,
  } = useHome();

  const getScenarioIcon = (iconName: string) => {
    switch (iconName) {
      case "Moon":
        return <Moon className="w-3.5 h-3.5" />;
      case "LogOut":
        return <LogOut className="w-3.5 h-3.5" />;
      case "Film":
        return <Film className="w-3.5 h-3.5" />;
      case "Briefcase":
        return <Briefcase className="w-3.5 h-3.5" />;
      case "Home":
        return <Home className="w-3.5 h-3.5" />;
      case "Coffee":
        return <Coffee className="w-3.5 h-3.5" />;
      case "Sun":
        return <Sun className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !homeState.currentIntentText.trim() ||
      activeExecutionState === "EVALUATING" ||
      executableProvidersCount === 0 ||
      providersLoading
    ) {
      return;
    }
    runIntentAutomation();
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">User Intent & Comparative Automation</h2>
            <p className="text-xs text-slate-400">
              Evaluates across Configuration A (Multi-Engine) and Configuration B (LLM-Only) on independent state clones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span>
            {providersLoading
              ? "Verifying engines..."
              : executableProvidersCount > 0
              ? `${executableProvidersCount} engine${executableProvidersCount > 1 ? "s" : ""} active \u2022 Provider-neutral dispatch`
              : "0 engines active \u2022 Configuration required"}
          </span>
        </div>
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="What would you like to do? (e.g. 'I am going to sleep', 'Movie night')..."
            value={homeState.currentIntentText}
            onChange={(e) => setIntentText(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
          />
        </div>

        <button
          type="submit"
          disabled={
            activeExecutionState === "EVALUATING" ||
            !homeState.currentIntentText.trim() ||
            executableProvidersCount === 0 ||
            providersLoading
          }
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-600/25 transition whitespace-nowrap"
        >
          {activeExecutionState === "EVALUATING" ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-blue-200" />
              <span>Evaluating Dual Configurations...</span>
            </>
          ) : executableProvidersCount === 0 && !providersLoading ? (
            <>
              <AlertCircle className="w-4 h-4 text-amber-300" />
              <span>No Available Engines</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Process Intent</span>
            </>
          )}
        </button>
      </form>

      {/* Execution Error Banner */}
      {executionError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{executionError}</span>
        </div>
      )}

      {/* No Available Engines Warning */}
      {executableProvidersCount === 0 && !providersLoading && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            No AI decision engines are currently executable. Enable at least one engine and verify live availability above.
          </span>
        </div>
      )}

      {/* Predefined Scenario Buttons */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
          Preset Scenarios:
        </span>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_SCENARIOS.map((scenario) => {
            const isSelected = homeState.currentScenario?.id === scenario.id;
            return (
              <button
                key={scenario.id}
                onClick={() => selectScenario(scenario)}
                title={scenario.description}
                className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${
                  isSelected
                    ? "bg-purple-600/20 border-purple-500/60 text-purple-200 shadow-md shadow-purple-500/10 scale-102"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700 hover:text-white"
                }`}
              >
                <span className={isSelected ? "text-purple-400" : "text-slate-400"}>
                  {getScenarioIcon(scenario.suggestedIcon)}
                </span>
                <span>{scenario.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Scenario Preview Card */}
      {homeState.currentScenario && (
        <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 mt-0.5">
            {getScenarioIcon(homeState.currentScenario.suggestedIcon)}
          </div>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-purple-200">
                Active Context: {homeState.currentScenario.name}
              </span>
              {homeState.currentScenario.benchmarkScenarioId && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Controlled Scenario: {homeState.currentScenario.benchmarkScenarioId}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {homeState.currentScenario.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
