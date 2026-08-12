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

const OPTIONS_ROOT_ID = "app";

function preparationErrorMessage(error: unknown): string {
  if (!(error instanceof PromptPreparationError)) {
    return "模型准备过程意外中断，请重新检查后再试。";
  }

  switch (error.reason) {
    case "api_missing":
      return "当前 Chrome 未提供 Prompt API，请更新浏览器后重试。";
    case "device_unsupported":
      return "当前设备不符合 Chrome 设备端模型的运行要求。";
    case "language_unsupported":
      return "Chrome 设备端模型拒绝了当前语言配置。";
    case "quota_exceeded":
      return "设备端模型容量暂时不足，请关闭其他 AI 会话后重试。";
    case "download_failed":
    default:
      return "模型下载或初始化失败，请检查网络、磁盘空间后重试。";
  }
}

export function startOptionsApp(): void {
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
        errorMessage: "无法读取 Chrome 设备端模型状态，请重新打开此页面。"
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
