import { DecisionEngine } from "@/types/engine";
import { EvaluationScenario } from "@/lib/evaluation/types";
import { ProviderAvailabilityInfo, ProviderAvailabilityStatus } from "@/lib/evaluation/comparison/types";

export type ProviderId = "JEV" | "LAYA" | "LLM" | string;

export type ProviderEnablementMap = Record<string, boolean>;

export interface ProviderModelMetadata {
  model: string;
  runtime: string;
  architecture?: string;
  endpoint?: string;
  isLocal: boolean;
  description: string;
}

/**
 * Generic provider registration descriptor.
 * Decoupled from hardcoded switch/if statements.
 */
export interface ProviderRegistration {
  providerId: ProviderId;
  engineId: string;
  displayName: string;
  engine: DecisionEngine;
  modelMetadata: ProviderModelMetadata;
  checkAvailability(): Promise<ProviderAvailabilityInfo>;
  isScenarioSupported(scenario: EvaluationScenario): boolean;
  getUnsupportedReason?(scenario: EvaluationScenario): string;
}

/**
 * Detailed runtime state of a provider combining user enablement and verified availability.
 */
export interface ProviderRuntimeStatus {
  providerId: ProviderId;
  engineId: string;
  displayName: string;
  enabled: boolean;
  availability: ProviderAvailabilityInfo;
  canExecute: boolean; // Strictly: enabled && availability.status === "AVAILABLE"
  statusExplanation: string;
  metadata: ProviderModelMetadata;
}
