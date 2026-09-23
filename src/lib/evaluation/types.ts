import { Action, ActionType } from "@/types/action";
import { DeviceState } from "@/types/device";
import { DecisionResult } from "@/types/engine";
import { HomeState } from "@/types/home";

/**
 * ActionRequirement denotes the expected status of a specific device action.
 * - REQUIRED: The action MUST be produced by the engine.
 * - FORBIDDEN: The action MUST NOT be produced (e.g. hazardous or contradictory actions).
 * - OPTIONAL: The action MAY be produced (acceptable alternative or discretionary behavior).
 */
export type ActionRequirement = "REQUIRED" | "FORBIDDEN" | "OPTIONAL";

/**
 * ExpectedAction defines a single expected atomic action for evaluation.
 * Reuses the existing HomeMind Action vocabulary (deviceId, actionType, value).
 */
export interface ExpectedAction {
  deviceId: string;
  actionType: ActionType;
  expectedValue?: unknown;
  requirement: ActionRequirement;
  description?: string;
}

/**
 * ExpectedDeviceState defines the expected state of a device in the final simulated home.
 * Supports partial state matching (e.g. { power: "OFF" }).
 */
export interface ExpectedDeviceState {
  deviceId: string;
  targetState: Partial<DeviceState>;
  description?: string;
}

/**
 * AcceptableAlternative represents an alternative valid outcome for scenarios
 * where multiple reasonable solutions exist (e.g. AC setpoint 22°C vs 23°C).
 */
export interface AcceptableAlternative {
  id: string;
  description: string;
  alternativeDeviceStates?: Record<string, Partial<DeviceState>>;
  alternativeActions?: ExpectedAction[];
}

/**
 * ExpectedOutcome encapsulates both target device states and expected actions,
 * maintaining a strict distinction between:
 * - Did the system reach the correct state? (targetState)
 * - Did the system generate an unnecessary/redundant action? (expectedActions)
 */
export interface ExpectedOutcome {
  expectedDeviceStates: Record<string, ExpectedDeviceState>;
  expectedActions: ExpectedAction[];
  acceptableAlternatives?: AcceptableAlternative[];
  description?: string;
}

/**
 * EvaluationScenario represents one controlled experimental benchmark case.
 * Provider-neutral: Contains the natural-language intent, the initial HomeState,
 * and the expected outcome specification.
 */
export interface EvaluationScenario {
  id: string;
  name: string;
  description: string;
  intent: string;
  initialState: Readonly<HomeState>;
  expectedOutcome: Readonly<ExpectedOutcome>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * EngineRun encapsulates one provider-neutral execution by an AI Decision Engine.
 * Represents results from JEV, LLM, or future providers identically.
 * Preserves raw provider-specific diagnostics (e.g. JevDecisionTrace, LLM token metrics)
 * in providerMetadata without forcing engines to share internal representations.
 */
export interface EngineRun {
  runId: string;
  engineId: string; // e.g. "JEV", "LLM", or specific model IDs
  scenarioId: string;
  startedAt: string; // ISO 8601
  completedAt: string; // ISO 8601
  latencyMs: number;
  decisionResult: Readonly<DecisionResult>;
  actions: ReadonlyArray<Action>;
  finalState: Readonly<HomeState>;
  error?: string | null;
  providerMetadata?: Record<string, unknown>;
}

/**
 * StateDiscrepancy records a specific mismatch between expected and actual device states.
 */
export interface StateDiscrepancy {
  deviceId: string;
  expected: Partial<DeviceState>;
  actual: DeviceState;
  mismatchedProperties: string[];
}

/**
 * StateComparisonResult provides the detailed outcome of comparing final simulated state
 * against expected target states.
 */
export interface StateComparisonResult {
  totalEvaluatedDevices: number;
  matchedDevices: string[];
  mismatchedDevices: StateDiscrepancy[];
  stateAccuracyRatio: number; // 0.0 to 1.0
}

/**
 * ActionComparisonResult details how the engine's dispatched actions align
 * with expected action specifications.
 */
export interface ActionComparisonResult {
  matchedRequiredActions: Action[];
  missedRequiredActions: ExpectedAction[];
  executedForbiddenActions: Action[];
  executedOptionalActions: Action[];
  unnecessaryActions: Action[];
  redundantActions: Action[]; // Actions executed on devices that were already in target state
}

/**
 * MetricResult represents an independent quantitative measurement.
 * Avoids premature aggregation or subjective weighting.
 */
export interface MetricResult {
  name: string;
  value: number;
  unit?: string;
  description?: string;
}

/**
 * EvaluationResult captures the complete, objective evaluation output.
 * STRICT RESEARCH INTEGRITY RULES:
 * - NO overallScore
 * - NO winner / ranking / betterEngine
 * - Preserves independent multi-dimensional metrics for research analysis.
 */
export interface EvaluationResult {
  scenarioId: string;
  engineId: string;
  runId: string;
  timestamp: string;
  metrics: MetricResult[];
  stateComparison: StateComparisonResult;
  actionComparison: ActionComparisonResult;
  metadata?: Record<string, unknown>;
}

/**
 * EvaluationEngine interface.
 * Decoupled from simulation execution and provider implementations.
 * Pure analysis layer: accepts an immutable Scenario and EngineRun, produces EvaluationResult.
 */
export interface EvaluationEngine {
  readonly id: string;
  readonly name: string;
  evaluate(scenario: Readonly<EvaluationScenario>, run: Readonly<EngineRun>): EvaluationResult;
}
