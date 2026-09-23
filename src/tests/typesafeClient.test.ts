import { describe, it, expect, vi } from "vitest";
import { TypeSafeClient } from "@/lib/typesafe/client";
import {
  TypeSafeConfigurationError,
  TypeSafeAuthError,
  TypeSafeValidationError,
  TypeSafeApiError,
  TypeSafeNetworkError,
} from "@/lib/typesafe/errors";
import { SystemOneRequest, SystemOneResponse, ModelMetadataList } from "@/lib/typesafe/types";

describe("TypeSafeClient (Milestone 2.1)", () => {
  const MOCK_API_KEY = "ts_mock_secret_key_123456789";

  it("Test D: should throw TypeSafeConfigurationError if API key is not configured", async () => {
    const client = new TypeSafeClient({ apiKey: "" });
    expect(client.isConfigured()).toBe(false);

    await expect(
      client.evaluateSystemOne({
        model: "jev-latest",
        state: "test state",
        questions: { q1: { type: "noul", instructions: "Is this valid?" } },
      })
    ).rejects.toThrow(TypeSafeConfigurationError);
  });

  it("Test A: should successfully call /v1/systemone with valid payload and Bearer token", async () => {
    const mockResponse: SystemOneResponse = {
      model: "jev-latest",
      answers: {
        sleep_context: {
          type: "noul",
          noul: 0.96,
        },
      },
      usage: {
        input_tokens: 45,
        output_tokens: 5,
      },
    };

    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody = "";

    const mockFetch = vi.fn().mockImplementation((url, init) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers;
      capturedBody = init?.body;
      return Promise.resolve(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const client = new TypeSafeClient({
      apiKey: MOCK_API_KEY,
      baseUrl: "https://api.typesafe.ai",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const request: SystemOneRequest = {
      model: "jev-latest",
      state: "I am going to sleep",
      questions: {
        sleep_context: {
          type: "noul",
          instructions: "Is this user preparing to sleep?",
        },
      },
    };

    const result = await client.evaluateSystemOne(request);

    expect(capturedUrl).toBe("https://api.typesafe.ai/v1/systemone");
    expect(capturedHeaders["Authorization"]).toBe(`Bearer ${MOCK_API_KEY}`);
    expect(capturedHeaders["Content-Type"]).toBe("application/json");
    expect(JSON.parse(capturedBody)).toEqual(request);

    expect(result.model).toBe("jev-latest");
    expect(result.answers.sleep_context.type).toBe("noul");
    expect((result.answers.sleep_context as any).noul).toBe(0.96);
    expect(result.usage.input_tokens).toBe(45);
  });

  it("Test A2: should successfully call /v1/models and parse available models", async () => {
    const mockModelList: ModelMetadataList = {
      models: [
        {
          name: "jev-latest",
          description: "General-purpose system one model.",
          release_date: "2026-09-15",
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockModelList), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = new TypeSafeClient({
      apiKey: MOCK_API_KEY,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const result = await client.listModels();
    expect(result.models).toHaveLength(1);
    expect(result.models[0].name).toBe("jev-latest");
  });

  it("Test B: should handle HTTP 401/403 and throw TypeSafeAuthError", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = new TypeSafeClient({
      apiKey: MOCK_API_KEY,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(
      client.evaluateSystemOne({
        model: "jev-latest",
        state: "test",
        questions: { q: { type: "noul" } },
      })
    ).rejects.toThrow(TypeSafeAuthError);
  });

  it("Test B2: should handle HTTP 422 and throw TypeSafeValidationError with detail fields", async () => {
    const mockError = {
      detail: [
        {
          loc: ["body", "questions", "choice_q", "criteria"],
          msg: "Field required",
          type: "missing",
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockError), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = new TypeSafeClient({
      apiKey: MOCK_API_KEY,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    try {
      await client.evaluateSystemOne({
        model: "jev-latest",
        state: "test",
        questions: { choice_q: { type: "choice", criteria: {} } },
      });
      expect.fail("Expected TypeSafeValidationError to be thrown");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(TypeSafeValidationError);
      expect((err as TypeSafeValidationError).errors).toHaveLength(1);
      expect((err as TypeSafeValidationError).message).toContain("body.questions.choice_q.criteria");
    }
  });

  it("Test B3: should handle HTTP 500 and throw TypeSafeApiError", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = new TypeSafeClient({
      apiKey: MOCK_API_KEY,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.listModels()).rejects.toThrow(TypeSafeApiError);
  });

  it("Test C: should handle non-JSON or malformed responses cleanly", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("<html>Bad Gateway 502</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      })
    );

    const client = new TypeSafeClient({
      apiKey: MOCK_API_KEY,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.listModels()).rejects.toThrow(TypeSafeApiError);
  });

  it("Test C2: should throw if response is missing required 'answers' or 'model'", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = new TypeSafeClient({
      apiKey: MOCK_API_KEY,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(
      client.evaluateSystemOne({
        model: "jev-latest",
        state: "content",
        questions: { q: { type: "noul" } },
      })
    ).rejects.toThrow(TypeSafeApiError);
  });

  it("Test E: should preserve structured answers for Noul, Choice, and Score primitives", async () => {
    const multiAnswerResponse: SystemOneResponse = {
      model: "jev-latest",
      answers: {
        is_sleeping: {
          type: "noul",
          noul: 0.92,
        },
        action_intent: {
          type: "choice",
          choice: "bedtime_prep",
          confidence: 0.88,
          probabilities: {
            bedtime_prep: 0.88,
            away: 0.08,
            entertainment: 0.04,
          },
        },
        urgency_rating: {
          type: "score",
          score: 2.4,
          confidence: 0.95,
          legend: {
            "0": "Not urgent",
            "1": "Moderate",
            "2": "Immediate",
          },
          probabilities: {
            "0": 0.05,
            "1": 0.15,
            "2": 0.8,
          },
        },
      },
      usage: {
        input_tokens: 150,
        output_tokens: 35,
      },
    };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(multiAnswerResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = new TypeSafeClient({
      apiKey: MOCK_API_KEY,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const response = await client.evaluateSystemOne({
      model: "jev-latest",
      state: "I am tired and going to bed now",
      questions: {
        is_sleeping: { type: "noul" },
        action_intent: {
          type: "choice",
          criteria: { bedtime_prep: "bed", away: "leave", entertainment: "tv" },
        },
        urgency_rating: {
          type: "score",
          criteria: ["Not urgent", "Moderate", "Immediate"],
        },
      },
    });

    // Check Noul
    expect(response.answers.is_sleeping.type).toBe("noul");
    expect((response.answers.is_sleeping as any).noul).toBe(0.92);

    // Check Choice
    const choice = response.answers.action_intent as any;
    expect(choice.type).toBe("choice");
    expect(choice.choice).toBe("bedtime_prep");
    expect(choice.confidence).toBe(0.88);
    expect(choice.probabilities.bedtime_prep).toBe(0.88);

    // Check Score
    const score = response.answers.urgency_rating as any;
    expect(score.type).toBe("score");
    expect(score.score).toBe(2.4);
    expect(score.confidence).toBe(0.95);
    expect(score.probabilities["2"]).toBe(0.8);
  });

  it("Test F: should NEVER include the API key in logs, error messages, or error stacks", async () => {
    const sensitiveKey = "ts_ultra_secret_production_key_xyz987";
    const mockFetch = vi.fn().mockRejectedValue(
      new Error(`Failed to authenticate with key ${sensitiveKey} at remote host`)
    );

    const client = new TypeSafeClient({
      apiKey: sensitiveKey,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    try {
      await client.listModels();
      expect.fail("Should have thrown");
    } catch (err: unknown) {
      const errorMsg = (err as Error).message;
      expect(errorMsg).not.toContain(sensitiveKey);
      expect(errorMsg).toContain("[REDACTED_API_KEY]");
    }
  });
});
