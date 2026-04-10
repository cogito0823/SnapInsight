import type { SenderContext } from "../../shared/state/request-types";

export interface ActiveStreamEntry {
  senderContext: SenderContext;
  cancel: () => void;
}

function buildActiveStreamKey(requestId: string, senderContext: SenderContext): string {
  return [
    requestId,
    senderContext.tabId,
    senderContext.frameId,
    senderContext.pageInstanceId
  ].join(":");
}

const activeStreams = new Map<string, ActiveStreamEntry>();

export function registerActiveStream(
  requestId: string,
  entry: ActiveStreamEntry
): void {
  const key = buildActiveStreamKey(requestId, entry.senderContext);
  const existing = activeStreams.get(key);
  existing?.cancel();
  activeStreams.set(key, entry);
}

export function removeActiveStream(
  requestId: string,
  senderContext: SenderContext
): void {
  activeStreams.delete(buildActiveStreamKey(requestId, senderContext));
}

export function cancelActiveStream(
  requestId: string,
  senderContext: SenderContext
): boolean {
  const key = buildActiveStreamKey(requestId, senderContext);
  const entry = activeStreams.get(key);
  if (!entry) {
    return false;
  }

  activeStreams.delete(key);
  entry.cancel();
  return true;
}
