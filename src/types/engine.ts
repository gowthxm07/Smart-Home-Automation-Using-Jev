import { Action, ActionLogEntry, ActionSource } from "./action";
import { HomeState } from "./home";

/**
 * Result returned by an AI Decision Engine (Jev in Phase 2 or LLM in Phase 3).
 * Decoupled from the simulation execution.
 */
export interface DecisionResult {
  engineId: string;
  source: ActionSource; // 'JEV' | 'LLM' | 'MANUAL' | 'SYSTEM'
  intent: string;
  actions: Action[];
  confidence?: number; // 0.0 - 1.0 confidence score
  reasoning?: string; // Natural language justification or chain of thought
  decisionTimeMs?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Universal Decision Engine Interface.
 * Implemented by JevDecisionEngine in Phase 2 and LLMDecisionEngine in Phase 3.
 * Neither is implemented in Phase 1.
 */
export interface DecisionEngine {
  readonly id: string;
  readonly name: string;
  readonly provider: "JEV" | "LLM";
  evaluate(intent: string, homeState: HomeState): Promise<DecisionResult>;
}

/**
 * Result returned by the deterministic Simulation Engine upon applying an action.
 */
export interface SimulationResult {
  success: boolean;
  newState: HomeState;
  error?: string;
  logEntry?: ActionLogEntry;
}

/**
 * Simulation Engine Interface.
 * Responsible for validating requested actions against device capabilities
 * and updating the virtual home state deterministically.
 */
export interface ISimulationEngine {
  applyAction(action: Action, currentState: HomeState): SimulationResult;
  applyBatchActions(actions: Action[], currentState: HomeState): {
    finalState: HomeState;
    results: SimulationResult[];
  };
}
