import { Answer, ChoiceAnswer, NoulAnswer, ScoreAnswer } from "@/lib/typesafe/types";

/**
 * Represents a single structured decision made by Jev.
 * Retains complete probability distribution, confidence, question, and answer
 * for academic research, evaluation, and future comparison against LLMs.
 */
export interface JevDecisionTraceItem {
  questionId: string;
  questionType: "noul" | "choice" | "score";
  instructions: string;
  rawAnswer: Answer;
  // Normalized decision values for easy policy inspection
  affirmative?: boolean; // For noul: true if noul >= 0.5
  selectedChoice?: string; // For choice: name of selected option
  score?: number; // For score: expected rating
  confidence: number; // 0.0 to 1.0
  probability?: number; // Primary probability (e.g. noul probability or chosen choice probability)
  probabilities?: Record<string, number>; // Full probability distribution
}

/**
 * Complete decision trace for an evaluated workflow scenario.
 */
export interface JevDecisionTrace {
  scenarioId: string;
  intent: string;
  modelUsed: string;
  tokenUsage: {
    input_tokens: number;
    output_tokens: number;
  };
  decisions: Record<string, JevDecisionTraceItem>;
  overallConfidence: number;
  timestamp: string;
}

/**
 * Utility to extract a clean JevDecisionTraceItem from a raw Jev Answer.
 */
export function buildTraceItem(
  questionId: string,
  instructions: string,
  answer: Answer
): JevDecisionTraceItem {
  if (answer.type === "noul") {
    const noulAns = answer as NoulAnswer;
    return {
      questionId,
      questionType: "noul",
      instructions,
      rawAnswer: answer,
      affirmative: noulAns.noul >= 0.5,
      confidence: noulAns.noul >= 0.5 ? noulAns.noul : 1 - noulAns.noul,
      probability: noulAns.noul,
    };
  }

  if (answer.type === "choice") {
    const choiceAns = answer as ChoiceAnswer;
    return {
      questionId,
      questionType: "choice",
      instructions,
      rawAnswer: answer,
      selectedChoice: choiceAns.choice,
      confidence: choiceAns.confidence,
      probability: choiceAns.probabilities?.[choiceAns.choice] ?? choiceAns.confidence,
      probabilities: choiceAns.probabilities,
    };
  }

  if (answer.type === "score") {
    const scoreAns = answer as ScoreAnswer;
    return {
      questionId,
      questionType: "score",
      instructions,
      rawAnswer: answer,
      score: scoreAns.score,
      confidence: scoreAns.confidence,
      probabilities: scoreAns.probabilities,
    };
  }

  throw new Error(`Unsupported Jev answer type: ${(answer as any).type}`);
}
