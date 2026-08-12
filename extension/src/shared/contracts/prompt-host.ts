import type { ExplanationStreamEvent } from "./events";
import type { ExtensionError } from "../errors/error-codes";
import type { SelectionMode } from "../state/request-types";

export const PROMPT_HOST_START_MESSAGE_TYPE = "promptHost.start";
export const PROMPT_HOST_CANCEL_MESSAGE_TYPE = "promptHost.cancel";
export const PROMPT_HOST_EVENT_MESSAGE_TYPE = "promptHost.event";

export interface PromptHostStartMessage {
  type: typeof PROMPT_HOST_START_MESSAGE_TYPE;
  target: "prompt-host";
  payload: {
    requestId: string;
    text: string;
    mode: SelectionMode;
  };
}

export interface PromptHostCancelMessage {
  type: typeof PROMPT_HOST_CANCEL_MESSAGE_TYPE;
  target: "prompt-host";
  payload: {
    requestId: string;
  };
}

export interface PromptHostEventMessage {
  type: typeof PROMPT_HOST_EVENT_MESSAGE_TYPE;
  target: "worker";
  payload: {
    requestId: string;
    event: ExplanationStreamEvent;
  };
}

export type PromptHostMessage =
  | PromptHostStartMessage
  | PromptHostCancelMessage
  | PromptHostEventMessage;

export type PromptHostStartResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: ExtensionError;
    };
