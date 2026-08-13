import test from "node:test";
import assert from "node:assert/strict";

import {
  cancelPromptExplanation,
  startPromptExplanation
} from "../../src/content/prompt-api/prompt-client";
import type { ExplanationEventMessage } from "../../src/shared/contracts/events";
import type {
  LanguageModelApi,
  LanguageModelSession
} from "../../src/prompt-api/language-model";

async function flushTasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 10));
}

const senderContext = { tabId: -1, frameId: 0, pageInstanceId: "page-1" };

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
