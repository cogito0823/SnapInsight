import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  cancelPromptExplanation,
  disposePromptResources,
  setPromptClientTimeoutsForTesting,
  startPromptExplanation,
  warmUpPromptModel
} from "../../src/content/prompt-api/prompt-client";
import {
  setPromptPerformanceSink,
  type PromptPerformanceEvent
} from "../../src/content/prompt-api/prompt-performance";
import type { ExplanationEventMessage } from "../../src/shared/contracts/events";
import type {
  LanguageModelApi,
  LanguageModelSession
} from "../../src/prompt-api/language-model";

async function flushTasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 10));
}

const senderContext = { tabId: -1, frameId: 0, pageInstanceId: "page-1" };

beforeEach(() => {
  disposePromptResources();
  setPromptClientTimeoutsForTesting(null);
});

afterEach(() => {
  disposePromptResources();
  setPromptClientTimeoutsForTesting(null);
  setPromptPerformanceSink(null);
});

test("content prompt client streams model events directly to the page", async () => {
  const originalLanguageModel = globalThis.LanguageModel;
  const events: ExplanationEventMessage[] = [];
  let receivedPrompt = "";
  let destroyed = false;
  const session: LanguageModelSession = {
    prompt: async () => "",
    promptStreaming: (prompt) => {
      receivedPrompt = prompt;
      return new ReadableStream<string>({
        start(controller) {
          controller.enqueue("简短");
          controller.enqueue("解释");
          controller.close();
        }
      });
    },
    destroy: () => {
      destroyed = true;
    }
  };
  globalThis.LanguageModel = {
    availability: async () => "available",
    create: async () => session
  } satisfies LanguageModelApi;

  try {
    const response = await startPromptExplanation({
      requestId: "prompt-1",
      text: "Transformer",
      mode: "short",
      senderContext,
      onEvent: (event) => events.push(event)
    });
    await flushTasks();

    assert.deepEqual(response, { ok: true, requestId: "prompt-1" });
    assert.match(receivedPrompt, /Transformer/);
    assert.equal(destroyed, true);
    assert.deepEqual(
      events.map((message) => message.payload.event.event),
      ["start", "chunk", "chunk", "complete"]
    );
  } finally {
    globalThis.LanguageModel = originalLanguageModel;
  }
});

test("content prompt client rejects an unprepared device before creating a session", async () => {
  const originalLanguageModel = globalThis.LanguageModel;
  let createCalled = false;
  globalThis.LanguageModel = {
    availability: async () => "downloadable",
    create: async () => {
      createCalled = true;
      throw new Error("create should not be called");
    }
  };

  try {
    const response = await startPromptExplanation({
      requestId: "prompt-unprepared",
      text: "Transformer",
      mode: "short",
      senderContext,
      onEvent: () => undefined
    });

    assert.equal(response.ok, false);
    assert.equal(createCalled, false);
    if (!response.ok) {
      assert.equal(response.error.code, "model_download_required");
    }
  } finally {
    globalThis.LanguageModel = originalLanguageModel;
  }
});

test("content prompt client maps availability failures to a retryable startup error", async () => {
  const originalLanguageModel = globalThis.LanguageModel;
  globalThis.LanguageModel = {
    availability: async () => {
      throw new Error("readiness failed");
    },
    create: async () => {
      throw new Error("create should not be called");
    }
  };

  try {
    const response = await startPromptExplanation({
      requestId: "prompt-readiness-error",
      text: "Transformer",
      mode: "short",
      senderContext,
      onEvent: () => undefined
    });

    assert.equal(response.ok, false);
    if (!response.ok) {
      assert.equal(response.error.code, "service_unavailable");
      assert.equal(response.error.retryable, true);
    }
  } finally {
    globalThis.LanguageModel = originalLanguageModel;
  }
});

