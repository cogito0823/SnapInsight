import { renderModelSelect } from "./model-select";
import {
  errorMessageForOptions,
  renderStatusBanner
} from "./status-banner";
import { renderStaleCacheNote } from "./stale-cache-note";
import type { OptionsState } from "../state/options-state";

export function renderOptionsPage(state: OptionsState): string {
  const canSave =
    !state.isSaving &&
    state.loadingPhase === "ready" &&
    state.modelCatalogState === "ready" &&
    !!state.selectedModelDraft;

  const liveLoadMessage =
    state.loadingPhase === "loading"
      ? renderStatusBanner("正在加载当前设置和模型列表...", "info")
      : state.loadError
        ? renderStatusBanner(errorMessageForOptions(state.loadError), "error")
        : state.modelCatalogState === "no_models_available"
          ? renderStatusBanner(
              "本地服务已连接，但当前没有可用模型，请先在 Ollama 中安装模型。",
              "warning"
            )
          : "";

  const saveBanner = state.saveError
    ? renderStatusBanner(errorMessageForOptions(state.saveError), "error")
    : renderStatusBanner(state.saveSuccessMessage, "success");

  const selectionHint = state.persistedSelectedModel
    ? `已保存模型：${state.persistedSelectedModel}`
    : "尚未保存默认模型。";

  return `
    <main style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#0f172a; background:#f8fafc; min-height:100vh; padding:32px 20px;">
      <section style="max-width:760px; margin:0 auto; background:white; border:1px solid #e2e8f0; border-radius:18px; padding:24px; box-shadow:0 12px 30px rgba(15,23,42,0.06);">
        <header style="margin-bottom:20px;">
          <h1 style="margin:0 0 8px; font-size:28px;">SnapInsight 设置</h1>
          <p style="margin:0; color:#475569; line-height:1.7;">
            这里是长期设置入口。模型保存会通过 worker 进行实时校验，不会直接绕过验证写入本地存储。
          </p>
        </header>

        <section style="display:flex; flex-direction:column; gap:16px;">
          ${liveLoadMessage}
          ${saveBanner}

          <div style="padding:14px; border-radius:12px; background:#f8fafc; color:#334155; line-height:1.6;">
            ${selectionHint}
          </div>

          ${renderModelSelect(
            state.availableModels,
            state.selectedModelDraft,
            state.loadingPhase !== "ready" || state.modelCatalogState !== "ready"
          )}

          <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
            <button id="save-model-button" ${
              canSave ? "" : "disabled"
            } style="border:none; border-radius:10px; padding:10px 16px; background:${
              canSave ? "#2563eb" : "#94a3b8"
            }; color:white; font-size:14px; cursor:${canSave ? "pointer" : "not-allowed"};">
              ${state.isSaving ? "保存中..." : "保存模型"}
            </button>
            <button id="reload-settings-button" style="border:1px solid #cbd5e1; border-radius:10px; padding:10px 16px; background:white; color:#0f172a; font-size:14px; cursor:pointer;">
              重新加载
            </button>
          </div>

          ${
            state.loadingPhase === "error"
              ? renderStaleCacheNote(
                  state.lastKnownModels,
                  state.lastModelRefreshAt
                )
              : ""
          }
        </section>
      </section>
    </main>
  `;
}
