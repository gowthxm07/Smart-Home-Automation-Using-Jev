import React from "react";
import { DescriptiveStatistics } from "@/lib/evaluation/analysis/types";

interface MetricStatTileProps {
  title: string;
  definition?: string;
  unit?: "ms" | "%" | "count" | "";
  layaStats?: DescriptiveStatistics;
  llmStats?: DescriptiveStatistics;
  digits?: number;
}

export const MetricStatTile: React.FC<MetricStatTileProps> = ({
  title,
  definition,
  unit = "count",
  layaStats,
  llmStats,
  digits = 2,
}) => {
  const formatVal = (val: number | undefined): string => {
    if (val === undefined || isNaN(val)) return "—";
    if (unit === "%") {
      return `${(val * 100).toFixed(digits)}%`;
    }
    if (unit === "ms") {
      return `${val.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })} ms`;
    }
    return val.toLocaleString(undefined, {
      minimumFractionDigits: Number.isInteger(val) ? 0 : digits,
      maximumFractionDigits: digits,
    });
  };

  return (
    <div className="rounded-xl glass-card border border-slate-800 p-4 space-y-3">
      {/* Tile Header */}
      <div>
        <h4 className="text-sm font-semibold text-slate-200 tracking-tight">
          {title}
        </h4>
        {definition && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            {definition}
          </p>
        )}
      </div>

      {/* Side-by-Side Statistics Grid */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* LAYA Column */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-cyan-500/20 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-mono text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              LAYA
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              N = {layaStats?.count ?? "—"}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Mean:</span>
              <span className="font-mono font-medium text-slate-200">
                {formatVal(layaStats?.mean)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Median:</span>
              <span className="font-mono font-medium text-slate-200">
                {formatVal(layaStats?.median)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">StdDev:</span>
              <span className="font-mono text-slate-300">
                {formatVal(layaStats?.standardDeviation)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-0.5 border-t border-slate-800/60">
              <span>Range:</span>
              <span className="font-mono">
                {formatVal(layaStats?.min)} – {formatVal(layaStats?.max)}
              </span>
            </div>
          </div>
        </div>

        {/* LLM Column */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-purple-500/20 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-mono text-xs font-semibold text-purple-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              LLM
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              N = {llmStats?.count ?? "—"}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Mean:</span>
              <span className="font-mono font-medium text-slate-200">
                {formatVal(llmStats?.mean)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Median:</span>
              <span className="font-mono font-medium text-slate-200">
                {formatVal(llmStats?.median)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">StdDev:</span>
              <span className="font-mono text-slate-300">
                {formatVal(llmStats?.standardDeviation)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-0.5 border-t border-slate-800/60">
              <span>Range:</span>
              <span className="font-mono">
                {formatVal(llmStats?.min)} – {formatVal(llmStats?.max)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
