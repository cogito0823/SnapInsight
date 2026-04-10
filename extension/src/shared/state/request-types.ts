import type { ExtensionError } from "../errors/error-codes";
import type { ModelSummary } from "../models/model-summary";

export type SelectionMode = "short" | "detailed";

export type CardPhase = "hidden" | "triggerVisible" | "open";

export type RequestPhase =
  | "idle"
  | "starting"
  | "streaming"
  | "completed"
  | "error"
  | "cancelled";

export interface SenderContext {
  tabId: number;
  frameId: number;
  pageInstanceId: string;
}

export interface ExplanationRequestState {
  requestId: string | null;
  phase: RequestPhase;
  textBuffer: string;
  errorState: ExtensionError | null;
  mode: SelectionMode;
  model: string | null;
  startedAt: string | null;
  updatedAt: string | null;
}

export interface ExtensionSettings {
  selectedModel: string | null;
  lastKnownModels: ModelSummary[];
  lastModelRefreshAt: string | null;
}

export const STORAGE_KEYS = {
  selectedModel: "settings.selectedModel",
  lastKnownModels: "settings.lastKnownModels",
  lastModelRefreshAt: "settings.lastModelRefreshAt"
} as const;
