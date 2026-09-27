import React, { useState } from "react";
import { DashboardAnalysisData } from "@/lib/evaluation/analysis/dashboardLoader";
import {
  ShieldCheck,
  GitCommit,
  Hash,
  Clock,
  Layers,
  FileCode,
  Copy,
  Check,
  Terminal,
  BookOpen,
} from "lucide-react";

interface TraceabilitySectionProps {
  data: DashboardAnalysisData;
}

export const TraceabilitySection: React.FC<TraceabilitySectionProps> = ({
  data,
}) => {
  const [copiedSha, setCopiedSha] = useState(false);
  const manifest = data.manifest;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Cryptographic Manifest Overview Card */}
      <div className="rounded-xl glass-card border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Cryptographic Artifact Traceability
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {manifest.analysisId} &bull; v{manifest.analysisVersion}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
            FROZEN BASELINE
          </span>
        </div>

        {/* Dataset SHA-256 Card (Fully Copyable) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-mono text-slate-400 uppercase font-semibold flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-cyan-400" />
              Dataset SHA-256 Digest
            </span>
            <button
              onClick={() => copyToClipboard(manifest.datasetHash)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono transition-colors"
            >
              {copiedSha ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Copy SHA</span>
                </>
              )}
            </button>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-xs text-cyan-300 break-all select-all border border-cyan-500/20">
            {manifest.datasetHash}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Covers 36 frozen benchmark scenarios with identical initial states and ground-truth criteria.
          </span>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase block">
              Git Commit Hash
            </span>
            <div className="flex items-center gap-1.5 text-slate-200">
              <GitCommit className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate">{manifest.gitCommitHash}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase block">
              Generated At
            </span>
            <div className="flex items-center gap-1.5 text-slate-200">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{new Date(manifest.generatedAt).toUTCString()}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase block">
              Dataset Scenarios
            </span>
            <div className="flex items-center gap-1.5 text-slate-200">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>{manifest.datasetScenarioCount} Scenarios (180 runs/provider)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Source Experiments Provenance Table */}
      <div className="rounded-xl glass-card border border-slate-800 p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-slate-400" />
            Source Experiment Provenance
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable research run logs ingested to generate the baseline analysis artifacts.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2 px-3">Provider ID</th>
                <th className="py-2 px-3">Experiment ID</th>
                <th className="py-2 px-3">Normalized Artifact Path</th>
                <th className="py-2 px-3 text-right">Runs Ingested</th>
                <th className="py-2 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {manifest.sourceExperiments.map((exp) => (
                <tr key={exp.experimentId} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        exp.providerId === "LAYA" ? "bg-cyan-400" : "bg-purple-400"
                      }`}
                    />
                    {exp.providerId}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {exp.experimentId}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {exp.directory}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-200 font-semibold">
                    {exp.recordCount}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                      {exp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reproducibility Section */}
      <div className="rounded-xl glass-card border border-slate-800 p-5 space-y-3">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          Deterministic Reproducibility
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          The analysis artifacts powering this dashboard can be deterministically regenerated
          at any time from the frozen benchmark datasets using the baseline analysis pipeline:
        </p>

        <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800 select-all">
          npm run analysis:baseline
        </div>

        <p className="text-[11px] text-slate-500">
          This script validates raw run line counts, verifies uniqueness, computes descriptive statistics,
          and writes the 6 synchronized JSON artifacts to <code className="text-slate-400">artifacts/analysis/</code>.
        </p>
      </div>

      {/* Metric Definitions Glossary */}
      <div className="rounded-xl glass-card border border-slate-800 p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            Empirical Metric Definitions Glossary
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Formal definitions of all recorded evaluation metrics from the analysis manifest.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {Object.entries(manifest.metricDefinitions).map(([key, def]) => (
            <div
              key={key}
              className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1"
            >
              <span className="font-mono text-xs font-semibold text-blue-300 block">
                {key}
              </span>
              <p className="text-slate-400 leading-relaxed font-sans text-[11px]">
                {def}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
