import {
  createUnexpectedLoadError,
  loadSettingsSurface
} from "../actions/load-settings";
import {
  createUnexpectedSaveError,
  saveSelectedModel
} from "../actions/save-selected-model";
import { renderOptionsPage } from "../components/options-page";
import {
  createInitialOptionsState,
  type OptionsState
} from "../state/options-state";

const OPTIONS_ROOT_ID = "app";

export function startOptionsApp(): void {
  const root = document.getElementById(OPTIONS_ROOT_ID) ?? document.body;
  let state = createInitialOptionsState();

  const setState = (partial: Partial<OptionsState>): void => {
    state = {
      ...state,
      ...partial
    };
    render();
  };

  const load = async (): Promise<void> => {
    setState({
      loadingPhase: "loading",
      loadError: null,
      saveError: null,
      saveSuccessMessage: null
    });

    try {
      const nextState = await loadSettingsSurface();
      setState(nextState);
    } catch {
      setState({
        loadingPhase: "error",
        loadError: createUnexpectedLoadError(),
        availableModels: [],
        modelCatalogState: null
      });
    }
  };

  const save = async (): Promise<void> => {
    if (!state.selectedModelDraft) {
      return;
    }

    setState({
      isSaving: true,
      saveError: null,
      saveSuccessMessage: null
    });

    try {
      const result = await saveSelectedModel(state.selectedModelDraft);

      if (!result.ok) {
        setState({
          isSaving: false,
          saveError: result.error,
          saveSuccessMessage: null
        });
        return;
      }

      setState({
        isSaving: false,
        persistedSelectedModel: state.selectedModelDraft,
        saveError: null,
        saveSuccessMessage: "模型已保存。"
      });
    } catch {
      setState({
        isSaving: false,
        saveError: createUnexpectedSaveError(),
        saveSuccessMessage: null
      });
    }
  };

  const bindEvents = (): void => {
    const select = root.querySelector<HTMLSelectElement>("#model-select");
    const saveButton = root.querySelector<HTMLButtonElement>(
      "#save-model-button"
    );
    const reloadButton = root.querySelector<HTMLButtonElement>(
      "#reload-settings-button"
    );

    select?.addEventListener("change", () => {
      setState({
        selectedModelDraft: select.value || null,
        saveError: null,
        saveSuccessMessage: null
      });
    });

    saveButton?.addEventListener("click", () => {
      void save();
    });

    reloadButton?.addEventListener("click", () => {
      void load();
    });
  };

  const render = (): void => {
    root.innerHTML = renderOptionsPage(state);
    bindEvents();
  };

  render();
  void load();
}
