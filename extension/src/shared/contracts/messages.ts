import type { ExplanationEventMessage } from "./events";
import type { ExtensionError } from "../errors/error-codes";
import type { ModelCatalogResult } from "../models/model-summary";
import type { SelectionMode, SenderContext } from "../state/request-types";

export type WorkerResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ExtensionError;
    };

export interface HealthCheckData {
  status: "ok";
  service: "snapinsight-local-api";
  version?: "v1";
  ollamaReachable: boolean;
}

export interface ReadSelectedModelData {
  selectedModel: string | null;
}

export interface ExplanationStartData {
  requestId: string;
}

export interface HealthCheckMessage {
  type: "health.check";
}

export interface ModelsListMessage {
  type: "models.list";
}

export interface SettingsGetSelectedModelMessage {
  type: "settings.getSelectedModel";
}

export interface SettingsSetSelectedModelMessage {
  type: "settings.setSelectedModel";
  payload: {
    selectedModel: string;
  };
}

export interface ExplanationsStartMessage {
  type: "explanations.start";
  payload: {
    requestId: string;
    senderContext: SenderContext;
    text: string;
    mode: SelectionMode;
    model?: string;
  };
}

export interface ExplanationsCancelMessage {
  type: "explanations.cancel";
  payload: {
    requestId: string;
    senderContext: SenderContext;
  };
}

export type WorkerMessage =
  | HealthCheckMessage
  | ModelsListMessage
  | SettingsGetSelectedModelMessage
  | SettingsSetSelectedModelMessage
  | ExplanationsStartMessage
  | ExplanationsCancelMessage;

export type HealthCheckResponse = WorkerResult<HealthCheckData>;
export type ModelsListResponse = WorkerResult<ModelCatalogResult>;
export type ReadSelectedModelResponse = WorkerResult<ReadSelectedModelData>;
export type SettingsSetSelectedModelResponse = WorkerResult<Record<never, never>>;
export type ExplanationsStartResponse = WorkerResult<ExplanationStartData>;
export type ExplanationsCancelResponse = WorkerResult<Record<never, never>>;

export type WorkerResponse =
  | HealthCheckResponse
  | ModelsListResponse
  | ReadSelectedModelResponse
  | SettingsSetSelectedModelResponse
  | ExplanationsStartResponse
  | ExplanationsCancelResponse;

export type ExtensionRuntimeMessage = WorkerMessage | ExplanationEventMessage;
