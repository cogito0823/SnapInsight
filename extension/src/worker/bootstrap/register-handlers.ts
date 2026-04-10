import type { WorkerMessage, WorkerResponse } from "../../shared/contracts/messages";
import { createExtensionError } from "../../shared/errors/error-codes";
import { handleExplanationsCancel } from "../handlers/explanations-cancel";
import { handleExplanationsStart } from "../handlers/explanations-start";
import { handleHealthCheck } from "../handlers/health-check";
import { handleModelsList } from "../handlers/models-list";
import { handleSettingsGetSelectedModel } from "../handlers/settings-get-selected-model";
import { handleSettingsSetSelectedModel } from "../handlers/settings-set-selected-model";

type WorkerGlobal = typeof globalThis & {
  __snapinsightHandlersRegistered__?: boolean;
};

function isWorkerMessage(value: unknown): value is WorkerMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return typeof (value as { type?: unknown }).type === "string";
}

async function handleWorkerMessage(message: WorkerMessage): Promise<WorkerResponse> {
  switch (message.type) {
    case "health.check":
      return handleHealthCheck();
    case "models.list":
      return handleModelsList();
    case "settings.getSelectedModel":
      return handleSettingsGetSelectedModel();
    case "settings.setSelectedModel":
      return handleSettingsSetSelectedModel(message);
    case "explanations.start":
      return handleExplanationsStart(message);
    case "explanations.cancel":
      return handleExplanationsCancel(message);
    default:
      return {
        ok: false,
        error: createExtensionError(
          "request_failed",
          "Worker handler is not implemented yet.",
          true
        )
      };
  }
}

export function registerMessageHandlers(): void {
  const workerGlobal = self as WorkerGlobal;

  if (workerGlobal.__snapinsightHandlersRegistered__) {
    return;
  }

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isWorkerMessage(message)) {
      return false;
    }

    void handleWorkerMessage(message)
      .then((response) => {
        sendResponse(response);
      })
      .catch(() => {
        sendResponse({
          ok: false,
          error: createExtensionError(
            "request_failed",
            "Worker request handling failed unexpectedly.",
            true
          )
        });
      });

    return true;
  });

  workerGlobal.__snapinsightHandlersRegistered__ = true;
}
