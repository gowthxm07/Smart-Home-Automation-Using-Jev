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

// Provider-neutral internal question representations
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
  levels?: string[];
}

export type LayaQuestion = LayaNoulQuestion | LayaChoiceQuestion | LayaScoreQuestion;

// Wire-level Laya 0.3.20 question protocol specifications
export interface LayaWireChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: string[] | Record<string, string>;
}

export interface LayaWireNoulQuestion {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
}

export interface LayaWireScoreQuestion {
  type: "score";
  instructions: string;
  criteria?: string[];
}

export type LayaWireQuestion =
  | LayaWireChoiceQuestion
  | LayaWireNoulQuestion
  | LayaWireScoreQuestion;

/**
 * Translates provider-neutral question representations (question, options)
 * into the authoritative Laya 0.3.20 wire protocol (instructions, criteria).
 */
export function toLayaWireQuestion(
  q: LayaQuestion | Record<string, unknown>
): LayaWireQuestion | Record<string, unknown> {
  if (!q || typeof q !== "object") return q;
  const anyQ = q as any;
  const instructions = anyQ.instructions || anyQ.question || "";
  const criteria = anyQ.criteria || anyQ.options;

  if (anyQ.type === "choice") {
    return {
      type: "choice",
      instructions,
      criteria: Array.isArray(criteria) ? criteria : (criteria ? Object.keys(criteria) : []),
    };
  }
  if (anyQ.type === "noul") {
    const res: any = {
      type: "noul",
      instructions,
    };
    if (anyQ.criteria && typeof anyQ.criteria === "object") {
      res.criteria = anyQ.criteria;
    }
    return res;
  }
  if (anyQ.type === "score") {
    return {
      type: "score",
      instructions,
      criteria: anyQ.criteria || anyQ.levels || [],
    };
  }
  return {
    ...anyQ,
    instructions: instructions || anyQ.instructions,
  };
}

/**
 * Translates a complete question dictionary to Laya wire format.
 */
export function toLayaWireQuestions(
  questions: Record<string, LayaQuestion | Record<string, unknown>>
): Record<string, LayaWireQuestion | Record<string, unknown>> {
  const result: Record<string, LayaWireQuestion | Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(questions)) {
    result[k] = toLayaWireQuestion(v);
  }
  return result;
}

export interface LayaAnswer {
  type?: "choice" | "noul" | "score";
  choice?: string;
  noul?: number | boolean;
  score?: number;
  value?: unknown;
  confidence?: number;
  answer_confidence?: number;
  probabilities?: Record<string, number> | number[];
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
  checkpoint?: string;
  repository?: string;
  runtime: string;
  architecture: string;
  latencyMs: number;
  rawAnswers: Record<string, unknown>;
  appliedActions: unknown[];
  skippedRedundantActions: unknown[];
  occupancyContextPreserved?: boolean;
  calibrationWarningReported?: boolean;
}
