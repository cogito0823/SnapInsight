import test from "node:test";
import assert from "node:assert/strict";

import { registerPromptHost } from "../../src/prompt-api/host";
import type {
  LanguageModelApi,
  LanguageModelSession
} from "../../src/prompt-api/language-model";
import { installMockChrome } from "../helpers/mock-chrome";

async function flushTasks(): Promise<void> {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 10));
}

test("prompt host streams Chrome Prompt API chunks through the existing event contract", async () => {
  const emittedMessages: unknown[] = [];
  const chromeEnv = installMockChrome({
    sendMessage: async (message) => {
      emittedMessages.push(message);
      return undefined;
    }
  });
  const originalLanguageModel = globalThis.LanguageModel;
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
    registerPromptHost();
    await chromeEnv.emitRuntimeMessage({
      type: "promptHost.start",
      target: "prompt-host",
      payload: {
        requestId: "prompt-1",
        text: "Transformer",
        mode: "short"
      }
    });
    await flushTasks();

    assert.match(receivedPrompt, /Transformer/);
    assert.equal(destroyed, true);
    assert.deepEqual(
      emittedMessages.map((message) =>
        typeof message === "object" &&
        message !== null &&
        "payload" in message &&
        typeof message.payload === "object" &&
        message.payload !== null &&
        "event" in message.payload &&
        typeof message.payload.event === "object" &&
        message.payload.event !== null &&
        "event" in message.payload.event
          ? message.payload.event.event
          : null
      ),
      ["start", "chunk", "chunk", "complete"]
    );
  } finally {
    globalThis.LanguageModel = originalLanguageModel;
    chromeEnv.restore();
  }
});

test("prompt host reports unsupported devices before accepting a request", async () => {
  const chromeEnv = installMockChrome({
    sendMessage: async () => undefined
  });
  const originalLanguageModel = globalThis.LanguageModel;
  let createCalled = false;
  globalThis.LanguageModel = {
    availability: async () => "unavailable",
    create: async () => {
      createCalled = true;
      throw new Error("create should not be called");
    }
  };

  try {
    registerPromptHost();
    await chromeEnv.emitRuntimeMessage({
      type: "promptHost.start",
      target: "prompt-host",
      payload: {
        requestId: "prompt-unavailable",
        text: "Transformer",
        mode: "short"
      }
    });

    assert.equal(chromeEnv.sentMessages.length, 0);
    assert.equal(createCalled, false);
  } finally {
    globalThis.LanguageModel = originalLanguageModel;
    chromeEnv.restore();
  }
});
