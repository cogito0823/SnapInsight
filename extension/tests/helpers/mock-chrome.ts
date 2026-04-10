export interface MockChromeEnvironment {
  storageState: Record<string, unknown>;
  sentMessages: unknown[];
  restore: () => void;
}

type RuntimeSendMessage = (message: unknown) => Promise<unknown>;

export function installMockChrome(options?: {
  initialStorage?: Record<string, unknown>;
  sendMessage?: RuntimeSendMessage;
}): MockChromeEnvironment {
  const storageState = {
    ...(options?.initialStorage ?? {})
  };
  const sentMessages: unknown[] = [];
  const originalChrome = (globalThis as typeof globalThis & { chrome?: typeof chrome })
    .chrome;

  const chromeMock = {
    runtime: {
      lastError: undefined as chrome.runtime.LastError | undefined,
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
    }
  } as unknown as typeof chrome;

  (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome =
    chromeMock;

  return {
    storageState,
    sentMessages,
    restore: () => {
      (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome =
        originalChrome;
    }
  };
}
