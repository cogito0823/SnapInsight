import type { ExtensionError } from "../../shared/errors/error-codes";
import type { OptionsState } from "../state/options-state";
import {
  requestModelCatalog,
  requestSelectedModel
} from "./worker-client";

export async function loadSettingsSurface(): Promise<Partial<OptionsState>> {
  const [selectedModelResponse, modelsResponse] =
    await Promise.all([
      requestSelectedModel(),
      requestModelCatalog()
    ]);

  const selectedModel =
    selectedModelResponse.ok ? selectedModelResponse.data.selectedModel : null;
  const lastKnownModels =
    selectedModelResponse.ok ? selectedModelResponse.data.lastKnownModels : [];
  const lastModelRefreshAt =
    selectedModelResponse.ok
      ? selectedModelResponse.data.lastModelRefreshAt
      : null;

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
      lastKnownModels,
      lastModelRefreshAt
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
    lastKnownModels,
    lastModelRefreshAt
  };
}

export function createUnexpectedLoadError(): ExtensionError {
  return {
    code: "request_failed",
    message: "Settings could not be loaded.",
    retryable: true
  };
}
