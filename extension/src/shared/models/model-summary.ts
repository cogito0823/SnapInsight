export interface ModelSummary {
  id: string;
  label: string;
  provider: "ollama";
  available: boolean;
}

export type ModelCatalogState = "ready" | "no_models_available";

export interface ModelCatalogResult {
  state: ModelCatalogState;
  models: ModelSummary[];
}
