import { EvaluationScenario, EngineRun, EvaluationResult, EvaluationEngine } from "../types";
import { EvaluationTiming } from "../runner";
import { Action } from "@/types/action";
import { DecisionEngine, DecisionResult, ISimulationEngine } from "@/types/engine";
import { HomeState } from "@/types/home";

/**
 * Explicit execution status for each provider in a comparative scenario run.
 *
 * STRICT RESEARCH INTEGRITY:
 * - SUPPORTED_SUCCESS: Genuine provider execution evaluated without simulation or runner errors.
 * - SUPPORTED_FAILURE: Genuine provider execution encountered a simulation error, API failure, or exception.
 * - UNSUPPORTED: Scenario requires a capability/workflow not supported by the provider.
 *   Unsupported scenarios are NEVER converted to failures or evaluated with fabricated actions.
 */
export type ComparativeScenarioStatus =
  | "SUPPORTED_SUCCESS"
  | "SUPPORTED_FAILURE"
  | "UNSUPPORTED";

/**
 * Result of a single provider's execution for a controlled evaluation scenario.
 * Completely provider-neutral: represents Jev, LLM, or any future DecisionEngine.
 */
export interface ProviderComparativeRun {
  providerId: string; // e.g. "JEV", "LLM"
  engineId: string;   // e.g. "jev-typesafe", "llm-ollama"
  status: ComparativeScenarioStatus;
  unsupportedReason?: string;
  run?: EngineRun;
  decisionResult?: Readonly<DecisionResult>;
  evaluationResult?: EvaluationResult | null;
  finalState?: Readonly<HomeState>;
  timing?: EvaluationTiming;
  actions?: ReadonlyArray<Action>;
  error?: string;
  errorPhase?: "DECISION" | "SIMULATION" | "EVALUATION" | "VALIDATION" | string;
  providerMetadata?: Record<string, unknown>;
}

/**
 * Comparative result across all configured providers for a single controlled scenario.
 * Proves identical initial state, identical intent, and provider isolation.
 */
export interface ComparativeScenarioResult {
  scenarioId: string;
  scenarioName: string;
  category: string;
  intent: string;
  initialStateFingerprint: string;
  executedAt: string; // ISO 8601
  providerRuns: ProviderComparativeRun[];
}

/**
 * Configuration entry for registering a decision provider with the comparative runner.
 * Decoupled from concrete provider classes (Strategy Pattern).
 */
export interface ComparativeProviderEntry {
  providerId: string;
  engine: DecisionEngine;
  isScenarioSupported?: (scenario: EvaluationScenario) => boolean;
  getUnsupportedReason?: (scenario: EvaluationScenario) => string;
  metadata?: Record<string, unknown>;
}

/**
 * Reproducibility metadata for a comparative benchmark execution.
 */
export interface ComparativeExperimentMetadata {
  experimentId: string;
  generatedAt: string; // ISO 8601
  gitCommitHash?: string;
  datasetVersion: string;
  nodeVersion: string;
  platform: string;
  totalScenarios: number;
  providers: Array<{
    providerId: string;
    engineId: string;
    engineName: string;
    modelId?: string;
  }>;
}

/**
 * Full comparative benchmark report across all evaluated scenarios.
 *
 * STRICT RESEARCH INTEGRITY:
 * - NO composite scores
 * - NO rankings
 * - NO winner declaration
 * - Preserves independent multi-dimensional metrics
 */
export interface ComparativeBenchmarkReport {
  metadata: ComparativeExperimentMetadata;
  scenarioResults: ComparativeScenarioResult[];
}

/**
 * Options for configuring comparative scenario execution.
 */
export interface ComparativeRunnerOptions {
  evaluator?: EvaluationEngine;
  simulationEngine?: ISimulationEngine;
  datasetVersion?: string;
  gitCommitHash?: string;
}

/**
 * Options for configuring full comparative benchmark execution.
 */
export interface ComparativeBenchmarkOptions extends ComparativeRunnerOptions {
  experimentId?: string;
}
