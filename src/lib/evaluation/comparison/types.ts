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

/**
 * Supported execution modes for the controlled experiment infrastructure.
 *
 * 1. FULL_COMPARISON: Real Jev + real Ollama LLM. The actual research experiment. Requires both providers.
 * 2. LLM_ONLY_READINESS: Real Ollama LLM only. Pipeline validation and baseline readiness.
 *    STRICT RESEARCH INTEGRITY: NOT a Jev comparison. Contains zero Jev observations or comparative metrics.
 * 3. PREFLIGHT_ONLY: Validates infrastructure without executing either provider.
 */
export type ExperimentMode =
  | "FULL_COMPARISON"
  | "LLM_ONLY_READINESS"
  | "LAYA_ONLY_READINESS"
  | "PREFLIGHT_ONLY";

/**
 * Explicit provider availability status before scenario execution begins.
 *
 * - AVAILABLE: Provider is fully configured, reachable, and operational.
 * - UNAVAILABLE_CONFIGURATION: Required configuration is missing (e.g., TYPESAFE_API_KEY missing).
 *   This is NOT an unsupported scenario and NOT a simulation failure.
 * - UNAVAILABLE_SERVICE: Endpoint is unreachable, network dropped, or daemon not running.
 * - UNSUPPORTED: Scenario workflow is outside the provider's active domain capabilities.
 */
export type ProviderAvailabilityStatus =
  | "AVAILABLE"
  | "UNAVAILABLE_CONFIGURATION"
  | "UNAVAILABLE_SERVICE"
  | "UNSUPPORTED";

/**
 * Diagnostic record of a provider's readiness and configuration state.
 */
export interface ProviderAvailabilityInfo {
  providerId: string;
  engineId: string;
  status: ProviderAvailabilityStatus;
  detail: string;
}

/**
 * Protocol configuration for a controlled empirical experiment.
 */
export interface ExperimentalProtocolConfig {
  mode: ExperimentMode;
  disclaimer?: string;
  datasetVersion: string;
  datasetScenarioCount: number;
  datasetHash: string;
  repetitions: number;
  providerIds: string[];
  providerAvailability?: Record<string, ProviderAvailabilityInfo>;
  jevConfiguration?: {
    engineId: string;
    engineName: string;
    defaultModel: string;
    baseUrl: string;
    timeoutMs: number;
  };
  layaConfiguration?: {
    engineId: string;
    engineName: string;
    model: string;
    baseUrl: string;
    timeoutMs: number;
  };
  llmConfiguration?: {
    engineId: string;
    engineName: string;
    model: string;
    baseUrl: string;
    timeoutMs: number;
    promptVersion: string;
    temperature: number;
    seed?: number;
  };
  timeoutConfiguration: {
    jevTimeoutMs?: number;
    layaTimeoutMs?: number;
    llmTimeoutMs?: number;
    perScenarioTimeoutMs: number;
  };
  executionOrder: string;
  gitCommitHash: string;
  startedAt: string;
}

/**
 * Single repetition observation for a provider on a given scenario.
 */
export interface RepetitionObservation {
  repetition: number;
  providerId: string;
  engineId: string;
  status: ComparativeScenarioStatus;
  unsupportedReason?: string;
  initialStateFingerprint: string;
  decisionResult?: Readonly<DecisionResult>;
  evaluationResult?: EvaluationResult | null;
  finalState?: Readonly<HomeState>;
  timing?: EvaluationTiming;
  proposedActions: ReadonlyArray<unknown>;
  executableActions: ReadonlyArray<Action>;
  skippedRedundantActions: ReadonlyArray<unknown>;
  providerMetadata?: Record<string, unknown>;
  error?: string;
  errorPhase?: "DECISION" | "SIMULATION" | "EVALUATION" | "VALIDATION" | string;
}

/**
 * Results of 5 independent repetitions across all providers for a single scenario.
 */
export interface ControlledScenarioRepetitionResult {
  scenarioId: string;
  scenarioName: string;
  category: string;
  intent: string;
  initialStateFingerprint: string;
  repetitions: Array<{
    repetition: number;
    providers: RepetitionObservation[];
  }>;
}

/**
 * Independent descriptive statistics for a numeric metric distribution.
 */
export interface DescriptiveMetricDistribution {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
}

/**
 * Provider-specific descriptive aggregates without composite scores or rankings.
 */
export interface ProviderDescriptiveAggregates {
  providerId: string;
  engineId: string;
  coverage: {
    totalScenarios: number;
    supportedScenarios: number;
    unsupportedScenarios: number;
    totalRepetitionAttempts: number;
    successfulRuns: number;
    failedRuns: number;
    unsupportedRuns: number;
  };
  actionDistributions: {
    matchedRequiredActions: DescriptiveMetricDistribution;
    missedRequiredActions: DescriptiveMetricDistribution;
    executedForbiddenActions: DescriptiveMetricDistribution;
    executedOptionalActions: DescriptiveMetricDistribution;
    unnecessaryActions: DescriptiveMetricDistribution;
    redundantActions: DescriptiveMetricDistribution;
  };
  stateAccuracyDistribution: DescriptiveMetricDistribution;
  timingDistributions: {
    decisionLatencyMs: DescriptiveMetricDistribution;
    simulationLatencyMs: DescriptiveMetricDistribution;
    evaluationLatencyMs: DescriptiveMetricDistribution;
    totalExecutionLatencyMs: DescriptiveMetricDistribution;
  };
}

/**
 * Full sanitized report of a controlled empirical experiment.
 */
export interface ControlledExperimentReport {
  experimentId: string;
  generatedAt: string;
  mode: ExperimentMode;
  disclaimer?: string;
  protocol: ExperimentalProtocolConfig;
  scenarioResults: ControlledScenarioRepetitionResult[];
  aggregates: ProviderDescriptiveAggregates[];
}

/**
 * Individual pre-flight validation check.
 */
export interface PreFlightCheckItem {
  id: number;
  name: string;
  passed: boolean;
  detail: string;
}

/**
 * Overall pre-flight validation result.
 */
export interface PreFlightValidationResult {
  allPassed: boolean;
  checks: PreFlightCheckItem[];
  providerAvailability: Record<string, ProviderAvailabilityInfo>;
}

/**
 * Options for configuring the controlled experiment runner.
 */
export interface ControlledExperimentOptions extends ComparativeRunnerOptions {
  experimentId?: string;
  mode?: ExperimentMode;
  repetitions?: number;
  outputDir?: string;
  onScenarioProgress?: (scenarioIndex: number, totalScenarios: number, scenarioId: string) => void;
  onRepetitionProgress?: (repetition: number, totalRepetitions: number, providerId: string) => void;
}
