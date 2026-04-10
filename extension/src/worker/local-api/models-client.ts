import type { ModelCatalogResult, ModelSummary } from "../../shared/models/model-summary";
import { LocalApiProtocolError } from "./error-mapping";
import { requestJson } from "./http-client";
import { fetchHealth } from "./health-client";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isModelSummary(value: unknown): value is ModelSummary {
  return (
    isObjectRecord(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    value.provider === "ollama" &&
    typeof value.available === "boolean"
  );
}

function isModelCatalogResult(value: unknown): value is ModelCatalogResult {
  return (
    isObjectRecord(value) &&
    (value.state === "ready" || value.state === "no_models_available") &&
    Array.isArray(value.models) &&
    value.models.every((model) => isModelSummary(model))
  );
}

export async function fetchModelCatalog(): Promise<ModelCatalogResult> {
  await fetchHealth();

  const response = await requestJson<unknown>("/v1/models");

  if (response.status !== 200) {
    throw new LocalApiProtocolError("Model list could not be loaded.");
  }

  if (!isModelCatalogResult(response.data)) {
    throw new LocalApiProtocolError("Model list response shape was invalid.");
  }

  return response.data;
}
