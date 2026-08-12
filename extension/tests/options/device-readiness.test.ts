import test from "node:test";
import assert from "node:assert/strict";

import {
  preparePromptModel,
  readPromptReadiness
} from "../../src/prompt-api/readiness";
import { renderOptionsPage } from "../../src/options/components/options-page";

test("device status page presents first-run preparation and privacy guidance", () => {
  const html = renderOptionsPage({
    phase: "downloadable",
    progress: null,
    errorMessage: null
  });
  assert.match(html, /准备本地模型/);
  assert.match(html, /不申请网站主机访问权限/);
  assert.match(html, /只把你选中的文字/);
  assert.doesNotMatch(html, /Ollama|本地服务/);
});

test("readiness maps missing and available Prompt API states", async () => {
  const original = globalThis.LanguageModel;
  try {
    globalThis.LanguageModel = undefined;
    assert.deepEqual(await readPromptReadiness(), {
      state: "unsupported",
      availability: "missing"
    });
    globalThis.LanguageModel = {
      availability: async () => "available",
      create: async () => {
        throw new Error("not needed");
      }
    };
    assert.deepEqual(await readPromptReadiness(), {
      state: "ready",
      availability: "available"
    });
  } finally {
    globalThis.LanguageModel = original;
  }
});

test("first-run preparation reports download progress and destroys its probe session", async () => {
  const original = globalThis.LanguageModel;
  const progress: number[] = [];
  let destroyed = false;
  try {
    globalThis.LanguageModel = {
      availability: async () => "downloadable",
      create: async (options) => {
        options?.monitor?.({
          addEventListener: (_type, listener) =>
            listener({ loaded: 0.42 } as Event & { loaded: number })
        });
        return {
          prompt: async () => "",
          promptStreaming: () => new ReadableStream<string>(),
          destroy: () => {
            destroyed = true;
          }
        };
      }
    };
    await preparePromptModel({ onProgress: (value) => progress.push(value) });
    assert.deepEqual(progress, [42, 100]);
    assert.equal(destroyed, true);
  } finally {
    globalThis.LanguageModel = original;
  }
});
