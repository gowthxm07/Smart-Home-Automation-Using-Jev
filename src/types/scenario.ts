/**
 * Scenario Presets.
 * IMPORTANT: Scenarios define intent contexts only.
 * They DO NOT contain hardcoded device actions.
 * Dynamic actions will be produced by DecisionEngines (Jev in Phase 2, LLM in Phase 3).
 */

export type ScenarioId =
  | "GOING_TO_SLEEP"
  | "LEAVING_HOME"
  | "MOVIE_NIGHT"
  | "WORKING"
  | "COMING_HOME"
  | "RELAXING"
  | "WAKING_UP";

export interface ScenarioPreset {
  id: ScenarioId;
  name: string;
  intent: string;
  description: string;
  suggestedIcon: string;
}
