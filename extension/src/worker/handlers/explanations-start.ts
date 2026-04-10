import type {
  ExplanationsStartMessage,
  ExplanationsStartResponse
} from "../../shared/contracts/messages";
import { createExtensionError } from "../../shared/errors/error-codes";
import type { SenderContext } from "../../shared/state/request-types";
import { registerActiveStream } from "../bridge/active-stream-registry";
import { forwardExplanationStream } from "../bridge/stream-forwarder";
import {
  ExplanationStartupError,
  openExplanationStream
} from "../local-api/explanations-client";
import { mapLocalApiError } from "../local-api/error-mapping";
import { fetchModelCatalog } from "../local-api/models-client";
import { settingsService } from "../settings/settings-service";

function resolveSenderContext(
  message: ExplanationsStartMessage,
  sender: chrome.runtime.MessageSender
): SenderContext | null {
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

export async function handleExplanationsStart(
  message: ExplanationsStartMessage,
  sender: chrome.runtime.MessageSender
): Promise<ExplanationsStartResponse> {
  const requestId = message.payload.requestId.trim();
  const text = message.payload.text.trim();

  if (!requestId || !text) {
    return {
      ok: false,
      error: createExtensionError(
        "invalid_request",
        "A request id and selection text are required.",
        false
      )
    };
  }

  const senderContext = resolveSenderContext(message, sender);
  if (!senderContext) {
    return {
      ok: false,
      error: createExtensionError(
        "invalid_request",
        "A valid sender context is required.",
        false
      )
    };
  }

  let effectiveModel = message.payload.model?.trim() ?? "";
  if (!effectiveModel) {
    effectiveModel = (await settingsService.getSelectedModel())?.trim() ?? "";
  }

  if (!effectiveModel) {
    return {
      ok: false,
      error: createExtensionError(
        "selected_model_unavailable",
        "A valid model must be selected before explanation can start.",
        false
      )
    };
  }

  try {
    const catalog = await fetchModelCatalog();
    await settingsService.setLastKnownModels(catalog.models, new Date().toISOString());

    const isAvailable =
      catalog.state === "ready" &&
      catalog.models.some(
        (model) => model.id === effectiveModel && model.available
      );
    if (!isAvailable) {
      return {
        ok: false,
        error: createExtensionError(
          "selected_model_unavailable",
          "A valid model must be selected before explanation can start.",
          false
        )
      };
    }

    const streamConnection = await openExplanationStream({
      requestId,
      text,
      model: effectiveModel,
      mode: message.payload.mode
    });

    registerActiveStream(requestId, {
      senderContext,
      cancel: streamConnection.cancel
    });

    void forwardExplanationStream({
      requestId,
      senderContext,
      events: streamConnection.events
    });

    return {
      ok: true,
      data: {
        requestId
      }
    };
  } catch (error) {
    if (error instanceof ExplanationStartupError) {
      return {
        ok: false,
        error: error.extensionError
      };
    }

    return {
      ok: false,
      error: mapLocalApiError(error, {
        requestFailedMessage: "Explanation stream could not be started.",
        timeoutMessage: "Explanation stream could not be started.",
        transportMessage: "The local service could not be reached."
      })
    };
  }
}
