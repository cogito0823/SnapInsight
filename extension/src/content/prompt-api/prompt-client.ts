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
  PROMPT_KEEPER_MESSAGE_TYPE,
  type PromptKeeperLifecycleAction
} from "../../shared/contracts/prompt-keeper";
import {
  buildExplanationPrompt,
  PROMPT_API_MODEL_ID
} from "../../prompt-api/prompts";
import {
  pagePromptSessionPool,
  PromptSessionPoolError,
  type AcquiredPromptSession
} from "./prompt-session-pool";
import {
  emitPromptPerformance,
  type PromptIdleAgeBucket
} from "./prompt-performance";

export type PromptLoadingStage =
  | "dispatching"
  | "acquiring_session"
  | "waiting_response"
  | "response_slow";

interface ActivePromptRequest {
  controller: AbortController;
  acquired: AcquiredPromptSession | null;
  timeoutKind: "first_token_timeout" | "stream_stalled" | null;
  mode: SelectionMode;
  visibleStartedAt: number;
  generationStartedAt: number | null;
  visibleWaitEmitted: boolean;
  hasReceivedChunk: boolean;
  prewarmed: boolean;
  idleAgeBucket: PromptIdleAgeBucket;
  longWaitTimer: ReturnType<typeof setTimeout> | null;
  longWaitOffered: boolean;
  onLongWait?: (visible: boolean) => void;
}

export type PromptEventHandler = (message: ExplanationEventMessage) => void;

export type PromptStartResult =
  | { ok: true; requestId: string }
  | { ok: false; error: ExtensionError };

interface PromptClientTimeouts {
  acquisitionSoftMs: number;
  acquisitionHardMs: number;
  responseSlowSoftMs: number;
  firstTokenHardMs: number;
  streamStallMs: number;
  cancelOfferMs: number;
}

const DEFAULT_TIMEOUTS: PromptClientTimeouts = {
  acquisitionSoftMs: 2_000,
  acquisitionHardMs: 30_000,
  responseSlowSoftMs: 2_000,
  firstTokenHardMs: 30_000,
  streamStallMs: 30_000,
  cancelOfferMs: 5_000
};

let timeouts = { ...DEFAULT_TIMEOUTS };
const activeRequests = new Map<string, ActivePromptRequest>();
let keeperPageInstanceId: string | null = null;
let pageHidden = typeof document !== "undefined" && document.visibilityState !== "visible";
let lastSuccessfulFirstTokenAt: number | null = null;

function idleAgeBucket(now = Date.now()): PromptIdleAgeBucket {
  if (lastSuccessfulFirstTokenAt === null) return "unknown";
  const idleMs = Math.max(0, now - lastSuccessfulFirstTokenAt);
  if (idleMs < 60_000) return "under_1m";
  if (idleMs < 4 * 60_000) return "1m_to_4m";
  if (idleMs < 10 * 60_000) return "4m_to_10m";
  return "over_10m";
}

function reportKeeperLifecycle(
  action: PromptKeeperLifecycleAction,
  pageInstanceId: string
): void {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return;
  try {
    void chrome.runtime.sendMessage({
      type: PROMPT_KEEPER_MESSAGE_TYPE,
      payload: { action, pageInstanceId, hidden: pageHidden }
    }).catch(() => undefined);
  } catch {
    // Worker coordination is best-effort; page-local keeper behavior remains safe.
  }
}

function unregisterKeeper(): void {
  if (!keeperPageInstanceId) return;
  reportKeeperLifecycle("remove", keeperPageInstanceId);
  keeperPageInstanceId = null;
}

function isDomError(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}

function releaseRequest(request: ActivePromptRequest): void {
  request.acquired?.release();
  request.acquired = null;
}

function clearLongWaitOffer(request: ActivePromptRequest): void {
  if (request.longWaitTimer !== null) {
    clearTimeout(request.longWaitTimer);
    request.longWaitTimer = null;
  }
  if (request.longWaitOffered) {
    request.longWaitOffered = false;
    request.onLongWait?.(false);
  }
}

function emitVisibleWaitOutcome(
  request: ActivePromptRequest,
  outcome: "success" | "error" | "cancelled" | "timeout"
): void {
  if (request.visibleWaitEmitted) return;
  request.visibleWaitEmitted = true;
  emitPromptPerformance({
    phase: "visible_wait",
    durationMs: performance.now() - request.visibleStartedAt,
    path: request.acquired?.path,
    mode: request.mode,
    prewarmed: request.prewarmed,
    idleAgeBucket: request.idleAgeBucket,
    outcome
  });
}

function emitGenerationTerminal(
  request: ActivePromptRequest,
  outcome: "error" | "cancelled" | "timeout"
): void {
  if (!request.hasReceivedChunk) {
    emitVisibleWaitOutcome(request, outcome);
    return;
  }
  emitPromptPerformance({
    phase: "complete",
    durationMs: performance.now() - (request.generationStartedAt ?? performance.now()),
    path: request.acquired?.path,
    mode: request.mode,
    prewarmed: request.prewarmed,
    idleAgeBucket: request.idleAgeBucket,
    outcome
  });
}

