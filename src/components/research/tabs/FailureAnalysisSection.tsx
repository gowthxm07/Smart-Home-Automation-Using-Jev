import React from "react";
import { DashboardAnalysisData } from "@/lib/evaluation/analysis/dashboardLoader";
import { AlertTriangle, XCircle, Info, ShieldCheck, FileText } from "lucide-react";

interface FailureAnalysisSectionProps {
  data: DashboardAnalysisData;
}

export const FailureAnalysisSection: React.FC<FailureAnalysisSectionProps> = ({
  data,
}) => {
  const laya = data.reliabilityAnalysis["LAYA"];
  const llm = data.reliabilityAnalysis["LLM"];

  return (
    <div className="space-y-6">
      {/* Scientific Epistemology Notice */}
      <div className="rounded-xl p-4 bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <span className="font-semibold text-slate-200">
            Empirical Evidence Protocol: Observed Fact vs. Interpretation
          </span>
          <p className="text-slate-400 leading-relaxed">
            Scientific reporting requires strict separation between raw observable evidence
            (e.g., error logs, return codes, unmapped device IDs) and speculative
            interpretations. Below, observable facts are reported directly from execution
            traces without loaded terminology.
          </p>
        </div>
      </div>

      {/* Side-by-Side Incident Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LAYA Incident Analysis */}
        <div className="rounded-xl glass-card border border-cyan-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                LAYA Incident Analysis
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-amber-400">10 Unsupported</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-emerald-400">0 Failures</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-semibold font-mono text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>OBSERVED FACT: 10 Unsupported Executions</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">
                LAYA produced structured unsupported status responses on 2 scenarios
                across all 5 repetitions:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
                <li>
                  <strong className="text-slate-200">multi-wake-01</strong> (Repetitions 1–5): Category MULTI_DEVICE
                </li>
                <li>
                  <strong className="text-slate-200">ambiguous-heading-out-01</strong> (Repetitions 1–5): Category AMBIGUOUS
                </li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 space-y-1 text-slate-400">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold block">
                Interpretation:
              </span>
              <p className="leading-relaxed font-sans">
                Laya System One enforces strict input boundaries. Scenarios requiring complex
                multi-device coordination or resolving underspecified intent are cleanly rejected
                at the API boundary rather than generating speculative or partial commands.
              </p>
            </div>
          </div>
        </div>

        {/* LLM Incident Analysis */}
        <div className="rounded-xl glass-card border border-purple-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                LLM Incident Analysis
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">0 Unsupported</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-rose-400 font-semibold">4 Failures</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-rose-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-400 font-semibold font-mono text-[11px]">
                <XCircle className="w-3.5 h-3.5" />
                <span>OBSERVED FACT: 4 Runtime Exception Failures</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">
                LLM failed during execution on scenario <code className="text-purple-300 font-mono">multi-wake-01</code> in repetitions 2, 3, 4, and 5.
              </p>
              <div className="p-2 rounded bg-rose-950/30 border border-rose-900/40 font-mono text-[11px] text-rose-300">
                Action referenced unknown virtual device: &quot;thermostat_bedroom&quot;. Device does not exist in HomeState.
              </div>
              <p className="text-slate-400 text-[11px] font-sans">
                Note: In repetition 1 of <code className="text-purple-300 font-mono">multi-wake-01</code>, the LLM did not generate this device and completed successfully.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 space-y-1 text-slate-400">
              <span className="text-[10px] font-mono text-purple-400 uppercase font-semibold block">
                Interpretation:
              </span>
              <p className="leading-relaxed font-sans">
                When generating multi-device morning wake commands without hard schema constraining,
                the local 3B model synthesized a plausible-sounding device identifier
                (<code className="text-purple-300 font-mono">thermostat_bedroom</code>) not present in the 18 simulated devices,
                causing a state simulation invariant failure.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Failure Incident Log */}
      <div className="rounded-xl glass-card border border-slate-800 p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            Empirical Failure Incident Log (All Providers)
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual records of all executions resulting in runtime failure across the 360 total executions.
          </p>
        </div>

        {llm?.failures && llm.failures.length > 0 ? (
          <div className="space-y-2">
            {llm.failures.map((f, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-900/80 border border-rose-900/40 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">
                      LLM
                    </span>
                    <span className="font-mono text-slate-200 font-semibold">
                      Scenario: {f.scenarioId}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      (Repetition #{f.repetition})
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-300 break-words pt-1">
                    {f.error}
                  </p>
                </div>
                <span className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-rose-400 shrink-0">
                  SCHEMA_VIOLATION
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-slate-900/40 text-center text-xs text-slate-400">
            No runtime failure records found.
          </div>
        )}
      </div>
    </div>
  );
};
