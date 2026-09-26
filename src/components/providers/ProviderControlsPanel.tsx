"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Key,
  RefreshCw,
  Sliders,
  Shield,
  Zap,
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
  const [providers, setProviders] = useState<ProviderStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local enablement state (default all enabled)
  const [enablement, setEnablement] = useState<Record<string, boolean>>({
    JEV: true,
    LAYA: true,
    LLM: true,
  });

  // Modal for runtime TypeSafe API Key
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keySubmitLoading, setKeySubmitLoading] = useState(false);
  const [keySubmitMessage, setKeySubmitMessage] = useState<string | null>(null);
  const [keySubmitError, setKeySubmitError] = useState<string | null>(null);

  const fetchStatuses = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/providers");
      if (!res.ok) {
        throw new Error(`Failed to fetch provider statuses (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.providers)) {
        setProviders(data.providers);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to contact provider registry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatuses();
  };

  const toggleProvider = (providerId: string) => {
    setEnablement((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }));
  };

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setKeySubmitLoading(true);
    setKeySubmitError(null);
    setKeySubmitMessage(null);

    try {
      const res = await fetch("/api/credentials/typesafe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to set runtime credential.");
      }

      setKeySubmitMessage("TypeSafe API key activated in server RAM! Cleared on restart.");
      setApiKeyInput("");
      setTimeout(() => {
        setIsKeyModalOpen(false);
        setKeySubmitMessage(null);
        fetchStatuses();
      }, 1500);
    } catch (err: unknown) {
      setKeySubmitError((err as Error)?.message || "Credential configuration failed.");
    } finally {
      setKeySubmitLoading(false);
    }
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
              AI Decision Engines & Multi-Provider Platform
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

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-xs text-slate-500 font-mono">
            Probing provider availability...
          </div>
        ) : (
          providers.map((p) => {
            const isEnabled = enablement[p.providerId] ?? true;
            const isAvailable = p.availability.status === "AVAILABLE";
            const canRun = isEnabled && isAvailable;

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

                {/* Footer Actions / Info */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono truncate max-w-[150px]">
                    {p.metadata.model}
                  </span>

                  {p.providerId === "JEV" && p.availability.status === "UNAVAILABLE_CONFIGURATION" && (
                    <button
                      onClick={() => setIsKeyModalOpen(true)}
                      className="px-2 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-medium border border-purple-500/30 flex items-center gap-1 transition"
                    >
                      <Key className="w-3 h-3" />
                      <span>Configure Key</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Explanatory Protocol Footer */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>
            <strong>Multi-Engine Execution Protocol:</strong> Each enabled and available engine receives an independent deep clone of the HomeState with zero cross-engine leakage.
          </span>
        </div>
      </div>

      {/* Secure Runtime API Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400">
                <Shield className="w-5 h-5" />
                <h3 className="font-semibold text-slate-100">Activate TypeSafe Jev API Key</h3>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                Enter your TypeSafe API key below to activate the Jev Decision Engine for this server session.
              </p>
              <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/20 text-[11px] text-purple-200">
                <strong>Strict Security Notice:</strong> The key is sent over a secure server route and stored strictly in server process memory (RAM). It is <strong>never</strong> saved to browser storage, disk, or git, and is cleared upon server restart.
              </div>
            </div>

            <form onSubmit={handleApiKeySubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  TypeSafe API Key
                </label>
                <input
                  type="password"
                  placeholder="Paste your API key here..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {keySubmitError && (
                <div className="p-2 rounded bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20">
                  {keySubmitError}
                </div>
              )}

              {keySubmitMessage && (
                <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{keySubmitMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={keySubmitLoading || !apiKeyInput.trim()}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs disabled:opacity-50 transition"
                >
                  {keySubmitLoading ? "Verifying..." : "Activate in RAM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