test("content prompt cancellation aborts and destroys its page-scoped session", async () => {
  const originalLanguageModel = globalThis.LanguageModel;
  let destroyed = false;
  let observedSignal: AbortSignal | undefined;
  globalThis.LanguageModel = {
    availability: async () => "available",
    create: async () => ({
      prompt: async () => "",
      promptStreaming: (_prompt, options) => {
        observedSignal = options?.signal;
        return new ReadableStream<string>();
      },
      destroy: () => {
        destroyed = true;
      }
    })
  };

  try {
    await startPromptExplanation({
      requestId: "prompt-cancel",
      text: "Transformer",
      mode: "short",
      senderContext,
      onEvent: () => undefined
    });
    await flushTasks();
    cancelPromptExplanation("prompt-cancel");

    assert.equal(observedSignal?.aborted, true);
    assert.equal(destroyed, true);
  } finally {
    globalThis.LanguageModel = originalLanguageModel;
  }
});

test("content prompt client reports a model startup timeout and slow-start stage", async () => {
  const originalLanguageModel = globalThis.LanguageModel;
  const stages: string[] = [];
  globalThis.LanguageModel = {
    availability: async () => "available",
    create: async (options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true }
        );
      })
  };
  setPromptClientTimeoutsForTesting({
    acquisitionSoftMs: 2,
    acquisitionHardMs: 8
  });

  try {
    const response = await startPromptExplanation({
      requestId: "prompt-startup-timeout",
      text: "Transformer",
      mode: "short",
      senderContext,
      onEvent: () => undefined,
      onStage: (stage) => stages.push(stage)
    });

    assert.equal(response.ok, false);
    if (!response.ok) assert.equal(response.error.code, "model_startup_timeout");
    assert.deepEqual(stages, ["generating", "starting_model"]);
  } finally {
    globalThis.LanguageModel = originalLanguageModel;
  }
});

test("content prompt client aborts when the first token times out", async () => {
  const originalLanguageModel = globalThis.LanguageModel;
  const events: ExplanationEventMessage[] = [];
  globalThis.LanguageModel = {
    availability: async () => "available",
    create: async () => ({
      prompt: async () => "",
      promptStreaming: () => new ReadableStream<string>(),
      clone: async () => ({
        prompt: async () => "",
        promptStreaming: () => new ReadableStream<string>(),
        destroy: () => undefined
      }),
      destroy: () => undefined
    })
  };
  setPromptClientTimeoutsForTesting({
    firstTokenSoftMs: 2,
    firstTokenHardMs: 8,
    streamStallMs: 50
  });

  try {
    const response = await startPromptExplanation({
      requestId: "prompt-first-token-timeout",
      text: "Transformer",
      mode: "short",
      senderContext,
      onEvent: (event) => events.push(event)
    });
    assert.equal(response.ok, true);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const errorEvent = events.find(
      (event) => event.payload.event.event === "error"
    );
    assert.ok(errorEvent);
    if (errorEvent.payload.event.event === "error") {
      assert.equal(errorEvent.payload.event.error.code, "first_token_timeout");
    }
  } finally {
    globalThis.LanguageModel = originalLanguageModel;
  }
});

