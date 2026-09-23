"use client";

import React from "react";
import { useHome } from "@/context/HomeContext";
import { SimulationClock } from "./SimulationClock";
import { Cpu, ShieldCheck, Activity, Layers, Radio } from "lucide-react";

export const Header: React.FC = () => {
  const { homeState, activeDevicesCount, totalDevicesCount } = useHome();

  return (
    <header className="glass-panel border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30">
              <Cpu className="w-6 h-6" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                HomeMind
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold">
                PHASE 1 FOUNDATION
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal">
              Context-Aware Smart Home Decision Engine &bull; Virtual Simulation Environment
            </p>
          </div>
        </div>

        {/* Status Indicators & Clock */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block leading-none">
                Simulation Env
              </span>
              <span className="text-xs font-semibold text-emerald-400">ONLINE</span>
            </div>
          </div>

          {/* Active Devices Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block leading-none">
                Active Devices
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {activeDevicesCount} <span className="text-slate-500 font-normal">/ {totalDevicesCount}</span>
              </span>
            </div>
          </div>

          {/* Automation Mode Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block leading-none">
                Mode
              </span>
              <span className="text-xs font-semibold text-purple-300">
                {homeState.automationMode.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Simulation Clock */}
          <SimulationClock />
        </div>
      </div>
    </header>
  );
};
