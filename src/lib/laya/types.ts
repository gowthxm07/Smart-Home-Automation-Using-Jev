/**
 * Type definitions for the Laya Decision Engine integration.
 * Based on Convai Innovations Laya (ModernBERT-large non-autoregressive decision model).
 */

export interface LayaClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
  apiKey?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

export type LayaQuestionType = "noul" | "choice" | "score";

export interface LayaNoulQuestion {
  type: "noul";
  question: string;
}

export interface LayaChoiceQuestion {
  type: "choice";
  question: string;
  options: string[];
}

export interface LayaScoreQuestion {
  type: "score";
  question: string;
  min?: number;
  max?: number;
}

export type LayaQuestion = LayaNoulQuestion | LayaChoiceQuestion | LayaScoreQuestion;

export interface LayaAnswer {
  value: unknown;
  confidence?: number;
  probs?: Record<string, number> | number[];
}

export interface LayaSystemOneRequest {
  state: unknown;
  questions: Record<string, LayaQuestion | Record<string, unknown>>;
  model?: string;
}

export interface LayaSystemOneResponse {
  model: string;
  answers: Record<string, LayaAnswer | unknown>;
  usage?: Record<string, unknown>;
  routing?: Record<string, unknown>;
}

export interface LayaHealthResponse {
  status: string;
  loaded?: string[];
  device?: string;
}

export interface LayaDecisionMetadata {
  provider: "laya";
  model: string;
  runtime: string;
  architecture: string;
  latencyMs: number;
  rawAnswers: Record<string, unknown>;
  appliedActions: unknown[];
  skippedRedundantActions: unknown[];
  occupancyContextPreserved?: boolean;
}
