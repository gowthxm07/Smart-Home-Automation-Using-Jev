"use client";

import React from "react";
import { HomeProvider } from "@/context/HomeContext";
import { Header } from "@/components/layout/Header";
import { IntentSection } from "@/components/intent/IntentSection";
import { VirtualFloorPlan } from "@/components/home/VirtualFloorPlan";
import { ManualOverridePanel } from "@/components/controls/ManualOverridePanel";
import { JevDecisionTracePanel } from "@/components/jev/JevDecisionTracePanel";
import { ActionHistoryPanel } from "@/components/history/ActionHistoryPanel";
import { AlertCircle, ShieldAlert, Cpu, CheckCircle } from "lucide-react";

export default function HomeMindDashboard() {
  return (
    <HomeProvider>
      <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans">
        {/* Top Navigation & Status Bar */}
        <Header />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
          {/* Important System Notice Banner */}
          <div className="rounded-xl p-3.5 bg-blue-950/30 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-blue-300">
                  Software-Only Simulation Environment:
                </span>{" "}
                <span className="text-slate-300">
                  No physical hardware, ESP32, relays, or Arduino boards connected. All 18 smart devices and 5 room contexts operate purely in software.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full bg-purple-500/10 font-mono text-[10px] text-purple-300 border border-purple-500/30 font-semibold">
                Phase 2: Jev Decision Engine Active
              </span>
            </div>
          </div>

          {/* Section 1: User Intent & Scenarios */}
          <IntentSection />

          {/* Section 2: Jev Decision Trace & Observability (Milestone 2.3) */}
          <JevDecisionTracePanel />

          {/* Section 3: Manual Device Overrides */}
          <ManualOverridePanel />

          {/* Section 4: Virtual Smart Home Floor Plan & Device Grid */}
          <VirtualFloorPlan />

          {/* Section 4: Live Action Audit Log */}
          <ActionHistoryPanel />
        </main>

        {/* Engineering Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950/80 px-4 sm:px-8 py-6 mt-12 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-slate-300">HomeMind</span> &bull;
              <span>Context-Aware Multi-Device Smart Home Automation</span>
            </div>
            <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
              <span>Phase 1: Simulation Foundation</span>
              <span>&bull;</span>
              <span>100% Software Simulated</span>
              <span>&bull;</span>
              <span className="text-emerald-500 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Ready for Phase 2
              </span>
            </div>
          </div>
        </footer>
      </div>
    </HomeProvider>
  );
}
