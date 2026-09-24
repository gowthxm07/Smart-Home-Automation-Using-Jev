import {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaTagsResponse,
  OllamaClientConfig,
} from "./types";
import {
  OllamaError,
  OllamaConfigurationError,
  OllamaConnectionError,
  OllamaTimeoutError,
  OllamaApiError,
} from "./errors";

export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_TIMEOUT_MS = 30000;

/**
 * OllamaClient handles HTTP communication with a local Ollama runtime.
 * Purely local communication (zero external cloud dependencies, zero secrets).
 */
export class OllamaClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: OllamaClientConfig = {}) {
    const rawUrl =
      config.baseUrl ||
      (typeof process !== "undefined" ? process.env.OLLAMA_BASE_URL : undefined) ||
      DEFAULT_OLLAMA_BASE_URL;

    if (!rawUrl || !rawUrl.trim()) {
      throw new OllamaConfigurationError("Ollama base URL cannot be empty.");
    }

    this.baseUrl = rawUrl.trim().replace(/\/+$/, "");
    this.timeoutMs = config.timeoutMs ?? DEFAULT_OLLAMA_TIMEOUT_MS;
    this.fetchFn =
      config.fetchFn || (typeof fetch !== "undefined" ? fetch : (globalThis.fetch as typeof fetch));
  }

  /**
   * Returns the configured base URL.
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Returns the configured timeout in milliseconds.
   */
  getTimeoutMs(): number {
    return this.timeoutMs;
  }

  /**
   * Executes a chat completion request against /api/chat.
   */
  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    if (!request.model || !request.model.trim()) {
      throw new OllamaConfigurationError("Ollama model name must be specified.");
    }

    const payload = {
      ...request,
      stream: false, // Strict non-streaming for deterministic decision evaluation
    };

    return this.dispatchRequest<OllamaChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Lists local models available in Ollama via /api/tags.
   */
  async listModels(): Promise<OllamaTagsResponse> {
    return this.dispatchRequest<OllamaTagsResponse>("/api/tags", {
      method: "GET",
    });
  }

  /**
   * Checks whether the local Ollama daemon is reachable and responding.
   */
  async checkHealth(): Promise<{ healthy: boolean; modelCount: number; error?: string }> {
    try {
      const tags = await this.listModels();
      return {
        healthy: true,
        modelCount: Array.isArray(tags.models) ? tags.models.length : 0,
      };
    } catch (err: unknown) {
      return {
        healthy: false,
        modelCount: 0,
        error: (err as Error)?.message || String(err),
      };
    }
  }

  /**
   * Internal HTTP request dispatcher with timeout and typed error mapping.
   */
  private async dispatchRequest<TResponse>(endpoint: string, options: RequestInit = {}): Promise<TResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = (err as Error)?.name === "AbortError";
      if (isAbort) {
        throw new OllamaTimeoutError(
          `Ollama request to ${endpoint} timed out after ${this.timeoutMs}ms. Verify that the Ollama daemon is running and responsive.`,
          this.timeoutMs
        );
      }
      throw new OllamaConnectionError(
        `Failed to connect to local Ollama at ${url}: ${(err as Error)?.message || String(err)}. Ensure Ollama is running (e.g. 'ollama serve').`,
        err
      );
    } finally {
      clearTimeout(timer);
    }

    let responseText = "";
    try {
      responseText = await response.text();
    } catch (err) {
      throw new OllamaConnectionError("Failed to read Ollama response stream.", err);
    }

    let parsed: unknown;
    if (responseText) {
      try {
        parsed = JSON.parse(responseText);
      } catch {
        throw new OllamaApiError(
          `Ollama returned non-JSON response from ${endpoint} (Status ${response.status}). Body: ${responseText.slice(0, 150)}`,
          response.status,
          responseText
        );
      }
    }

    if (!response.ok) {
      const errorMsg =
        typeof parsed === "object" && parsed !== null && "error" in parsed
          ? String((parsed as any).error)
          : `HTTP error ${response.status} from Ollama at ${endpoint}`;

      throw new OllamaApiError(errorMsg, response.status, parsed);
    }

    return parsed as TResponse;
  }
}
