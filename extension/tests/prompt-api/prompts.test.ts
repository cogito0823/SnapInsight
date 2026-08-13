import test from "node:test";
import assert from "node:assert/strict";

import { buildExplanationPrompt } from "../../src/prompt-api/prompts";

function withUiLanguage(language: string, callback: () => void): void {
  const originalChrome = globalThis.chrome;
  globalThis.chrome = {
    i18n: {
      getUILanguage: () => language
    }
  } as typeof chrome;

  try {
    callback();
  } finally {
    globalThis.chrome = originalChrome;
  }
}

test("short explanations follow the Chrome UI language, not the selected text", () => {
  withUiLanguage("zh-CN", () => {
    const prompt = buildExplanationPrompt("Transformer", "short");

    assert.match(prompt, /Chrome UI language \(zh-CN\)/);
    assert.match(prompt, /regardless of the selected text's language/);
  });
});

test("detailed explanations include the English Chrome UI language", () => {
  withUiLanguage("en-US", () => {
    const prompt = buildExplanationPrompt("注意力机制", "detailed");

    assert.match(prompt, /Chrome UI language \(en-US\)/);
    assert.match(prompt, /Selected text: 注意力机制/);
  });
});
