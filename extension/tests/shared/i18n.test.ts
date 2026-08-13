import test from "node:test";
import assert from "node:assert/strict";

import { getUiLanguage, t } from "../../src/shared/i18n";

test("uses Chinese fallback messages outside the extension runtime", () => {
  assert.equal(t("retry"), "重试");
  assert.equal(t("statusPreparingProgress", 42), "模型下载进度：42%");
  assert.equal(getUiLanguage(), "zh-CN");
});

test("uses Chrome localized messages and UI language when available", () => {
  const originalChrome = globalThis.chrome;
  globalThis.chrome = {
    i18n: {
      getMessage: (key: string, substitutions?: string | string[]) => {
        if (key !== "statusPreparingProgress") return `en:${key}`;
        const value = Array.isArray(substitutions) ? substitutions[0] : substitutions;
        return `Progress: ${value}%`;
      },
      getUILanguage: () => "en-US"
    }
  } as typeof chrome;

  try {
    assert.equal(t("retry"), "en:retry");
    assert.equal(t("statusPreparingProgress", 24), "Progress: 24%");
    assert.equal(getUiLanguage(), "en-US");
  } finally {
    globalThis.chrome = originalChrome;
  }
});
