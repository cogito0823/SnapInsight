import type { ExplanationStreamEvent } from "../../shared/contracts/events";
import {
  PROMPT_HOST_CANCEL_MESSAGE_TYPE,
  PROMPT_HOST_EVENT_MESSAGE_TYPE,
  PROMPT_HOST_START_MESSAGE_TYPE,
  type PromptHostEventMessage,
  type PromptHostStartResponse
} from "../../shared/contracts/prompt-host";
import type { SelectionMode } from "../../shared/state/request-types";

const PROMPT_HOST_DOCUMENT_PATH = "prompt-host.html";

class AsyncEventQueue implements AsyncIterable<ExplanationStreamEvent> {
  private values: ExplanationStreamEvent[] = [];
  private waiters: Array<
    (result: IteratorResult<ExplanationStreamEvent>) => void
  > = [];
  private closed = false;

  push(value: ExplanationStreamEvent): void {
    if (this.closed) {
      return;
    }

    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ value, done: false });
      return;
    }

    this.values.push(value);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter({ value: undefined, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<ExplanationStreamEvent> {
    return {
      next: async () => {
        const value = this.values.shift();
        if (value) {
          return { value, done: false };
        }

        if (this.closed) {
          return { value: undefined, done: true };
        }

        return new Promise<IteratorResult<ExplanationStreamEvent>>((resolve) => {
          this.waiters.push(resolve);
        });
      }
    };
  }
}
const activeQueues = new Map<string, AsyncEventQueue>();
let listenerRegistered = false;
let creatingDocument: Promise<void> | null = null;

function ensureEventListener(): void {
  if (listenerRegistered) {
    return;
  }

  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (
      typeof message !== "object" ||
      message === null ||
      (message as { type?: unknown }).type !== PROMPT_HOST_EVENT_MESSAGE_TYPE ||
      (message as { target?: unknown }).target !== "worker"
    ) {
      return false;
    }

    const promptEvent = message as PromptHostEventMessage;
    const queue = activeQueues.get(promptEvent.payload.requestId);
    if (!queue) {
      return false;
    }

    queue.push(promptEvent.payload.event);
    if (
      promptEvent.payload.event.event === "complete" ||
      promptEvent.payload.event.event === "error"
    ) {
      queue.close();
      activeQueues.delete(promptEvent.payload.requestId);
    }

    return false;
  });
  listenerRegistered = true;
}

async function ensurePromptHostDocument(): Promise<void> {
  const documentUrl = chrome.runtime.getURL(PROMPT_HOST_DOCUMENT_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [documentUrl]
  });
  if (contexts.length > 0) {
    return;
  }

  if (!creatingDocument) {
    creatingDocument = chrome.offscreen
      .createDocument({
        url: PROMPT_HOST_DOCUMENT_PATH,
        reasons: [chrome.offscreen.Reason.WORKERS],
        justification:
          "Run the experimental Chrome Prompt API in an extension document because it is unavailable in the MV3 service worker."
      })
      .finally(() => {
        creatingDocument = null;
      });
  }

  await creatingDocument;
}

export async function openPromptExplanationStream(options: {
  requestId: string;
  text: string;
  mode: SelectionMode;
}): Promise<{
  events: AsyncIterable<ExplanationStreamEvent>;
  cancel: () => void;
}> {
  ensureEventListener();
  await ensurePromptHostDocument();

  const queue = new AsyncEventQueue();
  activeQueues.set(options.requestId, queue);

  const response = (await chrome.runtime.sendMessage({
    type: PROMPT_HOST_START_MESSAGE_TYPE,
    target: "prompt-host",
    payload: options
  })) as PromptHostStartResponse;

  if (!response?.ok) {
    queue.close();
    activeQueues.delete(options.requestId);
    throw response?.error ?? new Error("Prompt host did not return a response.");
  }

  return {
    events: queue,
    cancel: () => {
      queue.close();
      activeQueues.delete(options.requestId);
      void chrome.runtime.sendMessage({
        type: PROMPT_HOST_CANCEL_MESSAGE_TYPE,
        target: "prompt-host",
        payload: {
          requestId: options.requestId
        }
      });
    }
  };
}
