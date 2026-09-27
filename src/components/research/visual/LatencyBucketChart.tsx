import React from "react";

interface LatencyBucketChartProps {
  layaBuckets: Record<string, { count: number; percentage: number }>;
  llmBuckets: Record<string, { count: number; percentage: number }>;
}

export const LatencyBucketChart: React.FC<LatencyBucketChartProps> = ({
  layaBuckets,
  llmBuckets,
}) => {
  const bucketKeys = [
    "< 20s",
    "20s - 30s",
    "30s - 45s",
    "45s - 60s",
    "60s - 90s",
    "90s - 120s",
    "120s - 150s",
    "150s - 180s",
    "> 180s",
  ];

  // Determine max count for scaling bar widths
  let maxCount = 1;
  for (const key of bucketKeys) {
    const lCount = layaBuckets?.[key]?.count ?? 0;
    const llCount = llmBuckets?.[key]?.count ?? 0;
    if (lCount > maxCount) maxCount = lCount;
    if (llCount > maxCount) maxCount = llCount;
  }

  return (
    <div className="rounded-xl glass-card border border-slate-800 p-5 space-y-4">
      {/* Chart Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-200">
            Decision Latency Distribution
          </h4>
          <p className="text-xs text-slate-400">
            Distribution across 9 empirical execution time windows (N = 170 LAYA, 176 LLM evaluated runs)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500 inline-block" />
            <span className="font-mono text-cyan-300 font-medium">LAYA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-500 inline-block" />
            <span className="font-mono text-purple-300 font-medium">LLM</span>
          </div>
        </div>
      </div>

      {/* SVG-based Bar Chart */}
      <div className="space-y-3 pt-1">
        {bucketKeys.map((bucket) => {
          const laya = layaBuckets?.[bucket] ?? { count: 0, percentage: 0 };
          const llm = llmBuckets?.[bucket] ?? { count: 0, percentage: 0 };

          const layaPctWidth = (laya.count / maxCount) * 100;
          const llmPctWidth = (llm.count / maxCount) * 100;

          return (
            <div key={bucket} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-slate-300 font-medium w-24 shrink-0">
                  {bucket}
                </span>
                <div className="flex items-center gap-4 text-[11px] font-mono">
                  <span className="text-cyan-400">
                    LAYA: {laya.count} ({laya.percentage}%)
                  </span>
                  <span className="text-purple-400">
                    LLM: {llm.count} ({llm.percentage}%)
                  </span>
                </div>
              </div>

              {/* Dual SVG Bar Container */}
              <div className="w-full bg-slate-900/90 rounded-md p-1.5 border border-slate-800/80 space-y-1">
                {/* LAYA Bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-cyan-400/80 w-8 text-right shrink-0">
                    LAYA
                  </span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-sm transition-all duration-300"
                      style={{ width: `${Math.max(layaPctWidth, laya.count > 0 ? 1 : 0)}%` }}
                      role="progressbar"
                      aria-label={`LAYA ${bucket}: ${laya.count} executions (${laya.percentage}%)`}
                      aria-valuenow={laya.count}
                      aria-valuemin={0}
                      aria-valuemax={maxCount}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 w-10 text-right shrink-0">
                    {laya.count}
                  </span>
                </div>

                {/* LLM Bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-purple-400/80 w-8 text-right shrink-0">
                    LLM
                  </span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-sm transition-all duration-300"
                      style={{ width: `${Math.max(llmPctWidth, llm.count > 0 ? 1 : 0)}%` }}
                      role="progressbar"
                      aria-label={`LLM ${bucket}: ${llm.count} executions (${llm.percentage}%)`}
                      aria-valuenow={llm.count}
                      aria-valuemin={0}
                      aria-valuemax={maxCount}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 w-10 text-right shrink-0">
                    {llm.count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
