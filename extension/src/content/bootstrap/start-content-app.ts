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
import { ensureShadowRoot } from "../ui/shadow-root";
import type { ExtensionError } from "../../shared/errors/error-codes";
import type { ModelSummary } from "../../shared/models/model-summary";

const CONTENT_APP_MARKER = "data-snapinsight-content-app";

interface ContentViewState {
  shortDispatchPending: boolean;
  modelPicker: {
    phase: "idle" | "loading" | "ready" | "no_models_available" | "error" | "saving";
    options: ModelSummary[];
    selectedModel: string | null;
    error: ExtensionError | null;
  };
}

function createInitialViewState(): ContentViewState {
  return {
    shortDispatchPending: false,
    modelPicker: {
      phase: "idle",
      options: [],
      selectedModel: null,
      error: null
    }
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
  let modelPickerDispatchVersion = 0;

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
        dispatchPending: viewState.shortDispatchPending,
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
          render();
          void startShortExplanation();
        },
        onCloseCard: () => {
          clearPendingSelection();
          cancelActiveShortRequest(state);
          rotateInteractionVersion();
          resetViewState();
          state = resetCardInteraction(state);
          render();
        },
        onRetryShort: () => {
          void startShortExplanation(state.activeModel ?? undefined);
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

  const cancelActiveShortRequest = (snapshotState: ContentCardState): void => {
    if (
      !snapshotState.shortRequestState.requestId ||
      (snapshotState.shortRequestState.phase !== "starting" &&
        snapshotState.shortRequestState.phase !== "streaming")
    ) {
      return;
    }

    void cancelExplanation({
      requestId: snapshotState.shortRequestState.requestId,
      senderContext: snapshotState.senderContext
    });
  };

  const loadModelPicker = async (): Promise<void> => {
    const interactionVersionAtDispatch = interactionVersion;
    const dispatchVersion = ++modelPickerDispatchVersion;
    const pageInstanceId = state.senderContext.pageInstanceId;
    const selectedText = state.selectedText;

    replaceViewState({
      ...viewState,
      modelPicker: {
        phase: "loading",
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
        void loadModelPicker();
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

  const saveSelectedModelAndRetry = async (): Promise<void> => {
    const selectedModel = viewState.modelPicker.selectedModel;
    if (!selectedModel || state.cardPhase !== "open") {
      return;
    }

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
        void loadModelPicker();
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
    void startShortExplanation(selectedModel);
  };

  const applySelection = (): void => {
    const liveSelection = resolveValidLiveSelection();
    const next = applyLiveSelectionUpdate(state, pendingSelection, liveSelection);
    const shouldCancelExistingRequest =
      state.cardPhase === "open" &&
      (next.state.cardPhase !== "open" || next.state.selectedText !== state.selectedText);
    if (shouldCancelExistingRequest) {
      cancelActiveShortRequest(state);
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

    if (event.composedPath().includes(shadowRootHandle.host)) {
      return;
    }

    clearPendingSelection();
    cancelActiveShortRequest(state);
    rotateInteractionVersion();
    resetViewState();
    setState(resetCardInteraction(state));
  };

  const handleWorkerEvent = (message: unknown): void => {
    if (!isExplanationEventMessage(message)) {
      return;
    }

    if (!matchesShortRequestEvent(message)) {
      return;
    }

    replaceViewState({
      ...viewState,
      shortDispatchPending: false
    });

    switch (message.payload.event.event) {
      case "start":
        setState({
          ...state,
          senderContext: message.payload.senderContext,
          activeModel: message.payload.event.model,
          shortRequestState: applyForwardedStartEvent(
            state.shortRequestState,
            message.payload.event
          )
        });
        break;
      case "chunk":
        setState({
          ...state,
          shortRequestState: applyChunkToRequestState(
            state.shortRequestState,
            message.payload.event.delta
          )
        });
        break;
      case "complete":
        setState({
          ...state,
          shortRequestState: applyCompleteToRequestState(state.shortRequestState)
        });
        break;
      case "error":
        setState({
          ...state,
          shortRequestState: applyErrorToRequestState(
            state.shortRequestState,
            message.payload.event.error
          )
        });
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
    cancelActiveShortRequest(state);
    rotateInteractionVersion();
    resetViewState();
    setState(updatePageInstance(state, createPageInstanceId()));
  });

  setState(state);
}
