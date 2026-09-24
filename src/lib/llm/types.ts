import { ActionType } from "@/types/action";
import { OllamaClient } from "@/lib/ollama";

/**
 * Individual decision item produced by the conventional LLM.
 */
export interface LLMDecisionItem {
  deviceId: string;
  actionType: ActionType;
  value?: unknown;
}

/**
 * Strict JSON schema format expected from the LLM.
 */
export interface LLMStructuredResponse {
  reasoning?: string;
  decisions: LLMDecisionItem[];
}

/**
 * Provider-facing representation of a device context (isolated from internal simulator metadata).
 */
export interface LLMDeviceContext {
  id: string;
  name: string;
  roomId: string;
  category: string;
  state: Record<string, unknown>;
  capabilities: Record<string, unknown>;
}

/**
 * Provider-facing representation of the relevant smart-home state.
 * Strictly decoupled from evaluation answer keys, expected outcomes, or benchmark labels.
 */
export interface LLMHomeContext {
  simulationTime?: string;
  devices: LLMDeviceContext[];
}

/**
 * Configuration options for LLMDecisionEngine.
 */
export interface LLMDecisionEngineConfig {
  client?: OllamaClient;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  systemPrompt?: string;
}
