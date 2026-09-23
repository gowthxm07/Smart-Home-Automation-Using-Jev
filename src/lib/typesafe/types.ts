/**
 * TypeSafe Jev API Schema Definitions.
 * Derived directly from the official OpenAPI 3.1.0 specification (https://api.typesafe.ai/openapi.json).
 *
 * Jev supports structured decision primitives:
 * - Noul: Yes/No decision probability (0 to 1)
 * - Choice: Discrete selection with probabilities across predefined criteria
 * - Score: Expected rating with probability distributions across scored rubric levels
 */

// ============================================================================
// Question Schemas
// ============================================================================

export interface NoulCriteria {
  true?: string | Record<string, unknown> | unknown[] | null;
  false?: string | Record<string, unknown> | unknown[] | null;
}

export interface NoulQuestion {
  type: "noul";
  instructions?: string | Record<string, unknown> | unknown[] | null;
  criteria?: NoulCriteria | null;
}

export interface ChoiceQuestion {
  type: "choice";
  instructions?: string | Record<string, unknown> | unknown[] | null;
  criteria: Record<string, string | Record<string, unknown> | unknown[] | null>;
}

export interface ScoreQuestion {
  type: "score";
  instructions?: string | Record<string, unknown> | unknown[] | null;
  criteria: Array<string | Record<string, unknown> | unknown[]>;
}

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

// ============================================================================
// Answer Schemas
// ============================================================================

export interface NoulAnswer {
  type: "noul";
  /** Probability of yes/true, from 0 to 1. Near 1 = yes/true, near 0 = no/false, near 0.5 = uncertain. */
  noul: number;
}

export interface ChoiceAnswer {
  type: "choice";
  /** The name of the choice with the highest probability. */
  choice: string;
  /** Confidence in the selected choice, from 0 to 1. */
  confidence: number;
  /** Probability of each choice, keyed by choice name, summing to ~1. */
  probabilities: Record<string, number>;
}

export interface ScoreAnswer {
  type: "score";
  /** Expected score: probability-weighted average of the rubric levels. */
  score: number;
  /** Confidence in the score, from 0 to 1. */
  confidence: number;
  /** Rubric criteria mapped to their score levels (e.g. { "0": "low", "1": "medium" }). */
  legend: Record<string, string | Record<string, unknown> | unknown[]>;
  /** Probability of each score level, from 0 to 1. */
  probabilities: Record<string, number>;
}

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

// ============================================================================
// System One Request & Response
// ============================================================================

export interface SystemOneRequest {
  /** The content or state all questions in this request refer to. */
  state: string | Record<string, unknown> | unknown[];
  /** Name or alias of the model to use (e.g. 'jev-latest'). */
  model: string;
  /** Questions to ask about the content, keyed by custom question name. */
  questions: Record<string, Question>;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

export interface SystemOneResponse {
  /** Name of the model that answered the questions. */
  model: string;
  /** Answers keyed by question names supplied in the request. */
  answers: Record<string, Answer>;
  /** Token usage for this evaluation. */
  usage: Usage;
}

// ============================================================================
// Models API
// ============================================================================

export interface ModelMetadata {
  name: string;
  description: string;
  release_date: string;
}

export interface ModelMetadataList {
  models: ModelMetadata[];
}

// ============================================================================
// API Errors
// ============================================================================

export interface ValidationError {
  loc: Array<string | number>;
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface HTTPValidationError {
  detail: ValidationError[];
}

// ============================================================================
// Client Configuration
// ============================================================================

export interface TypeSafeClientConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}
