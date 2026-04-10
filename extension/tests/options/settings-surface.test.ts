import test from "node:test";
import assert from "node:assert/strict";

import { loadSettingsSurface } from "../../src/options/actions/load-settings";
import { renderOptionsPage } from "../../src/options/components/options-page";
import { installMockChrome } from "../helpers/mock-chrome";

test("stale cache diagnostics are rendered only as non-authoritative fallback", async () => {
  const chromeEnv = installMockChrome({
    sendMessage: async (message) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "settings.getSelectedModel"
      ) {
        return {
          ok: true,
          data: {
            selectedModel: "cached:model",
            lastKnownModels: [
              {
                id: "cached:model",
                label: "cached:model",
                provider: "ollama",
                available: true
              }
            ],
            lastModelRefreshAt: "2026-04-10T10:00:00.000Z"
          }
        };
      }

      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "models.list"
      ) {
        return {
          ok: false,
          error: {
            code: "request_failed",
            message: "Model list could not be loaded.",
            retryable: true
          }
        };
      }

      throw new Error(`Unexpected message: ${JSON.stringify(message)}`);
    }
  });

  try {
    const loadedState = await loadSettingsSurface();
    const html = renderOptionsPage({
      selectedModelDraft: null,
      persistedSelectedModel: null,
      availableModels: [],
      modelCatalogState: null,
      loadingPhase: "idle",
      loadError: null,
      saveError: null,
      saveSuccessMessage: null,
      isSaving: false,
      lastKnownModels: [],
      lastModelRefreshAt: null,
      ...loadedState
    });

    assert.equal(loadedState.loadingPhase, "error");
    assert.deepEqual(loadedState.lastKnownModels, [
      {
        id: "cached:model",
        label: "cached:model",
        provider: "ollama",
        available: true
      }
    ]);
    assert.match(html, /缓存诊断信息/);
    assert.match(html, /id="save-model-button" disabled/);
    assert.match(html, /不能用于当前保存校验/);
    assert.equal(
      chromeEnv.sentMessages.some(
        (message) =>
          typeof message === "object" &&
          message !== null &&
          "type" in message &&
          message.type === "settings.setSelectedModel"
      ),
      false
    );
  } finally {
    chromeEnv.restore();
  }
});
