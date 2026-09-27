"use client";

import React from "react";
import Link from "next/link";
import { Cpu, Home, ShieldCheck, Layers, Hash } from "lucide-react";

interface ResearchHeaderProps {
  analysisId: string;
  scenarioCount: number;
  datasetHash: string;
}

export const ResearchHeader: React.FC<ResearchHeaderProps> = ({
  analysisId,
  scenarioCount,
  datasetHash,
}) => {
  return (
    <header className="glass-panel border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30">
            <Cpu className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                HomeMind
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold">
                RESEARCH DASHBOARD
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal">
              Controlled Baseline Comparison &bull; LAYA vs. Conventional LLM (llama3.2:3b)
            </p>
          </div>
        </div>

        {/* Dataset Metadata Badges & Return Button */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Scenario Count Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block leading-none">
                Dataset
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {scenarioCount} Scenarios
              </span>
            </div>
          </div>

          {/* SHA-256 Digest Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block leading-none">
                Dataset SHA-256
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-400">
                {datasetHash.substring(0, 10)}...
              </span>
            </div>
          </div>

          {/* Navigation Back to Simulator */}
          <Link
            href="/"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Virtual Home</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
