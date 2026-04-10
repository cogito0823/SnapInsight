export interface MockChromeEnvironment {
  storageState: Record<string, unknown>;
  sentMessages: unknown[];
  tabMessages: Array<{
    tabId: number;
    message: unknown;
    options?: chrome.tabs.MessageSendOptions;
  }>;
  emitRuntimeMessage: (
    message: unknown,
    sender?: chrome.runtime.MessageSender
  ) => Promise<void>;
  restore: () => void;
}

type RuntimeSendMessage = (message: unknown) => Promise<unknown>;
type TabsSendMessage = (
  tabId: number,
  message: unknown,
  options?: chrome.tabs.MessageSendOptions
) => Promise<unknown>;

export function installMockChrome(options?: {
  initialStorage?: Record<string, unknown>;
  sendMessage?: RuntimeSendMessage;
  tabsSendMessage?: TabsSendMessage;
}): MockChromeEnvironment {
  const storageState = {
    ...(options?.initialStorage ?? {})
  };
  const sentMessages: unknown[] = [];
  const tabMessages: Array<{
    tabId: number;
    message: unknown;
    options?: chrome.tabs.MessageSendOptions;
  }> = [];
  const runtimeListeners: Array<
    (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => boolean | void
  > = [];
  const originalChrome = (globalThis as typeof globalThis & { chrome?: typeof chrome })
    .chrome;

  const chromeMock = {
    runtime: {
      id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      lastError: undefined as chrome.runtime.LastError | undefined,
      onMessage: {
        addListener: (listener) => {
          runtimeListeners.push(listener);
        },
        removeListener: (listener) => {
          const index = runtimeListeners.indexOf(listener);
          if (index >= 0) {
            runtimeListeners.splice(index, 1);
          }
        },
        hasListener: (listener) => runtimeListeners.includes(listener),
        hasListeners: () => runtimeListeners.length > 0
      } as typeof chrome.runtime.onMessage,
      sendMessage: (message: unknown) => {
        sentMessages.push(message);
        if (!options?.sendMessage) {
          throw new Error("sendMessage mock was not provided.");
        }

        return options.sendMessage(message);
      }
    },
    storage: {
      local: {
        get: (
          keys: string[] | string | Record<string, unknown> | null,
          callback: (items: Record<string, unknown>) => void
        ) => {
          if (keys === null) {
            callback({ ...storageState });
            return;
          }

          if (Array.isArray(keys)) {
            const result = Object.fromEntries(
              keys.map((key) => [key, storageState[key]])
            );
            callback(result);
            return;
          }

          if (typeof keys === "string") {
            callback({
              [keys]: storageState[keys]
            });
            return;
          }

          const result = Object.fromEntries(
            Object.keys(keys).map((key) => [key, storageState[key] ?? keys[key]])
          );
          callback(result);
        },
        set: (
          items: Record<string, unknown>,
          callback?: () => void
        ) => {
          Object.assign(storageState, items);
          callback?.();
        }
      }
    },
    tabs: {
      sendMessage: (
        tabId: number,
        message: unknown,
        optionsArg?: chrome.tabs.MessageSendOptions
      ) => {
        tabMessages.push({
          tabId,
          message,
          options: optionsArg
        });

        if (!options?.tabsSendMessage) {
          return Promise.resolve(undefined);
        }

        return options.tabsSendMessage(tabId, message, optionsArg);
      }
    }
  } as unknown as typeof chrome;

  (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome =
    chromeMock;

  return {
    storageState,
    sentMessages,
    tabMessages,
    emitRuntimeMessage: async (
      message: unknown,
      sender: chrome.runtime.MessageSender = {}
    ) => {
      await Promise.all(
        runtimeListeners.map(
          (listener) =>
            new Promise<void>((resolve) => {
              const sendResponse = () => {
                resolve();
              };
              const handled = listener(message, sender, sendResponse);
              if (!handled) {
                resolve();
              }
            })
        )
      );
    },
    restore: () => {
      (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome =
        originalChrome;
    }
  };
}
