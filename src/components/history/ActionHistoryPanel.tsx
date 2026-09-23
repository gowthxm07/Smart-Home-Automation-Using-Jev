"use client";

import React, { useState } from "react";
import { useHome } from "@/context/HomeContext";
import { History, Trash2, Filter, User, Cpu, Sparkles, Terminal } from "lucide-react";
import { ActionSource } from "@/types/action";

export const ActionHistoryPanel: React.FC = () => {
  const { homeState, clearActionHistory } = useHome();
  const [sourceFilter, setSourceFilter] = useState<ActionSource | "ALL">("ALL");

  const filteredHistory =
    sourceFilter === "ALL"
      ? homeState.actionHistory
      : homeState.actionHistory.filter((entry) => entry.source === sourceFilter);

  const getSourceBadge = (source: ActionSource) => {
    switch (source) {
      case "MANUAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/25">
            <User className="w-3 h-3" />
            MANUAL
          </span>
        );
      case "JEV":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/25">
            <Sparkles className="w-3 h-3" />
            JEV
          </span>
        );
      case "LLM":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <Cpu className="w-3 h-3" />
            LLM
          </span>
        );
      case "SYSTEM":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-700/50 text-slate-300 border border-slate-600">
            <Terminal className="w-3 h-3" />
            SYSTEM
          </span>
        );
    }
  };

  const formatTimestamp = (isoOrFormatted: string) => {
    try {
      const d = new Date(isoOrFormatted);
      if (isNaN(d.getTime())) return isoOrFormatted;
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return isoOrFormatted;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Action Audit History
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {filteredHistory.length} events
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Audit log of state transitions (supports MANUAL now, JEV & LLM in later phases)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
            {(["ALL", "MANUAL", "JEV", "LLM"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  sourceFilter === s
                    ? "bg-slate-700 text-white font-medium"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Clear */}
          {homeState.actionHistory.length > 0 && (
            <button
              onClick={clearActionHistory}
              title="Clear Action History"
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* History Stream List */}
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {filteredHistory.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs space-y-1">
            <History className="w-6 h-6 mx-auto mb-2 opacity-40 text-slate-400" />
            <p>No actions recorded yet.</p>
            <p className="text-[11px] text-slate-600">
              Interact with devices or manual overrides to log simulated events.
            </p>
          </div>
        ) : (
          filteredHistory.map((entry) => (
            <div
              key={entry.id}
              className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/80 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                  {formatTimestamp(entry.timestamp)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">{entry.deviceName}</span>
                  <span className="text-[10px] text-slate-500 uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800">
                    {entry.roomId}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0">
                <span className="text-xs font-mono text-cyan-300 font-medium">{entry.summary}</span>
                {getSourceBadge(entry.source)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
