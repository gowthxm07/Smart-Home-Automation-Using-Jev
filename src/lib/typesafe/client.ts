import {
  SystemOneRequest,
  SystemOneResponse,
  ModelMetadataList,
  TypeSafeClientConfig,
  HTTPValidationError,
} from "./types";
import {
  TypeSafeError,
  TypeSafeConfigurationError,
  TypeSafeAuthError,
  TypeSafeValidationError,
  TypeSafeApiError,
  TypeSafeNetworkError,
  sanitizeSecret,
} from "./errors";

import { getEffectiveTypeSafeApiKey } from "./credentials";

const DEFAULT_BASE_URL = "https://api.typesafe.ai";
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * TypeSafeClient handles authenticated HTTP communication with the TypeSafe Jev API.
 * Strictly server-side: handles Bearer authentication, JSON serialization, and sanitized error mapping.
 */
export class TypeSafeClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: TypeSafeClientConfig = {}) {
    const key = config.apiKey || getEffectiveTypeSafeApiKey();
    this.apiKey = key?.trim() || "";

    const url =
      config.baseUrl ||
      (typeof process !== "undefined" ? process.env.TYPESAFE_BASE_URL : undefined) ||
      DEFAULT_BASE_URL;
    this.baseUrl = url.replace(/\/+$/, "");

    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchFn = config.fetchFn || (typeof fetch !== "undefined" ? fetch : (globalThis.fetch as typeof fetch));
  }

  /**
   * Returns true if an API key is configured.
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * Validates that the client is configured before making requests.
   */
  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new TypeSafeConfigurationError(
        "TypeSafe API key is not configured. Set the server-side environment variable 'TYPESAFE_API_KEY' or provide an apiKey in TypeSafeClientConfig."
      );
    }
  }

  /**
   * Internal HTTP request dispatcher.
   */
  private async request<TResponse>(endpoint: string, options: RequestInit = {}): Promise<TResponse> {
    this.ensureConfigured();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
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
      const message = isAbort
        ? `TypeSafe API request to ${endpoint} timed out after ${this.timeoutMs}ms.`
        : `Network error connecting to TypeSafe API at ${endpoint}: ${(err as Error)?.message || String(err)}`;
      throw new TypeSafeNetworkError(message, err, this.apiKey);
    } finally {
      clearTimeout(timer);
    }

    // Parse Response
    let responseText = "";
    try {
      responseText = await response.text();
    } catch (err) {
      throw new TypeSafeNetworkError("Failed to read TypeSafe API response stream.", err, this.apiKey);
    }

    let parsedData: unknown;
    if (responseText) {
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        throw new TypeSafeApiError(
          `TypeSafe API returned non-JSON response from ${endpoint} (Status ${response.status}). Body: ${responseText.slice(0, 150)}`,
          response.status,
          responseText,
          this.apiKey
        );
      }
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new TypeSafeAuthError(
          `Authentication failed with TypeSafe API at ${endpoint} (HTTP ${response.status}). Check that your TYPESAFE_API_KEY is valid.`,
          response.status,
          this.apiKey
        );
      }

      if (response.status === 422) {
        const valError = parsedData as HTTPValidationError;
        const details = Array.isArray(valError?.detail)
          ? valError.detail.map((d) => `${d.loc?.join(".") ?? "unknown"}: ${d.msg}`).join("; ")
          : "Invalid request format.";
        throw new TypeSafeValidationError(
          `TypeSafe API request validation failed (HTTP 422): ${details}`,
          valError?.detail || [],
          this.apiKey
        );
      }

      const errMsg =
        typeof parsedData === "object" && parsedData !== null && "detail" in parsedData
          ? String((parsedData as any).detail)
          : `HTTP ${response.status}`;

      throw new TypeSafeApiError(
        `TypeSafe API error from ${endpoint} (${response.status}): ${errMsg}`,
        response.status,
        parsedData,
        this.apiKey
      );
    }

    return parsedData as TResponse;
  }

  /**
   * Evaluates structured questions using the TypeSafe Jev System One engine.
   * Calls POST /v1/systemone
   */
  async evaluateSystemOne(request: SystemOneRequest): Promise<SystemOneResponse> {
    if (!request || !request.state) {
      throw new TypeSafeValidationError("Request must include a non-empty 'state' property.");
    }
    if (!request.model) {
      throw new TypeSafeValidationError("Request must include a 'model' property.");
    }
    if (!request.questions || Object.keys(request.questions).length === 0) {
      throw new TypeSafeValidationError("Request must include at least one question in 'questions'.");
    }

    const response = await this.request<SystemOneResponse>("/v1/systemone", {
      method: "POST",
      body: JSON.stringify(request),
    });

    if (!response || !response.answers || !response.model) {
      throw new TypeSafeApiError(
        "Malformed response from TypeSafe System One API: missing required fields 'answers' or 'model'.",
        200,
        response,
        this.apiKey
      );
    }

    return response;
  }

  /**
   * Discovers available models and aliases from TypeSafe.
   * Calls GET /v1/models
   */
  async listModels(): Promise<ModelMetadataList> {
    const response = await this.request<ModelMetadataList>("/v1/models", {
      method: "GET",
    });

    if (!response || !Array.isArray(response.models)) {
      throw new TypeSafeApiError(
        "Malformed response from TypeSafe Models API: expected 'models' array.",
        200,
        response,
        this.apiKey
      );
    }

    return response;
  }
}
