"use client";

import React from "react";
import { Info, X, CheckCircle2, Cpu, ArrowRight } from "lucide-react";

interface PhaseNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  intentText: string;
}

export const PhaseNoticeModal: React.FC<PhaseNoticeModalProps> = ({
  isOpen,
  onClose,
  intentText,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
                Architectural Checkpoint
              </span>
              <h3 className="text-lg font-bold text-white">Decision Engine Ready</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Intent Context Card */}
        <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Received User Intent:</span>
          <p className="text-sm font-medium text-cyan-300 italic">"{intentText || "No intent specified"}"</p>
        </div>

        {/* Phase 1 Status Explanation */}
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 font-medium">
            "Simulation ready — AI decision engine will be connected in a later phase."
          </div>

          <p>
            In accordance with the <strong>Phase 1 Architectural Principles</strong>:
          </p>

          <ul className="space-y-2 text-slate-300 pl-1">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>No Fake AI:</strong> We do not simulate or hallucinate artificial AI decision responses in Phase 1.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>No Hardcoded Automation:</strong> Scenarios do not contain hardcoded device commands.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Provider-Independent Pipeline:</strong> The universal{" "}
                <code className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-blue-300 text-[11px]">
                  DecisionEngine
                </code>{" "}
                interface is ready to plug in:
              </span>
            </li>
          </ul>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1 text-slate-400">
            <div className="text-slate-300">Phase 2: Jev Decision Engine Integration</div>
            <div className="text-slate-300">Phase 3: LLM Baseline Integration</div>
            <div className="text-slate-300">Phase 4: Side-by-Side Jev vs. LLM Comparison</div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
          >
            Acknowledge & Continue Manual Simulation
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
