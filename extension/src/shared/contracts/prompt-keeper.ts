export const PROMPT_KEEPER_MESSAGE_TYPE = "prompt-keeper.lifecycle";
export const PROMPT_KEEPER_EVICT_MESSAGE_TYPE = "prompt-keeper.evict";

export type PromptKeeperLifecycleAction =
  | "touch"
  | "visibility"
  | "remove";

export interface PromptKeeperLifecycleMessage {
  type: typeof PROMPT_KEEPER_MESSAGE_TYPE;
  payload: {
    action: PromptKeeperLifecycleAction;
    pageInstanceId: string;
    hidden: boolean;
  };
}

export interface PromptKeeperEvictMessage {
  type: typeof PROMPT_KEEPER_EVICT_MESSAGE_TYPE;
  payload: {
    pageInstanceId: string;
    reason: "lru_limit";
  };
}

export function isPromptKeeperLifecycleMessage(
  value: unknown
): value is PromptKeeperLifecycleMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<PromptKeeperLifecycleMessage>;
  const payload = message.payload;
  return (
    message.type === PROMPT_KEEPER_MESSAGE_TYPE &&
    !!payload &&
    typeof payload.pageInstanceId === "string" &&
    payload.pageInstanceId.length > 0 &&
    typeof payload.hidden === "boolean" &&
    (payload.action === "touch" ||
      payload.action === "visibility" ||
      payload.action === "remove")
  );
}

export function isPromptKeeperEvictMessage(
  value: unknown
): value is PromptKeeperEvictMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<PromptKeeperEvictMessage>;
  return (
    message.type === PROMPT_KEEPER_EVICT_MESSAGE_TYPE &&
    !!message.payload &&
    typeof message.payload.pageInstanceId === "string" &&
    message.payload.pageInstanceId.length > 0 &&
    message.payload.reason === "lru_limit"
  );
}
