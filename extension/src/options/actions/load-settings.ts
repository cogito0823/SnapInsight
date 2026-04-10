import type { ExtensionError } from "../../shared/errors/error-codes";
import type { ModelSummary } from "../../shared/models/model-summary";
import type { OptionsState } from "../state/options-state";
import {
  requestModelCatalog,
  requestSelectedModel
} from "./worker-client";

interface StaleDiagnosticsSnapshot {
  lastKnownModels: ModelSummary[];
  lastModelRefreshAt: string | null;
}

function readStorageDiagnostics(): Promise<StaleDiagnosticsSnapshot> {
  return new Promise((resolve, reject) => {
    // This read is diagnostics-only. Authoritative validation still happens in the worker.
    chrome.storage.local.get(
      ["settings.lastKnownModels", "settings.lastModelRefreshAt"],
      (items) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve({
          lastKnownModels: Array.isArray(items["settings.lastKnownModels"])
            ? (items["settings.lastKnownModels"] as ModelSummary[])
            : [],
          lastModelRefreshAt:
            typeof items["settings.lastModelRefreshAt"] === "string"
              ? items["settings.lastModelRefreshAt"]
              : null
        });
      }
    );
  });
}

export async function loadSettingsSurface(): Promise<Partial<OptionsState>> {
  const [selectedModelResponse, modelsResponse, diagnostics] =
    await Promise.all([
      requestSelectedModel(),
      requestModelCatalog(),
      readStorageDiagnostics().catch(() => ({
        lastKnownModels: [],
        lastModelRefreshAt: null
      }))
    ]);

  const selectedModel =
    selectedModelResponse.ok ? selectedModelResponse.data.selectedModel : null;

  if (!modelsResponse.ok) {
    return {
      selectedModelDraft: selectedModel,
      persistedSelectedModel: selectedModel,
      availableModels: [],
      modelCatalogState: null,
      loadingPhase: "error",
      loadError: modelsResponse.error,
      saveError: null,
      saveSuccessMessage: null,
      isSaving: false,
      lastKnownModels: diagnostics.lastKnownModels,
      lastModelRefreshAt: diagnostics.lastModelRefreshAt
    };
  }

  return {
    selectedModelDraft: selectedModel,
    persistedSelectedModel: selectedModel,
    availableModels: modelsResponse.data.models,
    modelCatalogState: modelsResponse.data.state,
    loadingPhase: "ready",
    loadError: selectedModelResponse.ok ? null : selectedModelResponse.error,
    saveError: null,
    saveSuccessMessage: null,
    isSaving: false,
    lastKnownModels: diagnostics.lastKnownModels,
    lastModelRefreshAt: diagnostics.lastModelRefreshAt
  };
}

export function createUnexpectedLoadError(): ExtensionError {
  return {
    code: "request_failed",
    message: "Settings could not be loaded.",
    retryable: true
  };
}
