import {
  getLanguageModelApi,
  type LanguageModelApi,
  type LanguageModelSession
} from "../../prompt-api/language-model";
import { SNAPINSIGHT_SYSTEM_PROMPT } from "../../prompt-api/prompts";
import {
  createExtensionError,
  type ExtensionError
} from "../../shared/errors/error-codes";
import { emitPromptPerformance } from "./prompt-performance";

export interface PromptSessionPoolOptions {
  availabilityTimeoutMs?: number;
  availableReadinessTtlMs?: number;
  blockedReadinessTtlMs?: number;
  unusedWarmupTtlMs?: number;
  quotaBackoffMs?: number;
  getApi?: () => LanguageModelApi | null;
}

export interface AcquiredPromptSession {
  session: LanguageModelSession;
  path: "warm" | "fallback";
  prewarmed: boolean;
  release(): void;
}

export type PromptWarmUpResult =
  | { ok: true }
  | { ok: false; error: ExtensionError };

export class PromptSessionPoolError extends Error {
  constructor(public readonly extensionError: ExtensionError) {
    super(extensionError.message);
    this.name = "PromptSessionPoolError";
  }
}

const DEFAULTS = {
  availabilityTimeoutMs: 5_000,
  availableReadinessTtlMs: 60_000,
  blockedReadinessTtlMs: 5_000,
  unusedWarmupTtlMs: 15_000,
  quotaBackoffMs: 10_000
};

function destroySession(session: LanguageModelSession | null): void {
  if (!session) return;
  try {
    session.destroy();
  } catch {
    // Destruction can race with Chrome teardown or an AbortSignal.
  }
}

