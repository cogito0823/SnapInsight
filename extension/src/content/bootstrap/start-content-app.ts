import { computeAnchor } from "../anchor/compute-anchor";
import {
  bindPageInstanceNavigation,
  createPageInstanceId
} from "./page-instance";
import {
  cancelExplanation,
  isExplanationEventMessage,
  persistSelectedModel,
  requestModelCatalog,
  requestShortExplanation
} from "../messaging/worker-client";
import type { ExplanationEventMessage } from "../../shared/contracts/events";
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
  createErroredRequestState,
  createStartingRequestState
} from "../state/request-state";
import { renderContentApp } from "../ui/render-app";
import { shouldIgnoreCardClickAway } from "../ui/click-away";
import { ensureShadowRoot } from "../ui/shadow-root";
import type { ExtensionError } from "../../shared/errors/error-codes";
import type { ModelSummary } from "../../shared/models/model-summary";

const CONTENT_APP_MARKER = "data-snapinsight-content-app";

interface ContentViewState {
  shortDispatchPending: boolean;
  detailDispatchPending: boolean;
  modelPicker: {
    phase: "idle" | "loading" | "ready" | "no_models_available" | "error" | "saving";
    targetArea: "short" | "detail" | null;
    options: ModelSummary[];
    selectedModel: string | null;
    error: ExtensionError | null;
  };
}

function createInitialViewState(): ContentViewState {
  return {
    shortDispatchPending: false,
    detailDispatchPending: false,
    modelPicker: {
      phase: "idle",
      targetArea: null,
      options: [],
      selectedModel: null,
      error: null
    }
  };
}

