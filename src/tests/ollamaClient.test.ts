import { describe, it, expect, vi } from "vitest";
import {
  OllamaClient,
  OllamaConfigurationError,
  OllamaConnectionError,
  OllamaTimeoutError,
  OllamaApiError,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_TIMEOUT_MS,
} from "@/lib/ollama";

describe("OllamaClient (Milestone 3.6)", () => {
  it("initializes with defaults and cleans trailing slashes", () => {
    const client = new OllamaClient();
    expect(client.getBaseUrl()).toBe(DEFAULT_OLLAMA_BASE_URL);
    expect(client.getTimeoutMs()).toBe(DEFAULT_OLLAMA_TIMEOUT_MS);

    const customClient = new OllamaClient({
      baseUrl: "http://localhost:11434///",
      timeoutMs: 5000,
    });
    expect(customClient.getBaseUrl()).toBe("http://localhost:11434");
    expect(customClient.getTimeoutMs()).toBe(5000);
  });

  it("throws OllamaConfigurationError when base URL is empty", () => {
    expect(() => new OllamaClient({ baseUrl: "   " })).toThrow(
      OllamaConfigurationError
    );
  });

  it("executes chat completion request successfully", async () => {
    const mockResponse = {
      model: "llama3.2:3b",
      created_at: "2026-09-24T10:00:00.000Z",
      message: {
        role: "assistant",
        content: JSON.stringify({
          reasoning: "Locking door for security.",
          decisions: [{ deviceId: "lock_main_door", actionType: "LOCK" }],
        }),
      },
      done: true,
      total_duration: 450000000,
      load_duration: 50000000,
      prompt_eval_count: 120,
      eval_count: 24,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResponse),
    });

    const client = new OllamaClient({ fetchFn: mockFetch });
    const response = await client.chat({
      model: "llama3.2:3b",
      messages: [{ role: "user", content: "I'm going to sleep." }],
    });

    expect(response.model).toBe("llama3.2:3b");
    expect(response.done).toBe(true);
    expect(response.message.content).toContain("lock_main_door");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("throws OllamaConfigurationError when model name is missing", async () => {
    const client = new OllamaClient();
    await expect(
      client.chat({
        model: "",
        messages: [{ role: "user", content: "hello" }],
      })
    ).rejects.toThrow(OllamaConfigurationError);
  });

  it("throws OllamaTimeoutError when request aborts due to timeout", async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      return Promise.reject(error);
    });

    const client = new OllamaClient({ timeoutMs: 100, fetchFn: mockFetch });

    await expect(
      client.chat({
        model: "llama3.2:3b",
        messages: [{ role: "user", content: "hello" }],
      })
    ).rejects.toThrow(OllamaTimeoutError);
  });

  it("throws OllamaConnectionError when network connection fails", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:11434"));

    const client = new OllamaClient({ fetchFn: mockFetch });

    await expect(
      client.chat({
        model: "llama3.2:3b",
        messages: [{ role: "user", content: "hello" }],
      })
    ).rejects.toThrow(OllamaConnectionError);
  });

  it("throws OllamaApiError when Ollama returns non-2xx HTTP error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: "model 'llama3.2:3b' not found" }),
    });

    const client = new OllamaClient({ fetchFn: mockFetch });

    await expect(
      client.chat({
        model: "llama3.2:3b",
        messages: [{ role: "user", content: "hello" }],
      })
    ).rejects.toThrow(OllamaApiError);
  });

  it("throws OllamaApiError when Ollama returns non-JSON body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<html>502 Bad Gateway</html>",
    });

    const client = new OllamaClient({ fetchFn: mockFetch });

    await expect(
      client.chat({
        model: "llama3.2:3b",
        messages: [{ role: "user", content: "hello" }],
      })
    ).rejects.toThrow(OllamaApiError);
  });

  it("lists local models via listModels()", async () => {
    const mockTags = {
      models: [
        { name: "llama3.2:3b", modified_at: "2026-09-20", size: 2000000000 },
        { name: "mistral:latest", modified_at: "2026-09-18", size: 4000000000 },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockTags),
    });

    const client = new OllamaClient({ fetchFn: mockFetch });
    const tags = await client.listModels();
    expect(tags.models).toHaveLength(2);
    expect(tags.models[0].name).toBe("llama3.2:3b");
  });

  it("performs health check reporting modelCount on success and error on failure", async () => {
    const mockFetchSuccess = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ models: [{ name: "llama3.2:3b" }] }),
    });

    const client = new OllamaClient({ fetchFn: mockFetchSuccess });
    const health = await client.checkHealth();
    expect(health.healthy).toBe(true);
    expect(health.modelCount).toBe(1);

    const mockFetchFailure = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const failingClient = new OllamaClient({ fetchFn: mockFetchFailure });
    const badHealth = await failingClient.checkHealth();
    expect(badHealth.healthy).toBe(false);
    expect(badHealth.modelCount).toBe(0);
    expect(badHealth.error).toContain("ECONNREFUSED");
  });
});
