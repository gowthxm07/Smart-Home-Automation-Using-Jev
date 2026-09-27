import React from "react";

interface PercentileSet {
  min: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

interface PercentileChartProps {
  title: string;
  subtitle?: string;
  layaData: PercentileSet;
  llmData: PercentileSet;
}

export const PercentileChart: React.FC<PercentileChartProps> = ({
  title,
  subtitle,
  layaData,
  llmData,
}) => {
  const overallMax = Math.max(layaData.max, llmData.max, 1000);

  // Helper to convert latency ms to percentage position (0 - 100%)
  const toPct = (val: number) => Math.min(100, Math.max(0, (val / overallMax) * 100));

  const formatMs = (ms: number) => `${Math.round(ms).toLocaleString()} ms`;
  const formatSec = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  return (
    <div className="rounded-xl glass-card border border-slate-800 p-5 space-y-4">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            <span className="font-mono text-cyan-300 font-medium">LAYA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
            <span className="font-mono text-purple-300 font-medium">LLM</span>
          </div>
        </div>
      </div>

      {/* SVG Axis & Percentile Ranges */}
      <div className="pt-2 pb-1 space-y-5">
        {/* Scale Axis */}
        <div className="relative w-full h-4">
          <div className="absolute inset-x-0 top-2 h-px bg-slate-800" />
          <span className="absolute left-0 top-0 text-[10px] font-mono text-slate-500">
            0s
          </span>
          <span className="absolute left-1/4 -translate-x-1/2 top-0 text-[10px] font-mono text-slate-500">
            {formatSec(overallMax * 0.25)}
          </span>
          <span className="absolute left-2/4 -translate-x-1/2 top-0 text-[10px] font-mono text-slate-500">
            {formatSec(overallMax * 0.5)}
          </span>
          <span className="absolute left-3/4 -translate-x-1/2 top-0 text-[10px] font-mono text-slate-500">
            {formatSec(overallMax * 0.75)}
          </span>
          <span className="absolute right-0 top-0 text-[10px] font-mono text-slate-500">
            {formatSec(overallMax)}
          </span>
        </div>

        {/* LAYA Continuum Track */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-mono text-cyan-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              LAYA Range
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Min {formatSec(layaData.min)} &bull; Max {formatSec(layaData.max)}
            </span>
          </div>

          <div className="relative w-full h-7 bg-slate-900/90 rounded-lg border border-cyan-500/20 px-2 py-1">
            {/* Range Span Bar (Min to Max) */}
            <div
              className="absolute top-2.5 h-2 bg-cyan-950/70 border border-cyan-600/40 rounded-full"
              style={{
                left: `${toPct(layaData.min)}%`,
                width: `${Math.max(toPct(layaData.max) - toPct(layaData.min), 1)}%`,
              }}
            />
            {/* P50 Marker */}
            <div
              className="absolute top-1 bottom-1 w-1 bg-cyan-400 rounded-full shadow-sm"
              style={{ left: `${toPct(layaData.p50)}%` }}
              title={`P50: ${formatMs(layaData.p50)}`}
            />
            {/* P75 Marker */}
            <div
              className="absolute top-1.5 bottom-1.5 w-0.5 bg-cyan-300 rounded-full"
              style={{ left: `${toPct(layaData.p75)}%` }}
              title={`P75: ${formatMs(layaData.p75)}`}
            />
            {/* P90 Marker */}
            <div
              className="absolute top-2 bottom-2 w-0.5 bg-cyan-200 rounded-full"
              style={{ left: `${toPct(layaData.p90)}%` }}
              title={`P90: ${formatMs(layaData.p90)}`}
            />
            {/* P99 Marker */}
            <div
              className="absolute top-2.5 bottom-2.5 w-0.5 bg-white rounded-full"
              style={{ left: `${toPct(layaData.p99)}%` }}
              title={`P99: ${formatMs(layaData.p99)}`}
            />
          </div>
        </div>

        {/* LLM Continuum Track */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-mono text-purple-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              LLM Range
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Min {formatSec(llmData.min)} &bull; Max {formatSec(llmData.max)}
            </span>
          </div>

          <div className="relative w-full h-7 bg-slate-900/90 rounded-lg border border-purple-500/20 px-2 py-1">
            {/* Range Span Bar (Min to Max) */}
            <div
              className="absolute top-2.5 h-2 bg-purple-950/70 border border-purple-600/40 rounded-full"
              style={{
                left: `${toPct(llmData.min)}%`,
                width: `${Math.max(toPct(llmData.max) - toPct(llmData.min), 1)}%`,
              }}
            />
            {/* P50 Marker */}
            <div
              className="absolute top-1 bottom-1 w-1 bg-purple-400 rounded-full shadow-sm"
              style={{ left: `${toPct(llmData.p50)}%` }}
              title={`P50: ${formatMs(llmData.p50)}`}
            />
            {/* P75 Marker */}
            <div
              className="absolute top-1.5 bottom-1.5 w-0.5 bg-purple-300 rounded-full"
              style={{ left: `${toPct(llmData.p75)}%` }}
              title={`P75: ${formatMs(llmData.p75)}`}
            />
            {/* P90 Marker */}
            <div
              className="absolute top-2 bottom-2 w-0.5 bg-purple-200 rounded-full"
              style={{ left: `${toPct(llmData.p90)}%` }}
              title={`P90: ${formatMs(llmData.p90)}`}
            />
            {/* P99 Marker */}
            <div
              className="absolute top-2.5 bottom-2.5 w-0.5 bg-white rounded-full"
              style={{ left: `${toPct(llmData.p99)}%` }}
              title={`P99: ${formatMs(llmData.p99)}`}
            />
          </div>
        </div>
      </div>

      {/* Percentiles Reference Table */}
      <div className="overflow-x-auto pt-2">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
              <th className="py-1.5 px-2">Provider</th>
              <th className="py-1.5 px-2">P50 (Median)</th>
              <th className="py-1.5 px-2">P75</th>
              <th className="py-1.5 px-2">P90</th>
              <th className="py-1.5 px-2">P95</th>
              <th className="py-1.5 px-2">P99</th>
              <th className="py-1.5 px-2">Max</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            <tr>
              <td className="py-2 px-2 text-cyan-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                LAYA
              </td>
              <td className="py-2 px-2 text-slate-200">{formatMs(layaData.p50)}</td>
              <td className="py-2 px-2 text-slate-300">{formatMs(layaData.p75)}</td>
              <td className="py-2 px-2 text-slate-300">{formatMs(layaData.p90)}</td>
              <td className="py-2 px-2 text-slate-400">{formatMs(layaData.p95)}</td>
              <td className="py-2 px-2 text-slate-400">{formatMs(layaData.p99)}</td>
              <td className="py-2 px-2 text-slate-400">{formatMs(layaData.max)}</td>
            </tr>
            <tr>
              <td className="py-2 px-2 text-purple-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                LLM
              </td>
              <td className="py-2 px-2 text-slate-200">{formatMs(llmData.p50)}</td>
              <td className="py-2 px-2 text-slate-300">{formatMs(llmData.p75)}</td>
              <td className="py-2 px-2 text-slate-300">{formatMs(llmData.p90)}</td>
              <td className="py-2 px-2 text-slate-400">{formatMs(llmData.p95)}</td>
              <td className="py-2 px-2 text-slate-400">{formatMs(llmData.p99)}</td>
              <td className="py-2 px-2 text-slate-400">{formatMs(llmData.max)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
