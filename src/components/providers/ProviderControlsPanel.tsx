"use client";

import React, { useState } from "react";
import { useHome } from "@/context/HomeContext";
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Info,
} from "lucide-react";

export interface ProviderStatusItem {
  providerId: string;
  engineId: string;
  displayName: string;
  enabled: boolean;
  canExecute: boolean;
  statusExplanation: string;
  availability: {
    status: "AVAILABLE" | "UNAVAILABLE_CONFIGURATION" | "UNAVAILABLE_SERVICE" | "UNSUPPORTED";
    detail: string;
  };
  metadata: {
    model: string;
    runtime: string;
    architecture?: string;
    endpoint?: string;
    isLocal: boolean;
    description: string;
  };
}

export const ProviderControlsPanel: React.FC = () => {
  const {
    providers,
    providerEnablement,
    toggleProvider,
    fetchProviderStatuses,
    providersLoading: loading,
    providersError: error,
    primaryFloorPlanEngine,
    setPrimaryFloorPlanEngine,
  } = useHome();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProviderStatuses();
    setRefreshing(false);
  };

  const renderStatusBadge = (status: string, isEnabled: boolean) => {
    if (!isEnabled) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
          Disabled
        </span>
      );
    }

    switch (status) {
      case "AVAILABLE":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Available
          </span>
        );
      case "UNAVAILABLE_CONFIGURATION":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Config Required
          </span>
        );
      case "UNAVAILABLE_SERVICE":
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Unavailable
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              AI Decision Engines & Dual-Engine Platform
            </h2>
            <p className="text-xs text-slate-400">
              Provider-neutral orchestration: evaluates user intents across enabled & verified available engines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition"
            title="Refresh live provider reachability"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Verify Live</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Provider Cards Grid - Balanced 2-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-8 text-center text-xs text-slate-500 font-mono">
            Probing provider availability...
          </div>
        ) : (
          (() => {
            const firstExecutableId = providers.find((pr) => {
              const isEn = providerEnablement[pr.providerId] ?? pr.enabled;
              const isAv = pr.availability?.status === "AVAILABLE";
              return isEn && isAv;
            })?.providerId;

            return providers.map((p) => {
              const isEnabled = providerEnablement[p.providerId] ?? p.enabled;
              const isAvailable = p.availability.status === "AVAILABLE";
              const canRun = isEnabled && isAvailable;
              const isSelectedDriver = primaryFloorPlanEngine === p.providerId;
              const isDefaultDriver = !primaryFloorPlanEngine && p.providerId === firstExecutableId;

              return (
                <div
                  key={p.providerId}
                  className={`rounded-xl p-4 border transition flex flex-col justify-between space-y-3 ${
                    canRun
                      ? "bg-slate-900/80 border-slate-700/80 shadow-sm"
                      : isEnabled
                      ? "bg-slate-950/60 border-amber-900/40"
                      : "bg-slate-950/40 border-slate-800/60 opacity-60"
                  }`}
                >
                  <div>
                    {/* Top Bar: Title & Toggle */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-slate-100">{p.displayName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {p.metadata.architecture || p.engineId}
                        </span>
                      </div>

                      {/* Enable / Disable Switch */}
                      <button
                        type="button"
                        onClick={() => toggleProvider(p.providerId)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEnabled ? "bg-blue-600" : "bg-slate-700"
                        }`}
                        role="switch"
                        aria-checked={isEnabled}
                        title={isEnabled ? "Disable engine" : "Enable engine"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-2.5 flex items-center justify-between">
                      {renderStatusBadge(p.availability.status, isEnabled)}
                      <span className="text-[10px] font-mono text-slate-500">
                        {p.metadata.isLocal ? "Local Self-Hosted" : "Cloud API"}
                      </span>
                    </div>

                    {/* Explanation / Detail */}
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed line-clamp-2" title={p.availability.detail}>
                      {p.availability.detail}
                    </p>
                  </div>

                  {/* Floor-Plan Driver Selector */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] uppercase font-mono text-slate-400">
                      Floor Plan:
                    </span>
                    {isSelectedDriver ? (
                      canRun ? (
                        <button
                          type="button"
                          onClick={() => setPrimaryFloorPlanEngine(null)}
                          className="px-2.5 py-1 rounded-lg font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1 shadow-sm transition"
                          title="Currently designated as Floor Plan Driver (click to reset to default)"
                        >
                          <CheckCircle2 className="w-3 h-3 text-blue-400" />
                          <span>Floor Plan Driver</span>
                        </button>
                      ) : (
                        <div
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1"
                          title="Selected driver is currently unavailable. Backend falls back to first available engine."
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Driver Unavailable</span>
                        </div>
                      )
                    ) : isDefaultDriver && canRun ? (
                      <button
                        type="button"
                        onClick={() => setPrimaryFloorPlanEngine(p.providerId)}
                        className="px-2 py-1 rounded-lg font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-blue-500/40 flex items-center gap-1 transition"
                        title="Default driver based on execution order. Click to explicitly designate."
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        <span>Floor Plan Driver (Default)</span>
                      </button>
                    ) : canRun ? (
                      <button
                        type="button"
                        onClick={() => setPrimaryFloorPlanEngine(p.providerId)}
                        className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition"
                        title="Click to designate this engine as the Floor Plan Driver"
                      >
                        <span>Use for Floor Plan</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono italic">
                        Unavailable
                      </span>
                    )}
                  </div>

                  {/* Footer Info */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono truncate max-w-[200px]">
                      {p.metadata.model}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">
                      {p.metadata.runtime}
                    </span>
                  </div>
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Explanatory Protocol Footer */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>
            <strong>Dual-Engine Execution Protocol:</strong> Each enabled and available engine receives an independent deep clone of the HomeState with zero cross-engine leakage.
          </span>
        </div>
      </div>
    </div>
  );
};
