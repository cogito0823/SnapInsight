import type {
  ExplanationEventMessage,
  ExplanationStreamEvent
} from "../../shared/contracts/events";
import {
  createExtensionError,
  type ExtensionError
} from "../../shared/errors/error-codes";
import type {
  SelectionMode,
  SenderContext
} from "../../shared/state/request-types";
import {
  getLanguageModelApi,
  type LanguageModelSession
} from "../../prompt-api/language-model";
import {
  buildExplanationPrompt,
  PROMPT_API_MODEL_ID,
  SNAPINSIGHT_SYSTEM_PROMPT
} from "../../prompt-api/prompts";

interface ActivePromptRequest {
  controller: AbortController;
  session: LanguageModelSession | null;
}

export type PromptEventHandler = (message: ExplanationEventMessage) => void;

export type PromptStartResult =
  | { ok: true; requestId: string }
  | { ok: false; error: ExtensionError };

const activeRequests = new Map<string, ActivePromptRequest>();

function isDomError(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}

function destroySession(session: LanguageModelSession | null): void {
  if (!session) {
    return;
  }

  try {
    session.destroy();
  } catch {
    // Cancellation and document teardown can race with Chrome session cleanup.
  }
}

function generationError(error: unknown): ExtensionError {
  if (isDomError(error, "NotSupportedError")) {
    return createExtensionError(
      "language_unsupported",
      "Chrome's on-device model does not support this language or input.",
      false
    );
  }
  if (isDomError(error, "QuotaExceededError")) {
    return createExtensionError(
      "quota_exceeded",
      "Chrome's on-device model has no capacity for another session.",
      true
    );
  }
  return createExtensionError(
    "request_failed",
    "Chrome's on-device model could not generate the explanation.",
    true
  );
}

function emitEvent(
  requestId: string,
  senderContext: SenderContext,
  event: ExplanationStreamEvent,
  onEvent: PromptEventHandler
): void {
  onEvent({
    type: "explanations.event",
    payload: { requestId, senderContext, event }
  });
}

async function generate(options: {
  requestId: string;
  text: string;
  mode: SelectionMode;
  senderContext: SenderContext;
  onEvent: PromptEventHandler;
}): Promise<void> {
  const request = activeRequests.get(options.requestId);
  if (!request?.session) {
    return;
  }

  try {
    emitEvent(
      options.requestId,
      options.senderContext,
      {
        event: "start",
        requestId: options.requestId,
        mode: options.mode,
        model: PROMPT_API_MODEL_ID
      },
      options.onEvent
    );

    const stream = request.session.promptStreaming(
      buildExplanationPrompt(options.text, options.mode),
      { signal: request.controller.signal }
    );
    for await (const chunk of stream) {
      if (chunk) {
        emitEvent(
          options.requestId,
          options.senderContext,
          { event: "chunk", requestId: options.requestId, delta: chunk },
          options.onEvent
        );
      }
    }

    emitEvent(
      options.requestId,
      options.senderContext,
      { event: "complete", requestId: options.requestId },
      options.onEvent
    );
  } catch (error) {
    if (!isDomError(error, "AbortError")) {
      emitEvent(
        options.requestId,
        options.senderContext,
        {
          event: "error",
          requestId: options.requestId,
          error: generationError(error)
        },
        options.onEvent
      );
    }
  } finally {
    destroySession(request.session);
    activeRequests.delete(options.requestId);
  }
}

export async function startPromptExplanation(options: {
  requestId: string;
  text: string;
  mode: SelectionMode;
  senderContext: SenderContext;
  onEvent: PromptEventHandler;
}): Promise<PromptStartResult> {
  const requestId = options.requestId.trim();
  const text = options.text.trim();
  if (!requestId || !text || !options.senderContext.pageInstanceId.trim()) {
    return {
      ok: false,
      error: createExtensionError(
        "invalid_request",
        "A request id, selection text, and page context are required.",
        false
      )
    };
  }

  const languageModel = getLanguageModelApi();
  if (!languageModel) {
    return {
      ok: false,
      error: createExtensionError(
        "prompt_api_unavailable",
        "Chrome Prompt API is not available in this browser context.",
        false
      )
    };
  }

  let availability;
  try {
    availability = await languageModel.availability();
  } catch {
    return {
      ok: false,
      error: createExtensionError(
        "service_unavailable",
        "Chrome Prompt API readiness could not be checked.",
        true
      )
    };
  }
  if (availability === "unavailable") {
    return {
      ok: false,
      error: createExtensionError(
        "device_unsupported",
        "This device does not support Chrome's on-device model.",
        false
      )
    };
  }
  if (availability === "downloadable") {
    return {
      ok: false,
      error: createExtensionError(
        "model_download_required",
        "Chrome's on-device model must be prepared before use.",
        false
      )
    };
  }
  if (availability === "downloading") {
    return {
      ok: false,
      error: createExtensionError(
        "model_downloading",
        "Chrome is still downloading the on-device model.",
        true
      )
    };
  }

  cancelPromptExplanation(requestId);
  const controller = new AbortController();
  const activeRequest: ActivePromptRequest = { controller, session: null };
  activeRequests.set(requestId, activeRequest);

  try {
    activeRequest.session = await languageModel.create({
      signal: controller.signal,
      initialPrompts: [{ role: "system", content: SNAPINSIGHT_SYSTEM_PROMPT }]
    });
  } catch (error) {
    activeRequests.delete(requestId);
    return { ok: false, error: generationError(error) };
  }

  setTimeout(() => void generate({ ...options, requestId, text }), 0);
  return { ok: true, requestId };
}

export function cancelPromptExplanation(requestId: string): void {
  const request = activeRequests.get(requestId);
  if (!request) {
    return;
  }

  request.controller.abort();
  destroySession(request.session);
  activeRequests.delete(requestId);
}
