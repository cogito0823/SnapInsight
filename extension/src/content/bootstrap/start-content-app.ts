import { computeAnchor } from "../anchor/compute-anchor";
import {
  bindPageInstanceNavigation,
  createPageInstanceId
} from "./page-instance";
import {
  cancelPromptExplanation,
  disposePromptResources,
  evictPromptKeeper,
  handlePromptPageVisibility,
  type PromptLoadingStage,
  startPromptExplanation,
  warmUpPromptModel
} from "../prompt-api/prompt-client";
import { createPromptWarmupScheduler } from "../prompt-api/prompt-warmup";
import type { ExplanationEventMessage } from "../../shared/contracts/events";
import { isPromptKeeperEvictMessage } from "../../shared/contracts/prompt-keeper";
import { createExtensionError } from "../../shared/errors/error-codes";
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
import {
  applyChunkToRequestState,
  applyCompleteToRequestState,
  applyErrorToRequestState,
  applyForwardedStartEvent,
  createIdleRequestState,
  createErroredRequestState,
  createStartingRequestState
} from "../state/request-state";
import { renderContentApp } from "../ui/render-app";
import { shouldIgnoreCardClickAway } from "../ui/click-away";
import { ensureShadowRoot } from "../ui/shadow-root";

const CONTENT_APP_MARKER = "data-snapinsight-content-app";

