import type { z } from "zod";

import {
  featuresResponseSchema,
  fieldsResponseSchema,
  formatZodIssues,
  strategiesResponseSchema,
  type Features,
  type Field,
  type StrategiesResponse,
  type StrategyRequest,
} from "./schemas";

/**
 * Central AgroShift API client. UI components never call fetch directly.
 *
 * Base URL: VITE_AGROSHIFT_API_BASE_URL (public, optional). When empty, requests go
 * to this app's own /api/* routes, which forward to the backend set in the
 * server-side AGROSHIFT_BACKEND_URL secret.
 */

export type ApiErrorKind =
  | "not_configured"
  | "network"
  | "timeout"
  | "http"
  | "invalid_json"
  | "invalid_shape"
  | "aborted";

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  endpoint: string;
  issues?: string[];
  constructor(
    kind: ApiErrorKind,
    endpoint: string,
    message: string,
    extra?: { status?: number; issues?: string[] },
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.endpoint = endpoint;
    if (extra?.status !== undefined) this.status = extra.status;
    if (extra?.issues !== undefined) this.issues = extra.issues;
  }
}

const DEFAULT_TIMEOUT_MS = 45_000;

function baseUrl(): string {
  const configured = (import.meta.env["VITE_AGROSHIFT_API_BASE_URL"] as string | undefined) ?? "";
  return configured.replace(/\/+$/, "");
}

async function request<S extends z.ZodTypeAny>(
  endpoint: string,
  schema: S,
  init: Omit<RequestInit, "signal"> & { signal?: AbortSignal | undefined; timeoutMs?: number } = {},
): Promise<z.infer<S>> {
  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  init.signal?.addEventListener("abort", onAbort);

  let response: Response;
  try {
    const { timeoutMs: _t, signal: _s, ...rest } = init;
    response = await fetch(`${baseUrl()}${endpoint}`, {
      ...rest,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(init.headers ?? {}) },
    });
  } catch (err) {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", onAbort);
    if (timedOut) {
      throw new ApiError("timeout", endpoint, `No response after ${Math.round(timeoutMs / 1000)}s`);
    }
    if (init.signal?.aborted) throw new ApiError("aborted", endpoint, "Request cancelled");
    console.error(`[AgroShift API] ${endpoint} network error`, err);
    throw new ApiError("network", endpoint, "Could not reach the AgroShift service");
  }
  clearTimeout(timer);
  init.signal?.removeEventListener("abort", onAbort);

  const text = await response.text();
  let body: unknown = undefined;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      if (response.ok) {
        console.error(`[AgroShift API] ${endpoint} returned non-JSON`, text.slice(0, 200));
        throw new ApiError("invalid_json", endpoint, "The service sent a response that is not JSON");
      }
    }
  }

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : null;
    if (code === "backend_not_configured") {
      throw new ApiError(
        "not_configured",
        endpoint,
        "The AgroShift analysis service has not been connected yet",
        { status: response.status },
      );
    }
    console.error(`[AgroShift API] ${endpoint} HTTP ${response.status}`, body ?? text.slice(0, 200));
    throw new ApiError("http", endpoint, `The service returned an error (HTTP ${response.status})`, {
      status: response.status,
    });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issues = formatZodIssues(parsed.error);
    console.error(`[AgroShift API] ${endpoint} response does not match contract`, issues);
    throw new ApiError(
      "invalid_shape",
      endpoint,
      "The service response does not match the documented format",
      { issues },
    );
  }
  return parsed.data;
}

export function getFields(signal?: AbortSignal): Promise<Field[]> {
  return request("/api/fields", fieldsResponseSchema, { method: "GET", signal });
}

export function getFieldFeatures(fieldId: string, signal?: AbortSignal): Promise<Features> {
  return request(
    `/api/fields/${encodeURIComponent(fieldId)}/features`,
    featuresResponseSchema,
    { method: "GET", signal },
  );
}

export function postStrategies(
  body: StrategyRequest,
  signal?: AbortSignal,
): Promise<StrategiesResponse> {
  return request("/api/strategies", strategiesResponseSchema, {
    method: "POST",
    signal,
    timeoutMs: 90_000,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type ErrorCopy = { title: string; detail: string; issues?: string[] | undefined };

export function describeApiError(err: unknown): ErrorCopy {
  if (!(err instanceof ApiError)) {
    return { title: "Something went wrong", detail: "An unexpected problem stopped this step." };
  }
  switch (err.kind) {
    case "not_configured":
      return {
        title: "Analysis service not connected",
        detail:
          "This app is ready, but its data service has not been connected yet, so no fields or results can be shown.",
      };
    case "network":
      return {
        title: "No connection",
        detail:
          "We could not reach the AgroShift service. Check your internet connection and try again. Your answers are kept.",
      };
    case "timeout":
      return {
        title: "The service is taking too long",
        detail: "No answer arrived in time. Your answers are kept — try again in a moment.",
      };
    case "invalid_json":
      return {
        title: "Unreadable response",
        detail: `The service sent something we could not read (${err.endpoint}).`,
      };
    case "invalid_shape":
      return {
        title: "Unexpected data format",
        detail: `The response from ${err.endpoint} does not match the agreed format, so it is not shown.`,
        issues: err.issues,
      };
    case "http":
      return {
        title: err.status === 404 ? "Not found" : "The service returned an error",
        detail:
          err.status === 404
            ? `The service has no record for this request (${err.endpoint}).`
            : `The service could not complete this request (HTTP ${err.status}). Try again.`,
      };
    case "aborted":
      return { title: "Cancelled", detail: "The request was cancelled." };
  }
}
