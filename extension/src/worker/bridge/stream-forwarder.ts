import {
  EXPLANATIONS_EVENT_MESSAGE_TYPE,
  type ExplanationStreamEvent
} from "../../shared/contracts/events";
import { createExtensionError } from "../../shared/errors/error-codes";
import type { SenderContext } from "../../shared/state/request-types";
import { ExplanationStreamCancelledError } from "../local-api/explanations-client";
import { removeActiveStream } from "./active-stream-registry";

async function sendExplanationEvent(
  requestId: string,
  senderContext: SenderContext,
  event: ExplanationStreamEvent
): Promise<void> {
  await chrome.tabs.sendMessage(
    senderContext.tabId,
    {
      type: EXPLANATIONS_EVENT_MESSAGE_TYPE,
      payload: {
        requestId,
        senderContext,
        event
      }
    },
    {
      frameId: senderContext.frameId
    }
  );
}

export async function forwardExplanationStream(options: {
  requestId: string;
  senderContext: SenderContext;
  events: AsyncIterable<ExplanationStreamEvent>;
}): Promise<void> {
  const { requestId, senderContext, events } = options;

  try {
    for await (const event of events) {
      await sendExplanationEvent(requestId, senderContext, event);
    }
  } catch (error) {
    if (error instanceof ExplanationStreamCancelledError) {
      return;
    }

    try {
      await sendExplanationEvent(requestId, senderContext, {
        event: "error",
        requestId,
        error: createExtensionError(
          "request_failed",
          "The stream bridge was lost before completion.",
          true
        )
      });
    } catch {
      // If event delivery is already broken, there is nothing else to do here.
    }
  } finally {
    removeActiveStream(requestId, senderContext);
  }
}
