"use client";

import React, { useState } from "react";
import { useHome } from "@/context/HomeContext";
import { VirtualFloorPlan } from "./VirtualFloorPlan";
import { Bot, Cpu, Layers, Split, Layout } from "lucide-react";

export const DualFloorPlanSection: React.FC = () => {
  const {
    multiEngineHomeState,
    llmOnlyHomeState,
    multiEngineDriver,
    setMultiEngineDriver,
  } = useHome();

  const [viewMode, setViewMode] = useState<"DUAL" | "TABBED">("DUAL");
  const [activeTab, setActiveTab] = useState<"MULTI_ENGINE" | "LLM_ONLY">("MULTI_ENGINE");

  const multiEngineHeaderControls = (
    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
      <span className="text-[10px] uppercase font-mono text-slate-400 px-1 font-semibold">
        View Driver:
      </span>
      <button
        type="button"
        onClick={() => setMultiEngineDriver("LAYA")}
        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
          multiEngineDriver === "LAYA"
            ? "bg-teal-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
        title="Display Laya System-1 state transitions on Multi-Engine floor plan"
      >
        <Bot className="w-3.5 h-3.5" />
        Laya
      </button>
      <button
        type="button"
        onClick={() => setMultiEngineDriver("LLM")}
        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
          multiEngineDriver === "LLM"
            ? "bg-teal-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
        title="Display Conventional LLM state transitions on Multi-Engine floor plan"
      >
        <Cpu className="w-3.5 h-3.5" />
        LLM
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Section Header with View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Comparative Dual-Home Floor Plans
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Same initial state &bull; Independent isolated execution clones &bull; Zero state leakage
          </p>
        </div>

        {/* View Mode Toggle (Side-by-Side vs Tabbed) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("DUAL")}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
              viewMode === "DUAL"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            Side-by-Side View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("TABBED")}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
              viewMode === "TABBED"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            Focused View
          </button>
        </div>
      </div>

      {/* Render Dual Floor Plans */}
      {viewMode === "DUAL" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Multi-Engine Home */}
          <VirtualFloorPlan
            homeState={multiEngineHomeState}
            title="Configuration A — Multi-Engine Home"
            subtitle={`Visualizing ${multiEngineDriver === "LAYA" ? "Laya (System-1)" : "Conventional LLM"} execution clone`}
            badge={
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/30">
                Multi-Engine
              </span>
            }
            headerControls={multiEngineHeaderControls}
          />

          {/* LLM-Only Home */}
          <VirtualFloorPlan
            homeState={llmOnlyHomeState}
            title="Configuration B — LLM-Only Home"
            subtitle="Visualizing standalone conventional LLM execution clone"
            badge={
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                LLM-Only
              </span>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab("MULTI_ENGINE")}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
                activeTab === "MULTI_ENGINE"
                  ? "bg-teal-600/20 text-teal-200 border border-teal-500/40"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              Configuration A: Multi-Engine Home
            </button>
            <button
              onClick={() => setActiveTab("LLM_ONLY")}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
                activeTab === "LLM_ONLY"
                  ? "bg-emerald-600/20 text-emerald-200 border border-emerald-500/40"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              Configuration B: LLM-Only Home
            </button>
          </div>

          {activeTab === "MULTI_ENGINE" ? (
            <VirtualFloorPlan
              homeState={multiEngineHomeState}
              title="Configuration A — Multi-Engine Home"
              subtitle={`Visualizing ${multiEngineDriver === "LAYA" ? "Laya (System-1)" : "Conventional LLM"} execution clone`}
              badge={
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  Multi-Engine
                </span>
              }
              headerControls={multiEngineHeaderControls}
            />
          ) : (
            <VirtualFloorPlan
              homeState={llmOnlyHomeState}
              title="Configuration B — LLM-Only Home"
              subtitle="Visualizing standalone conventional LLM execution clone"
              badge={
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  LLM-Only
                </span>
              }
            />
          )}
        </div>
      )}
    </div>
  );
};
