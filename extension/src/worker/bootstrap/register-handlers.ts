import type { WorkerMessage, WorkerResponse } from "../../shared/contracts/messages";
import { createExtensionError } from "../../shared/errors/error-codes";

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
  return {
    ok: false,
    error: createExtensionError(
      "request_failed",
      `Worker handler for "${message.type}" is not implemented yet.`,
      true
    )
  };
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

    void handleWorkerMessage(message).then((response) => {
      sendResponse(response);
    });

    return true;
  });

  workerGlobal.__snapinsightHandlersRegistered__ = true;
}
