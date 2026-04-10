import { computeAnchor } from "../anchor/compute-anchor";
import {
  bindPageInstanceNavigation,
  createPageInstanceId
} from "./page-instance";
import { readSelection } from "../selection/read-selection";
import { validateSelection } from "../selection/validate-selection";
import {
  createInitialContentCardState,
  resetCardInteraction,
  updatePageInstance,
  type ContentCardState
} from "../state/card-state";
import {
  acceptLiveSelectionForOpen,
  applyLiveSelectionUpdate,
  type PendingSelectionSnapshot
} from "../state/selection-interaction";
import { renderContentApp } from "../ui/render-app";
import { ensureShadowRoot } from "../ui/shadow-root";

const CONTENT_APP_MARKER = "data-snapinsight-content-app";

export function startContentApp(): void {
  if (document.documentElement.hasAttribute(CONTENT_APP_MARKER)) {
    return;
  }

  document.documentElement.setAttribute(CONTENT_APP_MARKER, "ready");

  const shadowRootHandle = ensureShadowRoot();
  let state = createInitialContentCardState(createPageInstanceId());
  let pendingSelection: PendingSelectionSnapshot | null = null;

  const clearPendingSelection = (): void => {
    pendingSelection = null;
  };

  const resolveValidLiveSelection = (): PendingSelectionSnapshot | null => {
    const currentSelection = readSelection();
    if (!currentSelection) {
      return null;
    }

    const validation = validateSelection(currentSelection.text);
    if (!validation.isValid) {
      return null;
    }

    const anchor = computeAnchor(currentSelection);
    if (!anchor) {
      return null;
    }

    return {
      selectedText: validation.normalizedText,
      anchorRect: anchor
    };
  };

  const setState = (nextState: ContentCardState): void => {
    state = nextState;
    renderContentApp(
      shadowRootHandle.root,
      state,
      {
        anchorRect: pendingSelection?.anchorRect ?? null
      },
      {
        onTriggerHover: () => {
          const liveSelection = resolveValidLiveSelection();
          const next = acceptLiveSelectionForOpen(state, liveSelection);
          pendingSelection = next.pendingSelection;
          setState(next.state);
        },
        onCloseCard: () => {
          clearPendingSelection();
          setState(resetCardInteraction(state));
        }
      }
    );
  };

  const applySelection = (): void => {
    const liveSelection = resolveValidLiveSelection();
    const next = applyLiveSelectionUpdate(state, pendingSelection, liveSelection);
    pendingSelection = next.pendingSelection;
    setState(next.state);
  };

  const handleClickAway = (event: MouseEvent): void => {
    if (state.cardPhase !== "open") {
      return;
    }

    if (event.composedPath().includes(shadowRootHandle.host)) {
      return;
    }

    clearPendingSelection();
    setState(resetCardInteraction(state));
  };

  document.addEventListener("selectionchange", applySelection);
  document.addEventListener("mouseup", applySelection);
  document.addEventListener("keyup", applySelection);
  document.addEventListener("mousedown", handleClickAway, true);

  bindPageInstanceNavigation(() => {
    clearPendingSelection();
    setState(updatePageInstance(state, createPageInstanceId()));
  });

  setState(state);
}
