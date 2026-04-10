import type {
  ExplanationRequestState,
  RequestPhase,
  SelectionMode
} from "../../shared/state/request-types";
import type {
  ExplanationErrorEvent,
  ExplanationStartEvent
} from "../../shared/contracts/events";
import type { ExtensionError } from "../../shared/errors/error-codes";

function timestamp(): string {
  return new Date().toISOString();
}

export function createIdleRequestState(
  mode: SelectionMode
): ExplanationRequestState {
  return {
    requestId: null,
    phase: "idle",
    textBuffer: "",
    errorState: null,
    mode,
    model: null,
    startedAt: null,
    updatedAt: null
  };
}

function buildRequestState(options: {
  previous: ExplanationRequestState;
  phase: RequestPhase;
  requestId?: string | null;
  textBuffer?: string;
  errorState?: ExtensionError | null;
  model?: string | null;
  startedAt?: string | null;
}): ExplanationRequestState {
  return {
    ...options.previous,
    requestId:
      options.requestId === undefined ? options.previous.requestId : options.requestId,
    phase: options.phase,
    textBuffer:
      options.textBuffer === undefined
        ? options.previous.textBuffer
        : options.textBuffer,
    errorState:
      options.errorState === undefined
        ? options.previous.errorState
        : options.errorState,
    model: options.model === undefined ? options.previous.model : options.model,
    startedAt:
      options.startedAt === undefined
        ? options.previous.startedAt
        : options.startedAt,
    updatedAt: timestamp()
  };
}

export function createStartingRequestState(
  mode: SelectionMode,
  requestId: string
): ExplanationRequestState {
  const startedAt = timestamp();

  return {
    requestId,
    phase: "starting",
    textBuffer: "",
    errorState: null,
    mode,
    model: null,
    startedAt,
    updatedAt: startedAt
  };
}

export function applyForwardedStartEvent(
  state: ExplanationRequestState,
  event: ExplanationStartEvent
): ExplanationRequestState {
  return buildRequestState({
    previous: state,
    phase: "streaming",
    requestId: event.requestId,
    errorState: null,
    model: event.model
  });
}

export function applyChunkToRequestState(
  state: ExplanationRequestState,
  delta: string
): ExplanationRequestState {
  return buildRequestState({
    previous: state,
    phase: "streaming",
    textBuffer: `${state.textBuffer}${delta}`,
    errorState: null
  });
}

export function applyCompleteToRequestState(
  state: ExplanationRequestState
): ExplanationRequestState {
  return buildRequestState({
    previous: state,
    phase: "completed"
  });
}

export function applyErrorToRequestState(
  state: ExplanationRequestState,
  error: ExtensionError
): ExplanationRequestState {
  return buildRequestState({
    previous: state,
    phase: "error",
    errorState: error
  });
}

export function createErroredRequestState(
  mode: SelectionMode,
  requestId: string,
  error: ExtensionError
): ExplanationRequestState {
  const previous = createIdleRequestState(mode);
  return buildRequestState({
    previous,
    phase: "error",
    requestId,
    errorState: error
  });
}

export function applyForwardedErrorEvent(
  state: ExplanationRequestState,
  event: ExplanationErrorEvent
): ExplanationRequestState {
  return applyErrorToRequestState(state, event.error);
}