function poolError(error: ExtensionError): never {
  throw new PromptSessionPoolError(error);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isDomError(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}

function raceAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    void promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

function raceSessionAbort(
  promise: Promise<LanguageModelSession>,
  signal: AbortSignal
): Promise<LanguageModelSession> {
  if (signal.aborted) {
    void promise.then(destroySession, () => undefined);
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  return new Promise<LanguageModelSession>((resolve, reject) => {
    let aborted = false;
    const onAbort = (): void => {
      aborted = true;
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    void promise.then(
      (session) => {
        signal.removeEventListener("abort", onAbort);
        if (aborted) {
          destroySession(session);
          return;
        }
        resolve(session);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        if (!aborted) reject(error);
      }
    );
  });
}

export class PromptSessionPool {
  private readonly options: Required<Omit<PromptSessionPoolOptions, "getApi">> & {
    getApi: () => LanguageModelApi | null;
  };
  private template: LanguageModelSession | null = null;
  private creationPromise: Promise<LanguageModelSession> | null = null;
  private creationController: AbortController | null = null;
  private disposalTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffUntil = 0;
  private readinessCache: {
    availability: Awaited<ReturnType<LanguageModelApi["availability"]>>;
    expiresAt: number;
  } | null = null;
  private activeRequests = 0;
  private templateWasUsed = false;
  private lifecycleGeneration = 0;
  private warmupInFlight = false;
  private templatePrewarmed = false;

  constructor(options: PromptSessionPoolOptions = {}) {
    this.options = {
      availabilityTimeoutMs:
        options.availabilityTimeoutMs ?? DEFAULTS.availabilityTimeoutMs,
      availableReadinessTtlMs:
        options.availableReadinessTtlMs ?? DEFAULTS.availableReadinessTtlMs,
      blockedReadinessTtlMs:
        options.blockedReadinessTtlMs ?? DEFAULTS.blockedReadinessTtlMs,
      unusedWarmupTtlMs:
        options.unusedWarmupTtlMs ?? DEFAULTS.unusedWarmupTtlMs,
      quotaBackoffMs: options.quotaBackoffMs ?? DEFAULTS.quotaBackoffMs,
      getApi: options.getApi ?? getLanguageModelApi
    };
  }

  private clearDisposalTimer(): void {
    if (this.disposalTimer !== null) {
      clearTimeout(this.disposalTimer);
      this.disposalTimer = null;
    }
  }

  private async readAvailability(
    api: LanguageModelApi,
    signal: AbortSignal
  ): Promise<void> {
    const cached = this.readinessCache;
    if (cached && cached.expiresAt > Date.now()) {
      emitPromptPerformance({
        phase: "availability",
        durationMs: 0,
        cacheHit: true,
        outcome: "success"
      });
      this.assertAvailability(cached.availability);
      return;
    }

    const startedAt = performance.now();
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const availability = await raceAbort(Promise.race([
        api.availability(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new PromptSessionPoolError(
                  createExtensionError(
                    "readiness_timeout",
                    "Chrome's on-device model readiness check timed out.",
                    true
                  )
                )
              ),
            this.options.availabilityTimeoutMs
          );
        })
      ]), signal);
      emitPromptPerformance({
        phase: "availability",
        durationMs: performance.now() - startedAt,
        cacheHit: false,
        outcome: "success"
      });

      this.readinessCache = {
        availability,
        expiresAt:
          Date.now() +
          (availability === "available"
            ? this.options.availableReadinessTtlMs
            : this.options.blockedReadinessTtlMs)
      };
      this.assertAvailability(availability);
    } catch (error) {
      if (
        !(error instanceof PromptSessionPoolError) ||
        error.extensionError.code === "readiness_timeout"
      ) {
        emitPromptPerformance({
          phase: "availability",
          durationMs: performance.now() - startedAt,
          cacheHit: false,
          outcome:
            error instanceof PromptSessionPoolError &&
            error.extensionError.code === "readiness_timeout"
              ? "timeout"
              : isAbortError(error)
                ? "cancelled"
                : "error"
        });
      }
      if (error instanceof PromptSessionPoolError || isAbortError(error)) throw error;
      poolError(
        createExtensionError(
          "service_unavailable",
          "Chrome Prompt API readiness could not be checked.",
          true
        )
      );
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  }

  private assertAvailability(
    availability: Awaited<ReturnType<LanguageModelApi["availability"]>>
  ): void {
    if (availability === "downloadable") {
      poolError(
        createExtensionError(
          "model_download_required",
          "Chrome's on-device model must be prepared before use.",
          false
        )
      );
    }
    if (availability === "downloading") {
      poolError(
        createExtensionError(
          "model_downloading",
          "Chrome is still downloading the on-device model.",
          true
        )
      );
    }
    if (availability === "unavailable") {
      poolError(
        createExtensionError(
          "device_unsupported",
          "This device does not support Chrome's on-device model.",
          false
        )
      );
    }
  }

  private async createTemplate(signal: AbortSignal): Promise<LanguageModelSession> {
    if (Date.now() < this.backoffUntil) {
      poolError(
        createExtensionError(
          "quota_exceeded",
          "Chrome's on-device model is cooling down after a capacity error.",
          true
        )
      );
    }

    const api = this.options.getApi();
    if (!api) {
      poolError(
        createExtensionError(
          "prompt_api_unavailable",
          "Chrome Prompt API is not available in this browser context.",
          false
        )
      );
    }

    await this.readAvailability(api, signal);
    const startedAt = performance.now();
    try {
      const session = await raceSessionAbort(api.create({
        signal,
        initialPrompts: [{ role: "system", content: SNAPINSIGHT_SYSTEM_PROMPT }]
      }), signal);
      emitPromptPerformance({
        phase: "template_create",
        durationMs: performance.now() - startedAt,
        path: "cold",
        outcome: "success"
      });
      return session;
    } catch (error) {
      this.readinessCache = null;
      emitPromptPerformance({
        phase: "template_create",
        durationMs: performance.now() - startedAt,
        path: "cold",
        outcome: isAbortError(error) ? "cancelled" : "error"
      });
      if (isDomError(error, "QuotaExceededError")) {
        this.backoffUntil = Date.now() + this.options.quotaBackoffMs;
        throw new PromptSessionPoolError(
          createExtensionError(
            "quota_exceeded",
            "Chrome's on-device model has no capacity for another session.",
            true
          )
        );
      }
      throw error;
    }
  }

  private ensureTemplate(signal?: AbortSignal): Promise<LanguageModelSession> {
    this.clearDisposalTimer();
    if (this.template) return Promise.resolve(this.template);

    if (!this.creationPromise) {
      const generation = this.lifecycleGeneration;
      const controller = new AbortController();
      this.creationController = controller;
      const creationPromise = this.createTemplate(controller.signal)
        .then((template) => {
          if (generation !== this.lifecycleGeneration) {
            destroySession(template);
            throw new DOMException("Prompt session pool was disposed", "AbortError");
          }
          this.template = template;
          this.templateWasUsed = false;
          this.scheduleIdleDisposal();
          return template;
        })
        .finally(() => {
          if (this.creationPromise === creationPromise) {
            this.creationPromise = null;
            this.creationController = null;
          }
        });
      this.creationPromise = creationPromise;
    }

    return raceAbort(this.creationPromise, signal);
  }

  async warmUp(): Promise<PromptWarmUpResult> {
    this.warmupInFlight = true;
    try {
      await this.ensureTemplate();
      this.templatePrewarmed = true;
      return { ok: true };
    } catch (error) {
      if (error instanceof PromptSessionPoolError) {
        return { ok: false, error: error.extensionError };
      }
      return {
        ok: false,
        error: createExtensionError(
          "request_failed",
          "Chrome's on-device model could not be initialized.",
          true
        )
      };
    } finally {
      this.warmupInFlight = false;
    }
  }

  async acquire(signal: AbortSignal, allowRetry = true): Promise<AcquiredPromptSession> {
    this.clearDisposalTimer();
    const prewarmed = this.templatePrewarmed || this.warmupInFlight;
    const template = await this.ensureTemplate(signal);
    this.clearDisposalTimer();
    this.templatePrewarmed = false;

    let session: LanguageModelSession;
    let path: AcquiredPromptSession["path"];
    const startedAt = performance.now();
    try {
      if (template.clone) {
        session = await raceSessionAbort(template.clone({ signal }), signal);
        path = "warm";
        emitPromptPerformance({
          phase: "clone",
          durationMs: performance.now() - startedAt,
          path: "warm",
          outcome: "success"
        });
      } else {
        const api = this.options.getApi();
        if (!api) {
          poolError(
            createExtensionError(
              "prompt_api_unavailable",
              "Chrome Prompt API is not available in this browser context.",
              false
            )
          );
        }
        // Keep the clean template untouched as the document's model-ready
        // keeper. Without clone(), every explanation gets a separate session
        // so request history can never enter the keeper or another request.
        session = await raceSessionAbort(api.create({
          signal,
          initialPrompts: [{ role: "system", content: SNAPINSIGHT_SYSTEM_PROMPT }]
        }), signal);
        path = "fallback";
        emitPromptPerformance({
          phase: "fallback_create",
          durationMs: performance.now() - startedAt,
          path: "fallback",
          outcome: "success"
        });
      }
    } catch (error) {
      this.readinessCache = null;
      emitPromptPerformance({
        phase: template.clone ? "clone" : "fallback_create",
        durationMs: performance.now() - startedAt,
        path: template.clone ? "warm" : "fallback",
        outcome: isAbortError(error) ? "cancelled" : "error"
      });
      if (isDomError(error, "QuotaExceededError")) {
        this.noteQuotaFailure();
        throw new PromptSessionPoolError(
          createExtensionError(
            "quota_exceeded",
            "Chrome's on-device model has no capacity for another session.",
            true
          )
        );
      }
      if (
        template.clone &&
        allowRetry &&
        isDomError(error, "InvalidStateError")
      ) {
        this.invalidate();
        return this.acquire(signal, false);
      }
      this.scheduleIdleDisposal();
      throw error;
    }

    this.templateWasUsed = true;
    this.activeRequests += 1;
    let released = false;
    return {
      session,
      path,
      prewarmed,
      release: () => {
        if (released) return;
        released = true;
        destroySession(session);
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        this.scheduleIdleDisposal();
      }
    };
  }

  noteQuotaFailure(): void {
    this.backoffUntil = Date.now() + this.options.quotaBackoffMs;
    this.invalidate();
  }

  scheduleIdleDisposal(): void {
    this.clearDisposalTimer();
    if (!this.template || this.activeRequests > 0) return;
    if (this.templateWasUsed) {
      // A used keeper follows the document lifetime, including while hidden,
      // so the extension does not deliberately make Chrome's model runtime
      // cold after a long tab or application switch.
      return;
    }
    this.disposalTimer = setTimeout(
      () => this.dispose(),
      this.options.unusedWarmupTtlMs
    );
  }

  handleVisibilityChange(_hidden: boolean): void {
    this.scheduleIdleDisposal();
  }

  invalidate(): void {
    this.lifecycleGeneration += 1;
    this.clearDisposalTimer();
    this.creationController?.abort();
    this.creationController = null;
    this.creationPromise = null;
    destroySession(this.template);
    this.template = null;
    this.templateWasUsed = false;
    this.templatePrewarmed = false;
    this.readinessCache = null;
  }

  dispose(): void {
    this.invalidate();
  }
}

export const pagePromptSessionPool = new PromptSessionPool();
