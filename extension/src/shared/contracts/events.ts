import type { ExtensionError } from "../errors/error-codes";
import type { SelectionMode, SenderContext } from "../state/request-types";

export const EXPLANATIONS_EVENT_MESSAGE_TYPE = "explanations.event";

export interface ExplanationStartEvent {
  event: "start";
  requestId: string;
  mode: SelectionMode;
  model: string;
}

export interface ExplanationChunkEvent {
  event: "chunk";
  requestId: string;
  delta: string;
}

export interface ExplanationCompleteEvent {
  event: "complete";
  requestId: string;
}

export interface ExplanationErrorEvent {
  event: "error";
  requestId: string;
  error: ExtensionError;
}

export type ExplanationStreamEvent =
  | ExplanationStartEvent
  | ExplanationChunkEvent
  | ExplanationCompleteEvent
  | ExplanationErrorEvent;

export interface ExplanationEventMessage {
  type: typeof EXPLANATIONS_EVENT_MESSAGE_TYPE;
  payload: {
    requestId: string;
    senderContext: SenderContext;
    event: ExplanationStreamEvent;
  };
}
