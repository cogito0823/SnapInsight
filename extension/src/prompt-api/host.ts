import {
  PROMPT_HOST_CANCEL_MESSAGE_TYPE,
  PROMPT_HOST_EVENT_MESSAGE_TYPE,
  PROMPT_HOST_START_MESSAGE_TYPE,
  type PromptHostCancelMessage,
  type PromptHostStartMessage,
  type PromptHostStartResponse
} from "../shared/contracts/prompt-host";
import type { ExplanationStreamEvent } from "../shared/contracts/events";
import { createExtensionError } from "../shared/errors/error-codes";
import { getLanguageModelApi, type LanguageModelSession } from "./language-model";
import {
  buildExplanationPrompt,
  PROMPT_API_MODEL_ID,
  SNAPINSIGHT_SYSTEM_PROMPT
} from "./prompts";

interface ActivePromptRequest {
  controller: AbortController;
  session: LanguageModelSession | null;
}

const activeRequests = new Map<string, ActivePromptRequest>();

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isNotSupportedError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotSupportedError";
}

async function sendEvent(
  requestId: string,
  event: ExplanationStreamEvent
): Promise<void> {
  await chrome.runtime.sendMessage({
    type: PROMPT_HOST_EVENT_MESSAGE_TYPE,
    target: "worker",
    payload: {
      requestId,
      event
    }
  });
}

async function generate(message: PromptHostStartMessage): Promise<void> {
  const request = activeRequests.get(message.payload.requestId);
  if (!request?.session) {
    return;
  }

  const { requestId, mode, text } = message.payload;
  try {
    await sendEvent(requestId, {
      event: "start",
      requestId,
      mode,
      model: PROMPT_API_MODEL_ID
    });

    const stream = request.session.promptStreaming(
      buildExplanationPrompt(text, mode),
      { signal: request.controller.signal }
    );
    for await (const chunk of stream) {
      if (chunk) {
        await sendEvent(requestId, {
          event: "chunk",
          requestId,
          delta: chunk
        });
      }
    }

    await sendEvent(requestId, {
      event: "complete",
      requestId
    });
  } catch (error) {
    if (!isAbortError(error)) {
      await sendEvent(requestId, {
        event: "error",
        requestId,
        error: createExtensionError(
          isNotSupportedError(error) ? "invalid_request" : "request_failed",
          isNotSupportedError(error)
            ? "Chrome's on-device model does not support this language or input."
            : "Chrome's on-device model could not generate the explanation.",
          !isNotSupportedError(error)
        )
      });
    }
  } finally {
    request.session.destroy();
    activeRequests.delete(requestId);
  }
}

async function startPromptRequest(
  message: PromptHostStartMessage
): Promise<PromptHostStartResponse> {
  const languageModel = getLanguageModelApi();
  if (!languageModel) {
    return {
      ok: false,
      error: createExtensionError(
        "service_unavailable",
        "Chrome Prompt API is not available in this browser context.",
        false
      )
    };
  }

  const availability = await languageModel.availability();
  if (availability === "unavailable") {
    return {
      ok: false,
      error: createExtensionError(
        "service_unavailable",
        "This device does not currently support Chrome's on-device model.",
        false
      )
    };
  }

  const controller = new AbortController();
  const activeRequest: ActivePromptRequest = {
    controller,
    session: null
  };
  activeRequests.set(message.payload.requestId, activeRequest);

  try {
    activeRequest.session = await languageModel.create({
      signal: controller.signal,
      initialPrompts: [
        {
          role: "system",
          content: SNAPINSIGHT_SYSTEM_PROMPT
        }
      ]
    });
  } catch (error) {
    activeRequests.delete(message.payload.requestId);
    return {
      ok: false,
      error: createExtensionError(
        isNotSupportedError(error) ? "invalid_request" : "service_unavailable",
        isNotSupportedError(error)
          ? "Chrome's on-device model rejected the requested language."
          : "Chrome's on-device model is not ready. Open the Prompt API lab from settings to prepare it.",
        true
      )
    };
  }

  globalThis.setTimeout(() => {
    void generate(message);
  }, 0);

  return { ok: true };
}

function cancelPromptRequest(message: PromptHostCancelMessage): void {
  const request = activeRequests.get(message.payload.requestId);
  if (!request) {
    return;
  }

  request.controller.abort();
  request.session?.destroy();
  activeRequests.delete(message.payload.requestId);
}

export function registerPromptHost(): void {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (typeof message !== "object" || message === null) {
      return false;
    }

    const candidate = message as { type?: unknown; target?: unknown };
    if (candidate.target !== "prompt-host") {
      return false;
    }

    if (candidate.type === PROMPT_HOST_START_MESSAGE_TYPE) {
      void startPromptRequest(message as PromptHostStartMessage).then(sendResponse);
      return true;
    }

    if (candidate.type === PROMPT_HOST_CANCEL_MESSAGE_TYPE) {
      cancelPromptRequest(message as PromptHostCancelMessage);
    }

    return false;
  });
}