function generationError(error: unknown): ExtensionError {
  if (error instanceof PromptSessionPoolError) {
    if (error.extensionError.code === "quota_exceeded") unregisterKeeper();
    return error.extensionError;
  }
  if (isDomError(error, "NotSupportedError")) {
    return createExtensionError(
      "language_unsupported",
      "Chrome's on-device model does not support this language or input.",
      false
    );
  }
  if (isDomError(error, "QuotaExceededError")) {
    pagePromptSessionPool.noteQuotaFailure();
    unregisterKeeper();
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

function timeoutError(
  code: "first_token_timeout" | "stream_stalled"
): ExtensionError {
  return code === "first_token_timeout"
    ? createExtensionError(
        code,
        "Chrome's on-device model took too long to start responding.",
        true
      )
    : createExtensionError(
        code,
        "Chrome's on-device model stopped producing output.",
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
  onStage?: (stage: PromptLoadingStage) => void;
  onLongWait?: (visible: boolean) => void;
}): Promise<void> {
  const request = activeRequests.get(options.requestId);
  if (!request?.acquired) return;

  const promptStartedAt = performance.now();
  request.generationStartedAt = promptStartedAt;
  let firstChunkReceived = false;
  let firstTokenSoftTimer: ReturnType<typeof setTimeout> | null = null;
  let firstTokenHardTimer: ReturnType<typeof setTimeout> | null = null;
  let streamStallTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = (timer: ReturnType<typeof setTimeout> | null): void => {
    if (timer !== null) clearTimeout(timer);
  };
  const armStreamStall = (): void => {
    clearTimer(streamStallTimer);
    streamStallTimer = setTimeout(() => {
      request.timeoutKind = "stream_stalled";
      request.controller.abort();
    }, timeouts.streamStallMs);
  };

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

    firstTokenSoftTimer = setTimeout(
      () => options.onStage?.("response_slow"),
      timeouts.responseSlowSoftMs
    );
    firstTokenHardTimer = setTimeout(() => {
      request.timeoutKind = "first_token_timeout";
      request.controller.abort();
    }, timeouts.firstTokenHardMs);

    const stream = request.acquired.session.promptStreaming(
      buildExplanationPrompt(options.text, options.mode),
      { signal: request.controller.signal }
    );
    options.onStage?.("waiting_response");
    const reader = stream.getReader();
    const cancelReader = (): void => {
      void reader.cancel().catch(() => undefined);
    };
    request.controller.signal.addEventListener("abort", cancelReader, {
      once: true
    });
    try {
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        if (!chunk) continue;
        if (!firstChunkReceived) {
          firstChunkReceived = true;
          request.hasReceivedChunk = true;
          lastSuccessfulFirstTokenAt = Date.now();
          clearLongWaitOffer(request);
          clearTimer(firstTokenSoftTimer);
          clearTimer(firstTokenHardTimer);
          emitPromptPerformance({
            phase: "first_token",
            durationMs: performance.now() - promptStartedAt,
            path: request.acquired.path,
            mode: options.mode,
            prewarmed: request.prewarmed,
            idleAgeBucket: request.idleAgeBucket,
            outcome: "success"
          });
          emitVisibleWaitOutcome(request, "success");
        }
        armStreamStall();
        emitEvent(
          options.requestId,
          options.senderContext,
          { event: "chunk", requestId: options.requestId, delta: chunk },
          options.onEvent
        );
      }
    } finally {
      request.controller.signal.removeEventListener("abort", cancelReader);
      reader.releaseLock();
    }
    if (request.controller.signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    emitPromptPerformance({
      phase: "complete",
      durationMs: performance.now() - promptStartedAt,
      path: request.acquired.path,
      mode: options.mode,
      prewarmed: request.prewarmed,
      idleAgeBucket: request.idleAgeBucket,
      outcome: "success"
    });
    emitEvent(
      options.requestId,
      options.senderContext,
      { event: "complete", requestId: options.requestId },
      options.onEvent
    );
  } catch (error) {
    if (request.timeoutKind) {
      if (!request.hasReceivedChunk) {
        emitPromptPerformance({
          phase: "first_token",
          durationMs: performance.now() - promptStartedAt,
          path: request.acquired.path,
          mode: options.mode,
          prewarmed: request.prewarmed,
          idleAgeBucket: request.idleAgeBucket,
          outcome: "timeout"
        });
      }
      emitGenerationTerminal(request, "timeout");
      emitEvent(
        options.requestId,
        options.senderContext,
        {
          event: "error",
          requestId: options.requestId,
          error: timeoutError(request.timeoutKind)
        },
        options.onEvent
      );
    } else if (!isDomError(error, "AbortError")) {
      if (!request.hasReceivedChunk) {
        emitPromptPerformance({
          phase: "first_token",
          durationMs: performance.now() - promptStartedAt,
          path: request.acquired.path,
          mode: options.mode,
          prewarmed: request.prewarmed,
          idleAgeBucket: request.idleAgeBucket,
          outcome: "error"
        });
      }
      emitGenerationTerminal(request, "error");
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
    clearLongWaitOffer(request);
    clearTimer(firstTokenSoftTimer);
    clearTimer(firstTokenHardTimer);
    clearTimer(streamStallTimer);
    releaseRequest(request);
    activeRequests.delete(options.requestId);
  }
}

export async function startPromptExplanation(options: {
  requestId: string;
  text: string;
  mode: SelectionMode;
  senderContext: SenderContext;
  onEvent: PromptEventHandler;
  onStage?: (stage: PromptLoadingStage) => void;
  onLongWait?: (visible: boolean) => void;
  visibleStartedAt?: number;
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

  cancelPromptExplanation(requestId);
  const request: ActivePromptRequest = {
    controller: new AbortController(),
    acquired: null,
    timeoutKind: null,
    mode: options.mode,
    visibleStartedAt: options.visibleStartedAt ?? performance.now(),
    generationStartedAt: null,
    visibleWaitEmitted: false,
    hasReceivedChunk: false,
    prewarmed: false,
    idleAgeBucket: idleAgeBucket(),
    longWaitTimer: null,
    longWaitOffered: false,
    onLongWait: options.onLongWait
  };
  activeRequests.set(requestId, request);
  options.onStage?.("dispatching");
  request.longWaitTimer = setTimeout(() => {
    request.longWaitTimer = null;
    request.longWaitOffered = true;
    request.onLongWait?.(true);
  }, timeouts.cancelOfferMs);

  const acquisitionStartedAt = performance.now();
  let acquisitionTimedOut = false;
  const softTimer = setTimeout(
    () => options.onStage?.("acquiring_session"),
    timeouts.acquisitionSoftMs
  );
  const hardTimer = setTimeout(() => {
    acquisitionTimedOut = true;
    request.controller.abort();
  }, timeouts.acquisitionHardMs);

  try {
    request.acquired = await pagePromptSessionPool.acquire(request.controller.signal);
    keeperPageInstanceId = options.senderContext.pageInstanceId;
    reportKeeperLifecycle("touch", keeperPageInstanceId);
    request.prewarmed = request.acquired.prewarmed;
    emitPromptPerformance({
      phase: "acquire",
      durationMs: performance.now() - acquisitionStartedAt,
      path: request.acquired.path,
      mode: options.mode,
      prewarmed: request.prewarmed,
      idleAgeBucket: request.idleAgeBucket,
      outcome: "success"
    });
  } catch (error) {
    activeRequests.delete(requestId);
    clearLongWaitOffer(request);
    emitPromptPerformance({
      phase: "acquire",
      durationMs: performance.now() - acquisitionStartedAt,
      mode: options.mode,
      idleAgeBucket: request.idleAgeBucket,
      outcome: acquisitionTimedOut
        ? "timeout"
        : isDomError(error, "AbortError")
          ? "cancelled"
          : "error"
    });
    if (!request.visibleWaitEmitted) {
      emitVisibleWaitOutcome(
        request,
        acquisitionTimedOut
          ? "timeout"
          : isDomError(error, "AbortError")
            ? "cancelled"
            : "error"
      );
    }
    if (acquisitionTimedOut) {
      return {
        ok: false,
        error: createExtensionError(
          "model_startup_timeout",
          "Chrome took too long to connect to the on-device model.",
          true
        )
      };
    }
    if (isDomError(error, "AbortError")) {
      return {
        ok: false,
        error: createExtensionError(
          "request_cancelled",
          "The explanation request was cancelled.",
          false
        )
      };
    }
    return { ok: false, error: generationError(error) };
  } finally {
    clearTimeout(softTimer);
    clearTimeout(hardTimer);
  }

  setTimeout(() => void generate({ ...options, requestId, text }), 0);
  return { ok: true, requestId };
}

export function cancelPromptExplanation(requestId: string): void {
  const request = activeRequests.get(requestId);
  if (!request) return;
  request.controller.abort();
  emitGenerationTerminal(request, "cancelled");
  clearLongWaitOffer(request);
  releaseRequest(request);
  activeRequests.delete(requestId);
}

export function warmUpPromptModel(): Promise<void> {
  return pagePromptSessionPool.warmUp().then(() => undefined);
}

export function handlePromptPageVisibility(hidden: boolean): void {
  pageHidden = hidden;
  pagePromptSessionPool.handleVisibilityChange(hidden);
  if (keeperPageInstanceId) {
    reportKeeperLifecycle("visibility", keeperPageInstanceId);
  }
}

export function disposePromptResources(): void {
  for (const requestId of [...activeRequests.keys()]) {
    cancelPromptExplanation(requestId);
  }
  pagePromptSessionPool.dispose();
  unregisterKeeper();
  lastSuccessfulFirstTokenAt = null;
}

export function evictPromptKeeper(pageInstanceId: string): void {
  if (keeperPageInstanceId !== pageInstanceId) return;
  pagePromptSessionPool.dispose();
  keeperPageInstanceId = null;
}

export function setPromptClientTimeoutsForTesting(
  overrides: Partial<PromptClientTimeouts> | null
): void {
  timeouts = overrides
    ? { ...DEFAULT_TIMEOUTS, ...overrides }
    : { ...DEFAULT_TIMEOUTS };
}
