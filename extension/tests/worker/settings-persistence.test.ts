import test from "node:test";
import assert from "node:assert/strict";

import { handleSettingsGetSelectedModel } from "../../src/worker/handlers/settings-get-selected-model";
import { handleSettingsSetSelectedModel } from "../../src/worker/handlers/settings-set-selected-model";
import { installMockChrome } from "../helpers/mock-chrome";

function installFetchMock(
  implementation: (input: string) => Promise<Response>
): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) =>
    implementation(String(input))) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("valid selected model persists and is readable afterward", async () => {
  const chromeEnv = installMockChrome();
  const restoreFetch = installFetchMock(async (input) => {
    if (input.endsWith("/health")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "snapinsight-local-api",
          version: "v1",
          ollamaReachable: true
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    if (input.endsWith("/v1/models")) {
      return new Response(
        JSON.stringify({
          state: "ready",
          models: [
            {
              id: "llama3.1:8b",
              label: "llama3.1:8b",
              provider: "ollama",
              available: true
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    throw new Error(`Unexpected fetch input: ${input}`);
  });

  try {
    const saveResponse = await handleSettingsSetSelectedModel({
      type: "settings.setSelectedModel",
      payload: {
        selectedModel: "llama3.1:8b"
      }
    });

    assert.equal(saveResponse.ok, true);
    assert.equal(
      chromeEnv.storageState["settings.selectedModel"],
      "llama3.1:8b"
    );
    assert.deepEqual(chromeEnv.storageState["settings.lastKnownModels"], [
      {
        id: "llama3.1:8b",
        label: "llama3.1:8b",
        provider: "ollama",
        available: true
      }
    ]);
    assert.equal(
      typeof chromeEnv.storageState["settings.lastModelRefreshAt"],
      "string"
    );

    const readResponse = await handleSettingsGetSelectedModel();

    assert.deepEqual(readResponse, {
      ok: true,
      data: {
        selectedModel: "llama3.1:8b",
        lastKnownModels: [
          {
            id: "llama3.1:8b",
            label: "llama3.1:8b",
            provider: "ollama",
            available: true
          }
        ],
        lastModelRefreshAt: chromeEnv.storageState[
          "settings.lastModelRefreshAt"
        ]
      }
    });
  } finally {
    restoreFetch();
    chromeEnv.restore();
  }
});

test("stale selected model is rejected without overwriting persisted selection", async () => {
  const chromeEnv = installMockChrome({
    initialStorage: {
      "settings.selectedModel": "persisted:model"
    }
  });
  const restoreFetch = installFetchMock(async (input) => {
    if (input.endsWith("/health")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "snapinsight-local-api",
          version: "v1",
          ollamaReachable: true
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    if (input.endsWith("/v1/models")) {
      return new Response(
        JSON.stringify({
          state: "ready",
          models: [
            {
              id: "another:model",
              label: "another:model",
              provider: "ollama",
              available: true
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    throw new Error(`Unexpected fetch input: ${input}`);
  });

  try {
    const saveResponse = await handleSettingsSetSelectedModel({
      type: "settings.setSelectedModel",
      payload: {
        selectedModel: "missing:model"
      }
    });

    assert.equal(saveResponse.ok, false);
    if (saveResponse.ok) {
      throw new Error("Expected stale selection to fail.");
    }

    assert.deepEqual(saveResponse.error, {
      code: "selected_model_unavailable",
      message: "The selected model is no longer available.",
      retryable: false
    });
    assert.equal(
      chromeEnv.storageState["settings.selectedModel"],
      "persisted:model"
    );
  } finally {
    restoreFetch();
    chromeEnv.restore();
  }
});
