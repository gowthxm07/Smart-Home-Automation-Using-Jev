import { getEvaluationScenario } from "@/lib/evaluation/dataset";
import { EvaluationScenario } from "@/lib/evaluation/types";

/**
 * Deterministic mapping between UI preset identifiers and frozen benchmark scenario IDs.
 *
 * Grounded in Category A (Normal Intent Scenarios) and Category D (Multi-Device Scenarios)
 * of the frozen 36-scenario benchmark dataset:
 * - GOING_TO_SLEEP -> normal-sleep-01 ("I'm going to sleep.")
 * - LEAVING_HOME   -> normal-leave-01 ("I'm leaving home.")
 * - MOVIE_NIGHT    -> normal-movie-01 ("Movie night.")
 * - WORKING        -> normal-work-01 ("I'm going to work.")
 * - COMING_HOME    -> normal-arrive-01 ("I'm coming home.")
 * - RELAXING       -> multi-relax-01 ("I want to relax.")
 * - WAKING_UP      -> normal-wake-01 ("I'm waking up.")
 */
export const PRESET_TO_BENCHMARK_SCENARIO_MAP: Readonly<Record<string, string>> = Object.freeze({
  GOING_TO_SLEEP: "normal-sleep-01",
  LEAVING_HOME: "normal-leave-01",
  MOVIE_NIGHT: "normal-movie-01",
  WORKING: "normal-work-01",
  COMING_HOME: "normal-arrive-01",
  RELAXING: "multi-relax-01",
  WAKING_UP: "normal-wake-01",
});

/**
 * Resolves a UI preset ID to its corresponding frozen benchmark scenario ID.
 * Returns undefined if the preset has no valid mapping.
 */
export function mapPresetToBenchmarkScenarioId(presetId: string): string | undefined {
  if (!presetId) return undefined;
  return PRESET_TO_BENCHMARK_SCENARIO_MAP[presetId];
}

/**
 * Resolves a UI preset ID to its full EvaluationScenario object from the frozen dataset.
 * Returns undefined if unmapped or not found in the dataset.
 */
export function getBenchmarkScenarioForPreset(presetId: string): EvaluationScenario | undefined {
  const scenarioId = mapPresetToBenchmarkScenarioId(presetId);
  if (!scenarioId) return undefined;
  return getEvaluationScenario(scenarioId);
}
