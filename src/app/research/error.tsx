"use client";

import React from "react";
import Link from "next/link";
import { AlertOctagon, RotateCcw, Home, FileQuestion } from "lucide-react";

export default function ResearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Strip any accidental filesystem path leaks
  const safeMessage = (error.message || "Failed to load research baseline data.")
    .replace(/[a-zA-Z]:\\[^"'\s]*/g, "[path]")
    .replace(/\/[\w.-]+(\/[\w.-]+)+/g, "[path]");

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full glass-panel rounded-2xl border border-red-500/20 p-8 shadow-2xl space-y-6">
        {/* Error Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Research Analysis Artifacts Unavailable
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              HomeMind Baseline Verification Failure
            </p>
          </div>
        </div>

        {/* Diagnostic Explanation */}
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-300">
            <FileQuestion className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              The Research Comparison Dashboard requires verified baseline analysis
              artifacts from the frozen benchmark dataset. Data could not be loaded
              or verified against expected integrity constraints.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Error Detail:
            </span>
            <p className="text-xs font-mono text-red-300 bg-red-950/30 rounded-lg p-2.5 border border-red-900/40 break-words">
              {safeMessage}
            </p>
          </div>
        </div>

        {/* Research Policy Notice */}
        <div className="text-[11px] text-slate-400 border-l-2 border-slate-700 pl-3 py-1">
          <span className="text-slate-300 font-semibold">Integrity Policy:</span>{" "}
          HomeMind never substitutes synthetic, empty, or fallback research values.
          Baseline analysis must be generated and cryptographically verified prior to display.
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Loading
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-blue-600/20"
          >
            <Home className="w-4 h-4" />
            Return to Simulator
          </Link>
        </div>
      </div>
    </div>
  );
}
