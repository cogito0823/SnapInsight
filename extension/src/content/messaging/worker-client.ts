import {
  EXPLANATIONS_EVENT_MESSAGE_TYPE,
  type ExplanationEventMessage
} from "../../shared/contracts/events";
import type {
  ExplanationsCancelResponse,
  ExplanationsStartResponse,
  ModelsListResponse,
  SettingsSetSelectedModelResponse
} from "../../shared/contracts/messages";
import type { SenderContext, SelectionMode } from "../../shared/state/request-types";

function sendMessage<TResponse>(message: object): Promise<TResponse> {
  return chrome.runtime.sendMessage(message) as Promise<TResponse>;
}

export function requestShortExplanation(options: {
  requestId: string;
  senderContext: SenderContext;
  text: string;
  mode: SelectionMode;
  model?: string;
}): Promise<ExplanationsStartResponse> {
  return sendMessage<ExplanationsStartResponse>({
    type: "explanations.start",
    payload: options
  });
}

export function cancelExplanation(options: {
  requestId: string;
  senderContext: SenderContext;
}): Promise<ExplanationsCancelResponse> {
  return sendMessage<ExplanationsCancelResponse>({
    type: "explanations.cancel",
    payload: options
  });
}

export function requestModelCatalog(): Promise<ModelsListResponse> {
  return sendMessage<ModelsListResponse>({
    type: "models.list"
  });
}

export function persistSelectedModel(
  selectedModel: string
): Promise<SettingsSetSelectedModelResponse> {
  return sendMessage<SettingsSetSelectedModelResponse>({
    type: "settings.setSelectedModel",
    payload: {
      selectedModel
    }
  });
}

export function isExplanationEventMessage(
  value: unknown
): value is ExplanationEventMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === EXPLANATIONS_EVENT_MESSAGE_TYPE
  );
}