test("content prompt client detects a stalled stream after visible content", async () => {
  const originalLanguageModel = globalThis.LanguageModel;
  const events: ExplanationEventMessage[] = [];
  const requestSession: LanguageModelSession = {
    prompt: async () => "",
    promptStreaming: () =>
      new ReadableStream<string>({
        start(controller) {
          controller.enqueue("partial");
        }
      }),
    destroy: () => undefined
  };
  globalThis.LanguageModel = {
    availability: async () => "available",
    create: async () => ({
      prompt: async () => "",
      promptStreaming: () => new ReadableStream<string>(),
      clone: async () => requestSession,
      destroy: () => undefined
    })
  };
  setPromptClientTimeoutsForTesting({
    firstTokenHardMs: 50,
    streamStallMs: 8
  });

  try {
    await startPromptExplanation({
      requestId: "prompt-stream-stall",
      text: "Transformer",
      mode: "short",
      senderContext,
      onEvent: (event) => events.push(event)
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.deepEqual(
      events.map((event) => event.payload.event.event),
      ["start", "chunk", "error"]
    );
    const errorEvent = events[2].payload.event;
    if (errorEvent.event === "error") {
      assert.equal(errorEvent.error.code, "stream_stalled");
    }
  } finally {
    globalThis.LanguageModel = originalLanguageModel;
  }
});

test("long model wait offers cancellation and hides it after cancellation", async () => {
  const originalLanguageModel = globalThis.LanguageModel;
  const longWaitVisibility: boolean[] = [];
  globalThis.LanguageModel = {
    availability: async () => "available",
    create: async () => ({
      prompt: async () => "",
      promptStreaming: () => new ReadableStream<string>(),
      clone: async () => ({
        prompt: async () => "",
        promptStreaming: () => new ReadableStream<string>(),
        destroy: () => undefined
      }),
      destroy: () => undefined
    })
  };
  setPromptClientTimeoutsForTesting({
    cancelOfferMs: 3,
    firstTokenHardMs: 50
  });

  try {
    await startPromptExplanation({
      requestId: "prompt-cancel-offer",
      text: "Transformer",
      mode: "short",
      senderContext,
      onEvent: () => undefined,
      onLongWait: (visible) => longWaitVisibility.push(visible)
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(longWaitVisibility, [true]);
    cancelPromptExplanation("prompt-cancel-offer");
    assert.deepEqual(longWaitVisibility, [true, false]);
  } finally {
    globalThis.LanguageModel = originalLanguageModel;
  }
});

test("performance events record prewarm hit, acquisition, and visible wait", async () => {
  const originalLanguageModel = globalThis.LanguageModel;
  const performanceEvents: PromptPerformanceEvent[] = [];
  globalThis.LanguageModel = {
    availability: async () => "available",
    create: async () => ({
      prompt: async () => "",
      promptStreaming: () => new ReadableStream<string>(),
      clone: async () => ({
        prompt: async () => "",
        promptStreaming: () =>
          new ReadableStream<string>({
            start(controller) {
              controller.enqueue("result");
              controller.close();
            }
          }),
        destroy: () => undefined
      }),
      destroy: () => undefined
    })
  };
  setPromptPerformanceSink((event) => performanceEvents.push(event));

  try {
    await warmUpPromptModel();
    await startPromptExplanation({
      requestId: "prompt-prewarmed-performance",
      text: "Transformer",
      mode: "short",
      senderContext,
      visibleStartedAt: performance.now() - 5,
      onEvent: () => undefined
    });
    await flushTasks();

    const acquire = performanceEvents.find((event) => event.phase === "acquire");
    const visibleWait = performanceEvents.find(
      (event) => event.phase === "visible_wait"
    );
    assert.equal(acquire?.prewarmed, true);
    assert.equal(visibleWait?.prewarmed, true);
    assert.equal(visibleWait?.outcome, "success");
    assert.ok((visibleWait?.durationMs ?? 0) >= 5);
  } finally {
    globalThis.LanguageModel = originalLanguageModel;
  }
});

test("pending session acquisition can be cancelled before create resolves", async () => {
  const originalLanguageModel = globalThis.LanguageModel;
  let resolveCreate!: (session: LanguageModelSession) => void;
  let lateSessionDestroyed = false;
  globalThis.LanguageModel = {
    availability: async () => "available",
    create: async () =>
      new Promise<LanguageModelSession>((resolve) => {
        resolveCreate = resolve;
      })
  };

  try {
    const pending = startPromptExplanation({
      requestId: "prompt-pending-cancel",
      text: "Transformer",
      mode: "short",
      senderContext,
      onEvent: () => undefined
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    cancelPromptExplanation("prompt-pending-cancel");
    const response = await pending;
    assert.equal(response.ok, false);
    if (!response.ok) assert.equal(response.error.code, "request_cancelled");

    resolveCreate(
      sessionWithDestroy(() => {
        lateSessionDestroyed = true;
      })
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(lateSessionDestroyed, false);
    disposePromptResources();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(lateSessionDestroyed, true);
  } finally {
    globalThis.LanguageModel = originalLanguageModel;
  }
});

function sessionWithDestroy(onDestroy: () => void): LanguageModelSession {
  return {
    prompt: async () => "",
    promptStreaming: () => new ReadableStream<string>(),
    destroy: onDestroy
  };
}
