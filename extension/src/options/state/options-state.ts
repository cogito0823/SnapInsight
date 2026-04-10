import type { ExtensionError } from "../../shared/errors/error-codes";
import type {
  ModelCatalogState,
  ModelSummary
} from "../../shared/models/model-summary";

export type OptionsLoadingPhase = "idle" | "loading" | "ready" | "error";

export interface OptionsState {
  selectedModelDraft: string | null;
  persistedSelectedModel: string | null;
  availableModels: ModelSummary[];
  modelCatalogState: ModelCatalogState | null;
  loadingPhase: OptionsLoadingPhase;
  loadError: ExtensionError | null;
  saveError: ExtensionError | null;
  saveSuccessMessage: string | null;
  isSaving: boolean;
  lastKnownModels: ModelSummary[];
  lastModelRefreshAt: string | null;
}

export function createInitialOptionsState(): OptionsState {
  return {
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
    lastModelRefreshAt: null
  };
}