function clearNativeSelectionAfterCardOpen(): void {
  const activeElement = document.activeElement;

  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  ) {
    const end = activeElement.selectionEnd;
    if (end !== null) {
      activeElement.setSelectionRange(end, end);
    }
    return;
  }

  window.getSelection()?.removeAllRanges();
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
  let modelPickerDispatchVersion = 0;
  let modelPickerInteracting = false;

  const clearPendingSelection = (): void => {
    pendingSelection = null;
  };

  const replaceViewState = (nextViewState: ContentViewState): void => {
    viewState = nextViewState;
  };

  const resetViewState = (): void => {
    modelPickerInteracting = false;
    replaceViewState(createInitialViewState());
  };

  const markModelPickerInteractionStart = (): void => {
    modelPickerInteracting = true;
  };

  const markModelPickerInteractionEnd = (): void => {
    globalThis.setTimeout(() => {
      modelPickerInteracting = false;
    }, 0);
  };

  const rotateInteractionVersion = (): number => {
    interactionVersion += 1;
    shortDispatchVersion += 1;
    detailDispatchVersion += 1;
    modelPickerDispatchVersion += 1;
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
        detailDispatchPending: viewState.detailDispatchPending,
        modelPicker: viewState.modelPicker
      },
      {
        onTriggerHover: () => {
          const liveSelection = resolveValidLiveSelection();
          const next = acceptLiveSelectionForOpen(state, liveSelection);
          pendingSelection = next.pendingSelection;
          rotateInteractionVersion();
          resetViewState();
          state = next.state;
          clearNativeSelectionAfterCardOpen();
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
          void startShortExplanation(state.activeModel ?? undefined);
        },
        onExpandDetail: () => {
          void startDetailExplanation();
        },
        onRetryDetail: () => {
          void startDetailExplanation(state.activeModel ?? undefined, true);
        },
        onModelSelectionChange: (modelId) => {
          replaceViewState({
            ...viewState,
            modelPicker: {
              ...viewState.modelPicker,
              selectedModel: modelId,
              error: null
            }
          });
          render();
        },
        onSaveModelSelection: () => {
          void saveSelectedModelAndRetry();
        },
        onModelSelectionInteractionStart: () => {
          markModelPickerInteractionStart();
        },
        onModelSelectionInteractionEnd: () => {
          markModelPickerInteractionEnd();
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
    requestState: ContentCardState["shortRequestState"] | ContentCardState["detailRequestState"],
    senderContext: ContentCardState["senderContext"]
  ): void => {
    if (
      !requestState.requestId ||
      (requestState.phase !== "starting" && requestState.phase !== "streaming")
    ) {
      return;
    }

    void cancelExplanation({
      requestId: requestState.requestId,
      senderContext
    });
  };

  const cancelActiveShortRequest = (snapshotState: ContentCardState): void => {
    cancelActiveRequest(snapshotState.shortRequestState, snapshotState.senderContext);
  };

  const cancelActiveDetailRequest = (snapshotState: ContentCardState): void => {
    cancelActiveRequest(snapshotState.detailRequestState, snapshotState.senderContext);
  };

  const cancelActiveRequests = (snapshotState: ContentCardState): void => {
    cancelActiveShortRequest(snapshotState);
    cancelActiveDetailRequest(snapshotState);
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

  const loadModelPicker = async (targetArea: "short" | "detail"): Promise<void> => {
    const interactionVersionAtDispatch = interactionVersion;
    const dispatchVersion = ++modelPickerDispatchVersion;
    const pageInstanceId = state.senderContext.pageInstanceId;
    const selectedText = state.selectedText;

    replaceViewState({
      ...viewState,
      modelPicker: {
        phase: "loading",
        targetArea,
        options: [],
        selectedModel: null,
        error: null
      }
    });
    render();

    const response = await requestModelCatalog();
    if (
      interactionVersionAtDispatch !== interactionVersion ||
      dispatchVersion !== modelPickerDispatchVersion ||
      !matchesCurrentCard(pageInstanceId, selectedText ?? "")
    ) {
      return;
    }

    if (!response.ok) {
      replaceViewState({
        ...viewState,
        modelPicker: {
          phase: "error",
          targetArea,
          options: [],
          selectedModel: null,
          error: response.error
        }
      });
      render();
      return;
    }

    if (response.data.state === "no_models_available") {
      replaceViewState({
        ...viewState,
        modelPicker: {
          phase: "no_models_available",
          targetArea,
          options: [],
          selectedModel: null,
          error: null
        }
      });
      render();
      return;
    }

    replaceViewState({
      ...viewState,
      modelPicker: {
        phase: "ready",
          targetArea,
        options: response.data.models,
        selectedModel: response.data.models[0]?.id ?? null,
        error: null
      }
    });
    render();
  };

  const startShortExplanation = async (modelOverride?: string): Promise<void> => {
    if (state.cardPhase !== "open" || !state.selectedText) {
      return;
    }

    const interactionVersionAtDispatch = interactionVersion;
    const dispatchVersion = ++shortDispatchVersion;
    const pageInstanceId = state.senderContext.pageInstanceId;
    const selectedText = state.selectedText;
    const requestId = crypto.randomUUID();

    replaceViewState({
      ...viewState,
      shortDispatchPending: true
    });
    render();

    const response = await requestShortExplanation({
      requestId,
      senderContext: state.senderContext,
      text: selectedText,
      mode: "short",
      ...(modelOverride ? { model: modelOverride } : {})
    });

    if (
      interactionVersionAtDispatch !== interactionVersion ||
      dispatchVersion !== shortDispatchVersion ||
      !matchesCurrentCard(pageInstanceId, selectedText)
    ) {
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

      if (response.error.code === "selected_model_unavailable") {
        void loadModelPicker("short");
      }
      return;
    }

    replaceViewState({
      ...viewState,
      shortDispatchPending: false
    });
    setState({
      ...state,
      shortRequestState: createStartingRequestState("short", response.data.requestId)
    });
  };

  const startDetailExplanation = async (
    modelOverride?: string,
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
    const effectiveModelOverride = modelOverride ?? state.activeModel ?? undefined;

    if (replaceExisting) {
      cancelActiveDetailRequest(state);
    }

    replaceViewState({
      ...viewState,
      detailDispatchPending: true
    });
    setState({
      ...state,
      detailExpanded: true
    });

    const response = await requestShortExplanation({
      requestId,
      senderContext: state.senderContext,
      text: selectedText ?? "",
      mode: "detailed",
      ...(effectiveModelOverride ? { model: effectiveModelOverride } : {})
    });

    if (
      interactionVersionAtDispatch !== interactionVersion ||
      dispatchVersion !== detailDispatchVersion ||
      !matchesCurrentCard(pageInstanceId, selectedText ?? "")
    ) {
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
      if (response.error.code === "selected_model_unavailable") {
        void loadModelPicker("detail");
      }
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
        response.data.requestId
      )
    });
  };

  const saveSelectedModelAndRetry = async (): Promise<void> => {
    const selectedModel = viewState.modelPicker.selectedModel;
    if (!selectedModel || state.cardPhase !== "open") {
      return;
    }

    const retryTargetArea = viewState.modelPicker.targetArea ?? "short";
    const interactionVersionAtDispatch = interactionVersion;
    const dispatchVersion = ++modelPickerDispatchVersion;
    replaceViewState({
      ...viewState,
      modelPicker: {
        ...viewState.modelPicker,
        phase: "saving",
        error: null
      }
    });
    render();

    const response = await persistSelectedModel(selectedModel);
    if (
      interactionVersionAtDispatch !== interactionVersion ||
      dispatchVersion !== modelPickerDispatchVersion ||
      state.cardPhase !== "open"
    ) {
      return;
    }

    if (!response.ok) {
      replaceViewState({
        ...viewState,
        modelPicker: {
          ...viewState.modelPicker,
          phase: "ready",
          error: response.error
        }
      });
      render();

      if (response.error.code === "selected_model_unavailable") {
        void loadModelPicker(viewState.modelPicker.targetArea ?? "short");
      }
      return;
    }

    replaceViewState({
      ...viewState,
      modelPicker: {
        ...createInitialViewState().modelPicker
      }
    });
    render();
    if (retryTargetArea === "detail") {
      void startDetailExplanation(selectedModel, true);
      return;
    }

    void startShortExplanation(selectedModel);
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
  };

  const handleClickAway = (event: MouseEvent): void => {
    if (state.cardPhase !== "open") {
      return;
    }

    if (
      shouldIgnoreCardClickAway(
        event,
        shadowRootHandle.host,
        shadowRootHandle.root,
        modelPickerInteracting
      )
    ) {
      return;
    }

    clearPendingSelection();
    cancelActiveRequests(state);
    rotateInteractionVersion();
    resetViewState();
    setState(resetCardInteraction(state));
  };

  const handleWorkerEvent = (message: unknown): void => {
    if (!isExplanationEventMessage(message)) {
      return;
    }

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
        if (message.payload.event.error.code === "selected_model_unavailable") {
          void loadModelPicker(isShortEvent ? "short" : "detail");
        }
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
  chrome.runtime.onMessage.addListener((message) => {
    handleWorkerEvent(message);
    return false;
  });

  bindPageInstanceNavigation(() => {
    clearPendingSelection();
    cancelActiveRequests(state);
    rotateInteractionVersion();
    resetViewState();
    setState(updatePageInstance(state, createPageInstanceId()));
  });

  setState(state);
}
