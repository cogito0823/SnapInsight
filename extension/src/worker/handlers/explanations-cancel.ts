import type {
  ExplanationsCancelMessage,
  ExplanationsCancelResponse
} from "../../shared/contracts/messages";
import { createExtensionError } from "../../shared/errors/error-codes";
import { cancelActiveStream } from "../bridge/active-stream-registry";

function resolveCancellationContext(
  message: ExplanationsCancelMessage,
  sender: chrome.runtime.MessageSender
) {
  const pageInstanceId = message.payload.senderContext.pageInstanceId.trim();
  const tabId =
    sender.tab?.id ?? (message.payload.senderContext.tabId >= 0
      ? message.payload.senderContext.tabId
      : undefined);
  const frameId =
    typeof sender.frameId === "number"
      ? sender.frameId
      : message.payload.senderContext.frameId;

  if (!pageInstanceId || typeof tabId !== "number" || !Number.isInteger(frameId)) {
    return null;
  }

  return {
    tabId,
    frameId,
    pageInstanceId
  };
}

export async function handleExplanationsCancel(
  message: ExplanationsCancelMessage,
  sender: chrome.runtime.MessageSender
): Promise<ExplanationsCancelResponse> {
  const requestId = message.payload.requestId.trim();
  const senderContext = resolveCancellationContext(message, sender);
  if (!requestId || !senderContext) {
    return {
      ok: false,
      error: createExtensionError(
        "invalid_request",
        "A valid request id and sender context are required.",
        false
      )
    };
  }

  cancelActiveStream(requestId, senderContext);

  return {
    ok: true,
    data: {}
  };
}
