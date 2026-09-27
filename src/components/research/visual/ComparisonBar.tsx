import React from "react";

interface ComparisonBarProps {
  label: string;
  layaValue: number;
  llmValue: number;
  unit?: string;
  formatValue?: (val: number) => string;
  maxValue?: number;
  description?: string;
}

export const ComparisonBar: React.FC<ComparisonBarProps> = ({
  label,
  layaValue,
  llmValue,
  unit = "",
  formatValue,
  maxValue,
  description,
}) => {
  const max =
    maxValue ?? Math.max(layaValue, llmValue, 0.0001);

  const layaPct = Math.min(100, Math.max(0, (layaValue / max) * 100));
  const llmPct = Math.min(100, Math.max(0, (llmValue / max) * 100));

  const format = (v: number) =>
    formatValue ? formatValue(v) : `${v.toLocaleString()}${unit ? ` ${unit}` : ""}`;

  return (
    <div className="space-y-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-300">{label}</span>
        {description && (
          <span className="text-[11px] text-slate-500">{description}</span>
        )}
      </div>

      <div className="space-y-1.5 pt-1">
        {/* LAYA Provider Bar */}
        <div className="space-y-0.5">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
              <span className="font-mono text-cyan-300 font-medium">LAYA</span>
            </div>
            <span className="font-mono font-medium text-slate-200">
              {format(layaValue)}
            </span>
          </div>
          <div
            className="w-full h-2 rounded-full bg-slate-800 overflow-hidden"
            role="progressbar"
            aria-label={`LAYA ${label}: ${format(layaValue)}`}
            aria-valuenow={layaValue}
            aria-valuemin={0}
            aria-valuemax={max}
          >
            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${layaPct}%` }}
            />
          </div>
        </div>

        {/* LLM Provider Bar */}
        <div className="space-y-0.5">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              <span className="font-mono text-purple-300 font-medium">LLM</span>
            </div>
            <span className="font-mono font-medium text-slate-200">
              {format(llmValue)}
            </span>
          </div>
          <div
            className="w-full h-2 rounded-full bg-slate-800 overflow-hidden"
            role="progressbar"
            aria-label={`LLM ${label}: ${format(llmValue)}`}
            aria-valuenow={llmValue}
            aria-valuemin={0}
            aria-valuemax={max}
          >
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-300"
              style={{ width: `${llmPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
