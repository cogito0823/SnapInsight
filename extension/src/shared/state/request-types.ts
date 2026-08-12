import type { ExtensionError } from "../errors/error-codes";

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
