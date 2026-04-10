import type { AnchorRect } from "../anchor/normalize-rect";
import { createIdleRequestState } from "./request-state";
import type {
  CardPhase,
  ExplanationRequestState,
  SenderContext
} from "../../shared/state/request-types";

export interface ContentCardState {
  selectedText: string | null;
  selectionAnchorRect: AnchorRect | null;
  cardPhase: CardPhase;
  detailExpanded: boolean;
  activeModel: string | null;
  senderContext: SenderContext;
  shortRequestState: ExplanationRequestState;
  detailRequestState: ExplanationRequestState;
}

function createSenderContext(pageInstanceId: string): SenderContext {
  return {
    // Content scripts do not know the tab id at bootstrap time. The real routing
    // context is completed when active worker-backed requests are introduced.
    tabId: -1,
    frameId: 0,
    pageInstanceId
  };
}

export function createInitialContentCardState(
  pageInstanceId: string
): ContentCardState {
  return {
    selectedText: null,
    selectionAnchorRect: null,
    cardPhase: "hidden",
    detailExpanded: false,
    activeModel: null,
    senderContext: createSenderContext(pageInstanceId),
    shortRequestState: createIdleRequestState("short"),
    detailRequestState: createIdleRequestState("detailed")
  };
}

export function showTriggerForSelection(
  state: ContentCardState
): ContentCardState {
  return {
    ...state,
    selectedText: null,
    selectionAnchorRect: null,
    cardPhase: "triggerVisible",
    detailExpanded: false,
    activeModel: null,
    shortRequestState: createIdleRequestState("short"),
    detailRequestState: createIdleRequestState("detailed")
  };
}

export function acceptSelectionSnapshot(
  state: ContentCardState,
  selectedText: string,
  selectionAnchorRect: AnchorRect
): ContentCardState {
  return {
    ...state,
    selectedText,
    selectionAnchorRect,
    cardPhase: "open"
  };
}

export function resetCardInteraction(
  state: ContentCardState
): ContentCardState {
  return {
    ...state,
    selectedText: null,
    selectionAnchorRect: null,
    cardPhase: "hidden",
    detailExpanded: false,
    activeModel: null,
    shortRequestState: createIdleRequestState("short"),
    detailRequestState: createIdleRequestState("detailed")
  };
}

export function replaceSelectionSnapshot(
  state: ContentCardState
): ContentCardState {
  return showTriggerForSelection(state);
}

export function updatePageInstance(
  state: ContentCardState,
  pageInstanceId: string
): ContentCardState {
  return {
    ...createInitialContentCardState(pageInstanceId)
  };
}
