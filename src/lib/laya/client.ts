import {
  LayaClientConfig,
  LayaHealthResponse,
  LayaSystemOneRequest,
  LayaSystemOneResponse,
  toLayaWireQuestions,
} from "./types";
import {
  LayaApiError,
  LayaConnectionError,
  LayaTimeoutError,
  sanitizeLayaSecret,
} from "./errors";

export const DEFAULT_LAYA_BASE_URL = "http://127.0.0.1:8081";
export const DEFAULT_LAYA_MODEL = "english";
export const DEFAULT_LAYA_TIMEOUT_MS = 60000;

/**
 * LayaClient handles communication with the local or remote Laya System-1 server.
 * Implements health checking, question/state evaluation, timeout management, and sanitized error mapping.
 */
export class LayaClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly model: string;
  private readonly apiKey?: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: LayaClientConfig = {}) {
    const url =
      config.baseUrl ||
      (typeof process !== "undefined" ? process.env.LAYA_BASE_URL : undefined) ||
      DEFAULT_LAYA_BASE_URL;
    this.baseUrl = url.replace(/\/+$/, "");

    this.model =
      config.model ||
      (typeof process !== "undefined" ? process.env.LAYA_MODEL : undefined) ||
      DEFAULT_LAYA_MODEL;

    this.timeoutMs =
      config.timeoutMs ??
      (typeof process !== "undefined" && process.env.LAYA_TIMEOUT_MS
        ? parseInt(process.env.LAYA_TIMEOUT_MS, 10)
        : DEFAULT_LAYA_TIMEOUT_MS);

    this.apiKey =
      config.apiKey ||
      (typeof process !== "undefined" ? process.env.LAYA_API_KEY : undefined);

    this.fetchFn =
      config.fetchFn ||
      (typeof fetch !== "undefined" ? fetch : (globalThis.fetch as typeof fetch));
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getModel(): string {
    return this.model;
  }

  getTimeoutMs(): number {
    return this.timeoutMs;
  }

  /**
   * Health probe contacting GET /health on the Laya server.
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    status: string;
    detail: string;
    loaded?: string[];
  }> {
    const endpoint = `${this.baseUrl}/health`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(this.timeoutMs, 5000));

    try {
      const response = await this.fetchFn(endpoint, {
        method: "GET",
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          healthy: false,
          status: "UNHEALTHY",
          detail: `Laya server responded with HTTP status ${response.status}`,
        };
      }

      let data: LayaHealthResponse;
      try {
        data = (await response.json()) as LayaHealthResponse;
      } catch {
        return {
          healthy: false,
          status: "INVALID_RESPONSE",
          detail: `Endpoint reachable at ${this.baseUrl}/health but response is not valid JSON. Ensure laya-serve is running on this port.`,
        };
      }

      if (!data || typeof data !== "object" || data.status !== "ok") {
        return {
          healthy: false,
          status: String(data?.status || "INVALID_RESPONSE"),
          detail: `Endpoint reachable at ${this.baseUrl}/health but returned an invalid Laya health status (${JSON.stringify(data?.status)}). Expected '{"status":"ok"}'. Ensure laya-serve is running on this port.`,
        };
      }

      return {
        healthy: true,
        status: "ok",
        detail: `Laya server healthy. Loaded models: ${(data.loaded || []).join(", ") || "default"}. Device: ${data.device || "auto"}.`,
        loaded: data.loaded,
      };
    } catch (err: unknown) {
      const message = (err as Error)?.message || "Connection refused";
      if ((err as Error)?.name === "AbortError") {
        return {
          healthy: false,
          status: "TIMEOUT",
          detail: `Laya health probe timed out after ${Math.min(this.timeoutMs, 5000)}ms.`,
        };
      }
      return {
        healthy: false,
        status: "UNREACHABLE",
        detail: `Cannot connect to Laya daemon at ${this.baseUrl}: ${sanitizeLayaSecret(message)}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Executes a System-1 decision evaluation via POST /v1/systemone.
   */
  async evaluateSystemOne(request: LayaSystemOneRequest): Promise<LayaSystemOneResponse> {
    const endpoint = `${this.baseUrl}/v1/systemone`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const wireQuestions = toLayaWireQuestions(request.questions);

    const payload = {
      state: request.state,
      questions: wireQuestions,
      model: request.model || this.model,
    };

    try {
      const response = await this.fetchFn(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errBody: unknown;
        try {
          errBody = await response.json();
        } catch {
          errBody = await response.text();
        }
        const msg = typeof errBody === "object" && errBody !== null && "detail" in errBody
          ? String((errBody as any).detail)
          : response.statusText;
        throw new LayaApiError(sanitizeLayaSecret(msg), response.status, errBody);
      }

      const data = (await response.json()) as LayaSystemOneResponse;
      return data;
    } catch (err: unknown) {
      if (err instanceof LayaApiError) {
        throw err;
      }
      if ((err as Error)?.name === "AbortError") {
        throw new LayaTimeoutError(`Laya decision request timed out after ${this.timeoutMs}ms.`);
      }
      throw new LayaConnectionError(
        `Failed to reach Laya server at ${this.baseUrl}: ${sanitizeLayaSecret((err as Error)?.message || "unknown")}`,
        err
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
