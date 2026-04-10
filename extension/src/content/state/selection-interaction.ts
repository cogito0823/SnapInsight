import type { AnchorRect } from "../anchor/normalize-rect";
import {
  acceptSelectionSnapshot,
  replaceSelectionSnapshot,
  resetCardInteraction,
  showTriggerForSelection,
  type ContentCardState
} from "./card-state";

export interface PendingSelectionSnapshot {
  selectedText: string;
  anchorRect: AnchorRect;
}

export interface SelectionInteractionUpdate {
  state: ContentCardState;
  pendingSelection: PendingSelectionSnapshot | null;
}

function sameAnchorRect(
  left: AnchorRect | null,
  right: AnchorRect | null
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    Math.abs(left.top - right.top) < 1 &&
    Math.abs(left.left - right.left) < 1 &&
    Math.abs(left.width - right.width) < 1 &&
    Math.abs(left.height - right.height) < 1
  );
}

function matchesAcceptedSnapshot(
  state: ContentCardState,
  liveSelection: PendingSelectionSnapshot
): boolean {
  return (
    state.selectedText === liveSelection.selectedText &&
    sameAnchorRect(state.selectionAnchorRect, liveSelection.anchorRect)
  );
}

export function applyLiveSelectionUpdate(
  state: ContentCardState,
  pendingSelection: PendingSelectionSnapshot | null,
  liveSelection: PendingSelectionSnapshot | null
): SelectionInteractionUpdate {
  if (!liveSelection) {
    if (state.cardPhase === "open") {
      return {
        state,
        pendingSelection: null
      };
    }

    return {
      state: resetCardInteraction(state),
      pendingSelection: null
    };
  }

  if (
    pendingSelection &&
    pendingSelection.selectedText === liveSelection.selectedText &&
    sameAnchorRect(pendingSelection.anchorRect, liveSelection.anchorRect) &&
    state.cardPhase === "triggerVisible"
  ) {
    return {
      state,
      pendingSelection
    };
  }

  if (state.cardPhase === "open") {
    if (matchesAcceptedSnapshot(state, liveSelection)) {
      return {
        state,
        pendingSelection: null
      };
    }

    return {
      state: replaceSelectionSnapshot(state),
      pendingSelection: liveSelection
    };
  }

  return {
    state: showTriggerForSelection(state),
    pendingSelection: liveSelection
  };
}

export function acceptLiveSelectionForOpen(
  state: ContentCardState,
  liveSelection: PendingSelectionSnapshot | null
): SelectionInteractionUpdate {
  if (!liveSelection) {
    return {
      state: resetCardInteraction(state),
      pendingSelection: null
    };
  }

  return {
    state: acceptSelectionSnapshot(
      state,
      liveSelection.selectedText,
      liveSelection.anchorRect
    ),
    pendingSelection: null
  };
}
