import {
  preparePromptModel,
  PromptPreparationError,
  readPromptReadiness
} from "../../prompt-api/readiness";
import { renderOptionsPage } from "../components/options-page";
import {
  createInitialOptionsState,
  formatElapsedTime,
  type OptionsState
} from "../state/options-state";
import { getUiLanguage, t } from "../../shared/i18n";

const OPTIONS_ROOT_ID = "app";
const READINESS_POLL_INTERVAL_MS = 3_000;
const MODEL_PREPARATION_STARTED_AT_KEY = "modelPreparationStartedAt";

function readPreparationStartedAt(): Promise<number | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(MODEL_PREPARATION_STARTED_AT_KEY, (items) => {
      const value = items[MODEL_PREPARATION_STARTED_AT_KEY];
      resolve(typeof value === "number" && Number.isFinite(value) ? value : null);
    });
  });
}

function writePreparationStartedAt(value: number | null): void {
  chrome.storage.local.set({ [MODEL_PREPARATION_STARTED_AT_KEY]: value });
}

function preparationErrorMessage(error: unknown): string {
  if (!(error instanceof PromptPreparationError)) {
    return t("preparationInterrupted");
  }

  switch (error.reason) {
    case "api_missing":
      return t("preparationApiMissing");
    case "device_unsupported":
      return t("preparationDeviceUnsupported");
    case "language_unsupported":
      return t("preparationLanguageUnsupported");
    case "quota_exceeded":
      return t("preparationQuotaExceeded");
    case "download_failed":
    default:
      return t("preparationDownloadFailed");
  }
}

export function startOptionsApp(): void {
  document.documentElement.lang = getUiLanguage();
  document.title = t("optionsTitle");
  const root = document.getElementById(OPTIONS_ROOT_ID) ?? document.body;
  let state = createInitialOptionsState();
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;
  let preparationStartedAt: number | null = null;
  let readinessCheckInFlight = false;

  const shouldPoll = (): boolean =>
    state.phase === "downloading" || state.phase === "preparing";

  const stopPolling = (): void => {
    if (pollTimer !== null) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  };

  const stopElapsedTimer = (): void => {
    if (elapsedTimer !== null) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
  };

  const updateElapsedTime = (): void => {
    const element = root.querySelector<HTMLElement>("#model-elapsed-time");
    if (!element || preparationStartedAt === null) {
      return;
    }
    element.textContent = t(
      "preparationElapsed",
      formatElapsedTime(Date.now() - preparationStartedAt)
    );
  };

  const syncElapsedTimer = (): void => {
    if (!shouldPoll()) {
      stopElapsedTimer();
      return;
    }

    if (preparationStartedAt === null) {
      preparationStartedAt = Date.now();
      writePreparationStartedAt(preparationStartedAt);
    }
    updateElapsedTime();
    if (elapsedTimer === null) {
      elapsedTimer = setInterval(updateElapsedTime, 1_000);
    }
  };

  const schedulePoll = (delay = READINESS_POLL_INTERVAL_MS): void => {
    if (
      pollTimer !== null ||
      !shouldPoll() ||
      document.visibilityState === "hidden"
    ) {
      return;
    }

    pollTimer = setTimeout(() => {
      pollTimer = null;
      void refreshReadiness(false);
    }, delay);
  };

  const setState = (next: OptionsState): void => {
    if (
      state.phase === next.phase &&
      state.progress === next.progress &&
      state.progressStage === next.progressStage &&
      state.progressScope === next.progressScope &&
      state.errorMessage === next.errorMessage
    ) {
      return;
    }

    state = next;
    if (
      next.phase === "ready" ||
      next.phase === "downloadable" ||
      next.phase === "unsupported" ||
      next.phase === "error"
    ) {
      preparationStartedAt = null;
      writePreparationStartedAt(null);
    }
    render();
    syncElapsedTimer();
    if (shouldPoll()) {
      schedulePoll();
    } else {
      stopPolling();
    }
  };

  const refreshReadiness = async (showChecking: boolean): Promise<void> => {
    if (readinessCheckInFlight) {
      return;
    }

    readinessCheckInFlight = true;
    if (showChecking) {
      setState({
        phase: "checking",
        progress: null,
        progressStage: null,
        progressScope: null,
        errorMessage: null
      });
    }

    try {
      const readiness = await readPromptReadiness();
      if (
        (state.phase === "preparing" || state.phase === "downloading") &&
        readiness.state === "downloadable"
      ) {
        return;
      }

      if (state.phase === "preparing" && readiness.state === "downloading") {
        return;
      }

      setState({
        phase: readiness.state,
        progress: null,
        progressStage:
          readiness.state === "downloading" ? "downloading" : null,
        progressScope: null,
        errorMessage: null
      });
    } catch {
      if (showChecking) {
        setState({
          phase: "error",
          progress: null,
          progressStage: null,
          progressScope: null,
          errorMessage: t("readinessReadFailed")
        });
      }
    } finally {
      readinessCheckInFlight = false;
      schedulePoll();
    }
  };

  const prepare = async (): Promise<void> => {
    if (state.phase === "preparing") {
      return;
    }

    const progressScope =
      state.phase === "downloading" ? "remaining" : "overall";
    setState({
      phase: "preparing",
      progress: null,
      progressStage: "downloading",
      progressScope,
      errorMessage: null
    });
    try {
      await preparePromptModel({
        onProgress(progress) {
          if (state.phase !== "ready") {
            setState({
              phase: "preparing",
              progress: progress.percentage,
              progressStage: progress.stage,
              progressScope,
              errorMessage: null
            });
          }
        }
      });
      setState({
        phase: "ready",
        progress: null,
        progressStage: null,
        progressScope: null,
        errorMessage: null
      });
    } catch (error) {
      setState({
        phase: "error",
        progress: null,
        progressStage: null,
        progressScope: null,
        errorMessage: preparationErrorMessage(error)
      });
    }
  };

  const bindEvents = (): void => {
    root
      .querySelector<HTMLButtonElement>("#prepare-model-button")
      ?.addEventListener("click", () => void prepare());
  };

  const render = (): void => {
    root.innerHTML = renderOptionsPage(state);
    bindEvents();
  };

  render();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      stopPolling();
    } else if (shouldPoll()) {
      schedulePoll(0);
    }
  });
  void readPreparationStartedAt().then((startedAt) => {
    preparationStartedAt = startedAt;
    return refreshReadiness(true);
  });
}
