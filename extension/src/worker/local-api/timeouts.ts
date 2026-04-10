export const LOCAL_API_TIMEOUT_MS = 5000;

export interface TimeoutSignalContext {
  signal: AbortSignal;
  cleanup: () => void;
  didTimeout: () => boolean;
}

export function createTimeoutSignal(
  timeoutMs: number = LOCAL_API_TIMEOUT_MS
): TimeoutSignalContext {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      globalThis.clearTimeout(timeoutId);
    },
    didTimeout: () => timedOut
  };
}
