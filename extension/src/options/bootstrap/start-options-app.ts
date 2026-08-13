import {
  preparePromptModel,
  PromptPreparationError,
  readPromptReadiness
} from "../../prompt-api/readiness";
import { renderOptionsPage } from "../components/options-page";
import {
  createInitialOptionsState,
  type OptionsState
} from "../state/options-state";
import { getUiLanguage, t } from "../../shared/i18n";

const OPTIONS_ROOT_ID = "app";

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

  const setState = (next: OptionsState): void => {
    state = next;
    render();
  };

  const check = async (): Promise<void> => {
    setState({ phase: "checking", progress: null, errorMessage: null });
    try {
      const readiness = await readPromptReadiness();
      setState({ phase: readiness.state, progress: null, errorMessage: null });
    } catch {
      setState({
        phase: "error",
        progress: null,
        errorMessage: t("readinessReadFailed")
      });
    }
  };

  const prepare = async (): Promise<void> => {
    setState({ phase: "preparing", progress: 0, errorMessage: null });
    try {
      await preparePromptModel({
        onProgress(progress) {
          setState({ phase: "preparing", progress, errorMessage: null });
        }
      });
      await check();
    } catch (error) {
      setState({
        phase: "error",
        progress: null,
        errorMessage: preparationErrorMessage(error)
      });
    }
  };

  const bindEvents = (): void => {
    root
      .querySelector<HTMLButtonElement>("#prepare-model-button")
      ?.addEventListener("click", () => void prepare());
    root
      .querySelector<HTMLButtonElement>("#recheck-button")
      ?.addEventListener("click", () => void check());
  };

  const render = (): void => {
    root.innerHTML = renderOptionsPage(state);
    bindEvents();
  };

  render();
  void check();
}
