import type { ExplanationStreamEvent } from "../../shared/contracts/events";
import { createExtensionError, type ExtensionError } from "../../shared/errors/error-codes";
import type { SelectionMode } from "../../shared/state/request-types";
import {
  LocalApiProtocolError,
  LocalApiTimeoutError,
  LocalApiTransportError
} from "./error-mapping";
import { LOCAL_API_TIMEOUT_MS } from "./timeouts";

const LOCAL_API_BASE_URL = "http://127.0.0.1:11435";

interface ExplanationStartRequest {
  requestId: string;
  text: string;
  model: string;
  mode: SelectionMode;
}

interface ErrorResponseBody {
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
  };
}

export class ExplanationStartupError extends Error {
  constructor(public readonly extensionError: ExtensionError) {
    super(extensionError.message);
  }
}

export class ExplanationStreamCancelledError extends Error {}

export interface ExplanationStreamConnection {
  events: AsyncIterable<ExplanationStreamEvent>;
  cancel: () => void;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isExtensionErrorCode(value: unknown): value is ExtensionError["code"] {
  return (
    value === "service_unavailable" ||
    value === "local_service_conflict" ||
    value === "invalid_request" ||
    value === "no_models_available" ||
    value === "selected_model_unavailable" ||
    value === "request_failed" ||
    value === "request_cancelled"
  );
}

function createStartupErrorFromResponse(status: number, body: unknown): ExtensionError {
  const payload = isObjectRecord(body) ? (body as ErrorResponseBody).error : undefined;
  const message =
    payload && typeof payload.message === "string"
      ? payload.message
      : "Explanation stream could not be started.";

  if (status === 409 && payload && payload.code === "selected_model_unavailable") {
    return createExtensionError("selected_model_unavailable", message, false);
  }

  return createExtensionError(
    "request_failed",
    status === 403 ? "Explanation stream could not be started." : message,
    true
  );
}

function parseExplanationEvent(value: unknown): ExplanationStreamEvent {
  if (!isObjectRecord(value) || typeof value.event !== "string") {
    throw new LocalApiProtocolError("Explanation stream event shape was invalid.");
  }

  switch (value.event) {
    case "start":
      if (
        typeof value.requestId === "string" &&
        (value.mode === "short" || value.mode === "detailed") &&
        typeof value.model === "string"
      ) {
        return {
          event: "start",
          requestId: value.requestId,
          mode: value.mode,
          model: value.model
        };
      }
      break;
    case "chunk":
      if (typeof value.requestId === "string" && typeof value.delta === "string") {
        return {
          event: "chunk",
          requestId: value.requestId,
          delta: value.delta
        };
      }
      break;
    case "complete":
      if (typeof value.requestId === "string") {
        return {
          event: "complete",
          requestId: value.requestId
        };
      }
      break;
    case "error":
      if (
        typeof value.requestId === "string" &&
        isObjectRecord(value.error) &&
        isExtensionErrorCode(value.error.code) &&
        typeof value.error.message === "string" &&
        typeof value.error.retryable === "boolean"
      ) {
        return {
          event: "error",
          requestId: value.requestId,
          error: {
            code: value.error.code,
            message: value.error.message,
            retryable: value.error.retryable
          }
        };
      }
      break;
    default:
      break;
  }

  throw new LocalApiProtocolError("Explanation stream event shape was invalid.");
}

async function* readExplanationEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<ExplanationStreamEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line) {
          let payload: unknown;
          try {
            payload = JSON.parse(line);
          } catch {
            throw new LocalApiProtocolError("Explanation stream returned invalid NDJSON.");
          }

          yield parseExplanationEvent(payload);
        }

        newlineIndex = buffer.indexOf("\n");
      }
    }

    const remaining = buffer.trim();
    if (remaining) {
      let payload: unknown;
      try {
        payload = JSON.parse(remaining);
      } catch {
        throw new LocalApiProtocolError("Explanation stream returned invalid NDJSON.");
      }

      yield parseExplanationEvent(payload);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ExplanationStreamCancelledError("Explanation stream was cancelled.");
    }

    throw error;
  } finally {
    reader.releaseLock();
  }
}

export async function openExplanationStream(
  request: ExplanationStartRequest
): Promise<ExplanationStreamConnection> {
  const controller = new AbortController();
  let didTimeout = false;
  const timeoutId = globalThis.setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, LOCAL_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${LOCAL_API_BASE_URL}/v1/explanations/stream`, {
      method: "POST",
      headers: {
        Accept: "application/x-ndjson",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    globalThis.clearTimeout(timeoutId);

    if (response.status !== 200) {
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new LocalApiProtocolError(
          "Explanation startup returned an unexpected content type."
        );
      }

      let errorPayload: unknown;
      try {
        errorPayload = await response.json();
      } catch {
        throw new LocalApiProtocolError(
          "Explanation startup returned invalid JSON."
        );
      }

      throw new ExplanationStartupError(
        createStartupErrorFromResponse(response.status, errorPayload)
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/x-ndjson")) {
      throw new LocalApiProtocolError(
        "Explanation stream returned an unexpected content type."
      );
    }

    if (!response.body) {
      throw new LocalApiProtocolError("Explanation stream response body was missing.");
    }

    return {
      events: readExplanationEvents(response.body.getReader()),
      cancel: () => {
        controller.abort();
      }
    };
  } catch (error) {
    globalThis.clearTimeout(timeoutId);

    if (error instanceof ExplanationStartupError) {
      throw error;
    }

    if (error instanceof LocalApiProtocolError) {
      throw error;
    }

    if (didTimeout) {
      throw new LocalApiTimeoutError("Explanation startup timed out.");
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new LocalApiTransportError("Explanation stream request failed.");
    }

    throw new LocalApiTransportError("Explanation stream request failed.");
  }
}