async function copyText(text: string): Promise<void> {
  if (!text.trim()) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

interface ContentViewState {
  shortDispatchPending: boolean;
  detailDispatchPending: boolean;
  shortLoadingStage: PromptLoadingStage;
  detailLoadingStage: PromptLoadingStage;
  shortCancelAvailable: boolean;
  detailCancelAvailable: boolean;
}

function createInitialViewState(): ContentViewState {
  return {
    shortDispatchPending: false,
    detailDispatchPending: false,
    shortLoadingStage: "generating",
    detailLoadingStage: "generating",
    shortCancelAvailable: false,
    detailCancelAvailable: false
  };
}

export function startContentApp(): void {
  if (document.documentElement.hasAttribute(CONTENT_APP_MARKER)) {
    return;
  }

  document.documentElement.setAttribute(CONTENT_APP_MARKER, "ready");

  const shadowRootHandle = ensureShadowRoot();
  let state = createInitialContentCardState(createPageInstanceId());
  let pendingSelection: PendingSelectionSnapshot | null = null;
  let viewState = createInitialViewState();
  let interactionVersion = 0;
  let shortDispatchVersion = 0;
  let detailDispatchVersion = 0;
  let pendingShortRequestId: string | null = null;
  let pendingDetailRequestId: string | null = null;
  const promptWarmupScheduler = createPromptWarmupScheduler(warmUpPromptModel);
  const handleKeeperEviction = (message: unknown): void => {
    if (!isPromptKeeperEvictMessage(message)) return;
    if (message.payload.pageInstanceId !== state.senderContext.pageInstanceId) return;
    evictPromptKeeper(message.payload.pageInstanceId);
  };
  chrome.runtime.onMessage.addListener(handleKeeperEviction);

  const cancelScheduledWarmup = (): void => promptWarmupScheduler.cancel();

  const scheduleWarmup = (): void => {
    cancelScheduledWarmup();
    if (
      state.cardPhase !== "triggerVisible" ||
      !pendingSelection ||
      document.visibilityState !== "visible"
    ) {
      return;
    }
    promptWarmupScheduler.schedule();
  };

  const clearPendingSelection = (): void => {
    pendingSelection = null;
  };

  const replaceViewState = (nextViewState: ContentViewState): void => {
    viewState = nextViewState;
  };

  const resetViewState = (): void => {
    replaceViewState(createInitialViewState());
  };

  const rotateInteractionVersion = (): number => {
    interactionVersion += 1;
    shortDispatchVersion += 1;
    detailDispatchVersion += 1;
    return interactionVersion;
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

  const render = (): void => {
    renderContentApp(
      shadowRootHandle.root,
      state,
      {
        anchorRect: pendingSelection?.anchorRect ?? null
      },
      {
        shortDispatchPending: viewState.shortDispatchPending,
        detailDispatchPending: viewState.detailDispatchPending
      },
      {
        onTriggerHover: () => {
          cancelScheduledWarmup();
          const liveSelection = resolveValidLiveSelection();
          const next = acceptLiveSelectionForOpen(state, liveSelection);
          pendingSelection = next.pendingSelection;
          rotateInteractionVersion();
          resetViewState();
          state = next.state;
          render();
          void startShortExplanation();
        },
        onCloseCard: () => {
          clearPendingSelection();
          cancelActiveRequests(state);
          rotateInteractionVersion();
          resetViewState();
          state = resetCardInteraction(state);
          render();
        },
        onRetryShort: () => {
          regenerateShortExplanation();
        },
        onExpandDetail: () => {
          void startDetailExplanation();
        },
        onRetryDetail: () => {
          regenerateDetailExplanation();
        },
        onCancelShort: () => {
          cancelShortFromUi();
        },
        onCancelDetail: () => {
          cancelDetailFromUi();
        },
        onCopyShort: () => {
          void copyText(state.shortRequestState.textBuffer);
        },
        onCopyDetail: () => {
          void copyText(state.detailRequestState.textBuffer);
        },
        onOpenSetup: () => {
          void chrome.runtime.openOptionsPage();
        }
      }
    );
  };

  const setState = (nextState: ContentCardState): void => {
    state = nextState;
    render();
  };

  const matchesCurrentCard = (pageInstanceId: string, selectedText: string): boolean =>
    state.cardPhase === "open" &&
    state.senderContext.pageInstanceId === pageInstanceId &&
    state.selectedText === selectedText;

  const matchesShortRequestEvent = (
    message: ExplanationEventMessage
  ): boolean => {
    if (message.payload.requestId !== state.shortRequestState.requestId) {
      return false;
    }

    if (
      message.payload.senderContext.pageInstanceId !==
      state.senderContext.pageInstanceId
    ) {
      return false;
    }

    if (message.payload.senderContext.frameId !== state.senderContext.frameId) {
      return false;
    }

    if (
      state.senderContext.tabId >= 0 &&
      message.payload.senderContext.tabId !== state.senderContext.tabId
    ) {
      return false;
    }

    return true;
  };

  const matchesDetailRequestEvent = (
    message: ExplanationEventMessage
  ): boolean => {
    if (message.payload.requestId !== state.detailRequestState.requestId) {
      return false;
    }

    if (
      message.payload.senderContext.pageInstanceId !==
      state.senderContext.pageInstanceId
    ) {
      return false;
    }

    if (message.payload.senderContext.frameId !== state.senderContext.frameId) {
      return false;
    }

    if (
      state.senderContext.tabId >= 0 &&
      message.payload.senderContext.tabId !== state.senderContext.tabId
    ) {
      return false;
    }

    return true;
  };

  const canStartDetailRequest = (): boolean =>
    state.cardPhase === "open" &&
    state.shortRequestState.textBuffer.trim().length > 0 &&
    state.activeModel !== null;

  const cancelActiveRequest = (
    requestState: ContentCardState["shortRequestState"] | ContentCardState["detailRequestState"]
  ): void => {
    if (
      !requestState.requestId ||
      (requestState.phase !== "starting" && requestState.phase !== "streaming")
    ) {
      return;
    }

    cancelPromptExplanation(requestState.requestId);
  };

  const cancelActiveShortRequest = (snapshotState: ContentCardState): void => {
    cancelActiveRequest(snapshotState.shortRequestState);
  };

  const cancelActiveDetailRequest = (snapshotState: ContentCardState): void => {
    cancelActiveRequest(snapshotState.detailRequestState);
  };

  const cancelActiveRequests = (snapshotState: ContentCardState): void => {
    if (pendingShortRequestId) {
      cancelPromptExplanation(pendingShortRequestId);
      pendingShortRequestId = null;
    }
    if (pendingDetailRequestId) {
      cancelPromptExplanation(pendingDetailRequestId);
      pendingDetailRequestId = null;
    }
    cancelActiveShortRequest(snapshotState);
    cancelActiveDetailRequest(snapshotState);
  };

  const cancelledError = () =>
    createExtensionError(
      "request_cancelled",
      "The explanation request was cancelled.",
      true
    );

  const cancelShortFromUi = (): void => {
    const requestId =
      pendingShortRequestId ?? state.shortRequestState.requestId;
    if (!requestId) return;
    cancelPromptExplanation(requestId);
    pendingShortRequestId = null;
    shortDispatchVersion += 1;
    replaceViewState({
      ...viewState,
      shortDispatchPending: false,
      shortCancelAvailable: false
    });
    setState({
      ...state,
      shortRequestState:
        state.shortRequestState.requestId === requestId
          ? applyErrorToRequestState(state.shortRequestState, cancelledError())
          : createErroredRequestState("short", requestId, cancelledError())
    });
  };

  const cancelDetailFromUi = (): void => {
    const requestId =
      pendingDetailRequestId ?? state.detailRequestState.requestId;
    if (!requestId) return;
    cancelPromptExplanation(requestId);
    pendingDetailRequestId = null;
    detailDispatchVersion += 1;
    replaceViewState({
      ...viewState,
      detailDispatchPending: false,
      detailCancelAvailable: false
    });
    setState({
      ...state,
      detailExpanded: true,
      detailRequestState:
        state.detailRequestState.requestId === requestId
          ? applyErrorToRequestState(state.detailRequestState, cancelledError())
          : createErroredRequestState("detailed", requestId, cancelledError())
    });
  };

  const dedupeActiveDetailStart = (): boolean => {
    if (
      viewState.detailDispatchPending ||
      state.detailRequestState.phase === "starting" ||
      state.detailRequestState.phase === "streaming"
    ) {
      return true;
    }

    return false;
  };

  const startShortExplanation = async (): Promise<void> => {
    if (state.cardPhase !== "open" || !state.selectedText) {
      return;
    }

    const interactionVersionAtDispatch = interactionVersion;
    const dispatchVersion = ++shortDispatchVersion;
    const pageInstanceId = state.senderContext.pageInstanceId;
    const selectedText = state.selectedText;
    const requestId = crypto.randomUUID();
    const visibleStartedAt = performance.now();
    pendingShortRequestId = requestId;

    replaceViewState({
      ...viewState,
      shortDispatchPending: true,
      shortLoadingStage: "generating",
      shortCancelAvailable: false
    });
    render();

    const response = await startPromptExplanation({
      requestId,
      senderContext: state.senderContext,
      text: selectedText,
      mode: "short",
      visibleStartedAt,
      onEvent: handleExplanationEvent,
      onStage: (stage) => {
        if (
          interactionVersionAtDispatch !== interactionVersion ||
          dispatchVersion !== shortDispatchVersion ||
          !matchesCurrentCard(pageInstanceId, selectedText)
        ) {
          return;
        }
        replaceViewState({ ...viewState, shortLoadingStage: stage });
        render();
      },
      onLongWait: (visible) => {
        if (
          interactionVersionAtDispatch !== interactionVersion ||
          dispatchVersion !== shortDispatchVersion ||
          !matchesCurrentCard(pageInstanceId, selectedText)
        ) {
          return;
        }
        replaceViewState({ ...viewState, shortCancelAvailable: visible });
        render();
      }
    });
    if (pendingShortRequestId === requestId) {
      pendingShortRequestId = null;
    }

    if (
      interactionVersionAtDispatch !== interactionVersion ||
      dispatchVersion !== shortDispatchVersion ||
      !matchesCurrentCard(pageInstanceId, selectedText)
    ) {
      cancelPromptExplanation(requestId);
      return;
    }

    if (!response.ok) {
      replaceViewState({
        ...viewState,
        shortDispatchPending: false
      });
      setState({
        ...state,
        shortRequestState: createErroredRequestState("short", requestId, response.error)
      });
      return;
    }

    replaceViewState({
      ...viewState,
      shortDispatchPending: false
    });
    setState({
      ...state,
      shortRequestState: createStartingRequestState("short", response.requestId)
    });
  };

  const regenerateShortExplanation = (): void => {
    if (state.cardPhase !== "open") {
      return;
    }

    cancelActiveRequests(state);
    rotateInteractionVersion();
    resetViewState();
    state = {
      ...state,
      detailExpanded: false,
      shortRequestState: createIdleRequestState("short"),
      detailRequestState: createIdleRequestState("detailed")
    };
    render();
    void startShortExplanation();
  };

  const startDetailExplanation = async (
    replaceExisting: boolean = false
  ): Promise<void> => {
    if (!canStartDetailRequest()) {
      return;
    }

    if (!replaceExisting && dedupeActiveDetailStart()) {
      setState({
        ...state,
        detailExpanded: true
      });
      return;
    }

    const interactionVersionAtDispatch = interactionVersion;
    const dispatchVersion = ++detailDispatchVersion;
    const pageInstanceId = state.senderContext.pageInstanceId;
    const selectedText = state.selectedText;
    const requestId = crypto.randomUUID();
    const visibleStartedAt = performance.now();
    pendingDetailRequestId = requestId;
    if (replaceExisting) {
      cancelActiveDetailRequest(state);
    }

    replaceViewState({
      ...viewState,
      detailDispatchPending: true,
      detailLoadingStage: "generating",
      detailCancelAvailable: false
    });
    setState({
      ...state,
      detailExpanded: true
    });

    const response = await startPromptExplanation({
      requestId,
      senderContext: state.senderContext,
      text: selectedText ?? "",
      mode: "detailed",
      visibleStartedAt,
      onEvent: handleExplanationEvent,
      onStage: (stage) => {
        if (
          interactionVersionAtDispatch !== interactionVersion ||
          dispatchVersion !== detailDispatchVersion ||
          !matchesCurrentCard(pageInstanceId, selectedText ?? "")
        ) {
          return;
        }
        replaceViewState({ ...viewState, detailLoadingStage: stage });
        render();
      },
      onLongWait: (visible) => {
        if (
          interactionVersionAtDispatch !== interactionVersion ||
          dispatchVersion !== detailDispatchVersion ||
          !matchesCurrentCard(pageInstanceId, selectedText ?? "")
        ) {
          return;
        }
        replaceViewState({ ...viewState, detailCancelAvailable: visible });
        render();
      }
    });
    if (pendingDetailRequestId === requestId) {
      pendingDetailRequestId = null;
    }

    if (
      interactionVersionAtDispatch !== interactionVersion ||
      dispatchVersion !== detailDispatchVersion ||
      !matchesCurrentCard(pageInstanceId, selectedText ?? "")
    ) {
      cancelPromptExplanation(requestId);
      return;
    }

    if (!response.ok) {
      replaceViewState({
        ...viewState,
        detailDispatchPending: false
      });
      setState({
        ...state,
        detailExpanded: true,
        detailRequestState: createErroredRequestState(
          "detailed",
          requestId,
          response.error
        )
      });
      return;
    }

    replaceViewState({
      ...viewState,
      detailDispatchPending: false
    });
    setState({
      ...state,
      detailExpanded: true,
      detailRequestState: createStartingRequestState(
        "detailed",
        response.requestId
      )
    });
  };

  const regenerateDetailExplanation = (): void => {
    if (state.cardPhase !== "open" || state.activeModel === null) {
      return;
    }

    cancelActiveDetailRequest(state);
    rotateInteractionVersion();
    resetViewState();
    state = {
      ...state,
      detailExpanded: true,
      detailRequestState: createIdleRequestState("detailed")
    };
    render();
    void startDetailExplanation(true);
  };

  const applySelection = (): void => {
    const liveSelection = resolveValidLiveSelection();
    const next = applyLiveSelectionUpdate(state, pendingSelection, liveSelection);
    const shouldCancelExistingRequest =
      state.cardPhase === "open" &&
      (next.state.cardPhase !== "open" || next.state.selectedText !== state.selectedText);
    if (shouldCancelExistingRequest) {
      cancelActiveRequests(state);
      rotateInteractionVersion();
      resetViewState();
    }

    pendingSelection = next.pendingSelection;
    setState(next.state);
    scheduleWarmup();
  };

  const handleClickAway = (event: MouseEvent): void => {
    if (state.cardPhase !== "open") {
      return;
    }

    if (
      shouldIgnoreCardClickAway(event, shadowRootHandle.host)
    ) {
      return;
    }

    clearPendingSelection();
    cancelActiveRequests(state);
    rotateInteractionVersion();
    resetViewState();
    setState(resetCardInteraction(state));
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || state.cardPhase !== "open") {
      return;
    }
    clearPendingSelection();
    cancelActiveRequests(state);
    rotateInteractionVersion();
    resetViewState();
    setState(resetCardInteraction(state));
  };

  const handleExplanationEvent = (message: ExplanationEventMessage): void => {
    if (!matchesShortRequestEvent(message) && !matchesDetailRequestEvent(message)) {
      return;
    }

    replaceViewState({
      ...viewState,
      shortDispatchPending: matchesShortRequestEvent(message)
        ? false
        : viewState.shortDispatchPending,
      detailDispatchPending: matchesDetailRequestEvent(message)
        ? false
        : viewState.detailDispatchPending
    });

    const isShortEvent = matchesShortRequestEvent(message);
    const requestKey = isShortEvent ? "shortRequestState" : "detailRequestState";
    const currentRequestState = state[requestKey];

    switch (message.payload.event.event) {
      case "start":
        setState({
          ...state,
          senderContext: message.payload.senderContext,
          activeModel: message.payload.event.model,
          [requestKey]: applyForwardedStartEvent(
            currentRequestState,
            message.payload.event
          )
        } as ContentCardState);
        break;
      case "chunk":
        setState({
          ...state,
          [requestKey]: applyChunkToRequestState(
            currentRequestState,
            message.payload.event.delta
          )
        } as ContentCardState);
        break;
      case "complete":
        setState({
          ...state,
          [requestKey]: applyCompleteToRequestState(currentRequestState)
        } as ContentCardState);
        break;
      case "error":
        setState({
          ...state,
          [requestKey]: applyErrorToRequestState(
            currentRequestState,
            message.payload.event.error
          )
        } as ContentCardState);
        break;
      default:
        break;
    }
  };

  document.addEventListener("selectionchange", applySelection);
  document.addEventListener("mouseup", applySelection);
  document.addEventListener("keyup", applySelection);
  document.addEventListener("mousedown", handleClickAway, true);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", render);
  document.addEventListener("visibilitychange", () => {
    const hidden = document.visibilityState !== "visible";
    if (hidden) cancelScheduledWarmup();
    handlePromptPageVisibility(hidden);
  });
  window.addEventListener("pagehide", () => {
    cancelScheduledWarmup();
    disposePromptResources();
  });
  bindPageInstanceNavigation(() => {
    cancelScheduledWarmup();
    disposePromptResources();
    clearPendingSelection();
    cancelActiveRequests(state);
    rotateInteractionVersion();
    resetViewState();
    setState(updatePageInstance(state, createPageInstanceId()));
  });

  setState(state);
}
