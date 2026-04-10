import type {
  ExplanationRequestState,
  SelectionMode
} from "../../shared/state/request-types";

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
