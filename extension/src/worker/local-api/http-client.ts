import {
  LocalApiProtocolError,
  LocalApiTimeoutError,
  LocalApiTransportError
} from "./error-mapping";
import { createTimeoutSignal } from "./timeouts";

const LOCAL_API_BASE_URL = "http://127.0.0.1:11435";
export const EXTENSION_ID_HEADER = "X-SnapInsight-Extension-Id";

export interface JsonResponse<T> {
  status: number;
  data: T;
  headers: Headers;
}

export function appendLocalApiTrustHeaders(headers: Headers): void {
  const extensionId = chrome.runtime.id?.trim();
  if (extensionId) {
    headers.set(EXTENSION_ID_HEADER, extensionId);
  }
}

export async function requestJson<T>(
  path: string,
  init: RequestInit = {},
  expectedContentType: string = "application/json"
): Promise<JsonResponse<T>> {
  const headers = new Headers(init.headers);
  headers.set("Accept", expectedContentType);
  appendLocalApiTrustHeaders(headers);

  const timeout = createTimeoutSignal();

  try {
    const response = await fetch(`${LOCAL_API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: timeout.signal
    });
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes(expectedContentType)) {
      throw new LocalApiProtocolError(
        `Expected response content type ${expectedContentType}.`
      );
    }

    let data: unknown;

    try {
      data = await response.json();
    } catch {
      throw new LocalApiProtocolError("Local service returned invalid JSON.");
    }

    return {
      status: response.status,
      data: data as T,
      headers: response.headers
    };
  } catch (error) {
    if (timeout.didTimeout()) {
      throw new LocalApiTimeoutError("Local service request timed out.");
    }

    if (error instanceof LocalApiProtocolError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new LocalApiTimeoutError("Local service request timed out.");
    }

    throw new LocalApiTransportError("Local service request failed.");
  } finally {
    timeout.cleanup();
  }
}
