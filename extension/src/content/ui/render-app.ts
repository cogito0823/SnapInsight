import type { ContentCardState } from "../state/card-state";
import type { AnchorRect } from "../anchor/normalize-rect";
import type { ExtensionError } from "../../shared/errors/error-codes";
import type { ModelSummary } from "../../shared/models/model-summary";

const TRIGGER_SIZE = 28;
const CARD_WIDTH = 320;
const CARD_GAP = 10;

export interface RenderCallbacks {
  onTriggerHover: () => void;
  onCloseCard: () => void;
  onRetryShort: () => void;
  onModelSelectionChange: (modelId: string) => void;
  onSaveModelSelection: () => void;
}

export interface TriggerViewState {
  anchorRect: AnchorRect | null;
}

export interface ModelPickerViewState {
  phase: "idle" | "loading" | "ready" | "no_models_available" | "error" | "saving";
  options: ModelSummary[];
  selectedModel: string | null;
  error: ExtensionError | null;
}

export interface RequestRenderViewState {
  dispatchPending: boolean;
  modelPicker: ModelPickerViewState;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function computeTriggerStyle(anchorRect: AnchorRect): string {
  const top = Math.max(anchorRect.top - TRIGGER_SIZE - 6, 8);
  const left = clamp(
    anchorRect.left + anchorRect.width - TRIGGER_SIZE,
    8,
    window.innerWidth - TRIGGER_SIZE - 8
  );

  return `top:${top}px;left:${left}px;width:${TRIGGER_SIZE}px;height:${TRIGGER_SIZE}px;`;
}

function computeCardStyle(anchorRect: AnchorRect): string {
  const top = clamp(
    anchorRect.top + anchorRect.height + CARD_GAP,
    8,
    Math.max(8, window.innerHeight - 180)
  );
  const left = clamp(
    anchorRect.left,
    8,
    Math.max(8, window.innerWidth - CARD_WIDTH - 8)
  );

  return `top:${top}px;left:${left}px;width:${CARD_WIDTH}px;`;
}

function renderTrigger(anchorRect: AnchorRect): string {
  return `
    <button
      id="snapinsight-trigger"
      type="button"
      aria-label="打开 SnapInsight 解释卡片"
      style="${computeTriggerStyle(anchorRect)}"
    >
      SI
    </button>
  `;
}

function renderCard(state: ContentCardState): string {
  if (!state.selectionAnchorRect) {
    return "";
  }

  const selectionText = escapeHtml(state.selectedText ?? "");

  return `
    <section id="snapinsight-card" style="${computeCardStyle(
      state.selectionAnchorRect
    )}">
      <header class="snapinsight-card-header">
        <div class="snapinsight-card-title">SnapInsight</div>
        <button id="snapinsight-close" type="button" aria-label="关闭卡片">×</button>
      </header>
      <div class="snapinsight-card-selection">${selectionText}</div>
      <div class="snapinsight-card-body">__SNAPINSIGHT_SHORT_SECTION__</div>
    </section>
  `;
}

function renderLoadingState(message: string): string {
  return `
    <div class="snapinsight-loading-state">
      <div class="snapinsight-loading-dot"></div>
      <div>${escapeHtml(message)}</div>
    </div>
  `;
}

function describeError(error: ExtensionError): string {
  switch (error.code) {
    case "service_unavailable":
      return "本地服务当前不可用，请先确认 SnapInsight 本地服务已启动。";
    case "local_service_conflict":
      return "固定本地端口被其他服务占用，当前无法建立解释请求。";
    case "selected_model_unavailable":
      return "当前需要重新选择一个可用模型后才能继续解释。";
    case "no_models_available":
      return "当前没有可用模型，请先在 Ollama 中安装模型。";
    case "request_failed":
      return error.message;
    default:
      return error.message;
  }
}

function renderRetryButton(error: ExtensionError): string {
  if (!error.retryable) {
    return "";
  }

  return `
    <button id="snapinsight-retry-short" type="button" class="snapinsight-secondary-button">
      重试
    </button>
  `;
}

function renderModelPicker(viewState: ModelPickerViewState): string {
  switch (viewState.phase) {
    case "loading":
      return renderLoadingState("正在加载可用模型...");
    case "no_models_available":
      return `
        <div class="snapinsight-blocked-state">
          <div class="snapinsight-blocked-title">当前没有可用模型</div>
          <div class="snapinsight-blocked-message">
            请先在 Ollama 中安装可用模型，然后再回到当前卡片继续解释。
          </div>
        </div>
      `;
    case "error":
      return `
        <div class="snapinsight-blocked-state">
          <div class="snapinsight-blocked-title">模型列表暂时不可用</div>
          <div class="snapinsight-blocked-message">
            ${escapeHtml(
              viewState.error?.message ?? "暂时无法加载可用模型。"
            )}
          </div>
        </div>
      `;
    case "ready":
    case "saving": {
      const optionMarkup = viewState.options
        .map(
          (model) => `
            <option value="${escapeHtml(model.id)}"${
              model.id === viewState.selectedModel ? " selected" : ""
            }>
              ${escapeHtml(model.label)}
            </option>
          `
        )
        .join("");

      return `
        <div class="snapinsight-blocked-state">
          <div class="snapinsight-blocked-title">请选择一个可用模型</div>
          <div class="snapinsight-blocked-message">
            当前解释被阻塞，选择模型并保存后会在这张卡片内继续发起解释。
          </div>
          <label class="snapinsight-field-label" for="snapinsight-model-select">
            可用模型
          </label>
          <select
            id="snapinsight-model-select"
            class="snapinsight-select"
            ${viewState.phase === "saving" ? "disabled" : ""}
          >
            ${optionMarkup}
          </select>
          ${
            viewState.error
              ? `<div class="snapinsight-inline-error">${escapeHtml(
                  viewState.error.message
                )}</div>`
              : ""
          }
          <button
            id="snapinsight-save-model"
            type="button"
            class="snapinsight-primary-button"
            ${
              !viewState.selectedModel || viewState.phase === "saving"
                ? "disabled"
                : ""
            }
          >
            ${viewState.phase === "saving" ? "保存中..." : "保存并继续解释"}
          </button>
        </div>
      `;
    }
    case "idle":
    default:
      return `
        <div class="snapinsight-blocked-state">
          <div class="snapinsight-blocked-title">需要先选择模型</div>
          <div class="snapinsight-blocked-message">
            正在准备可用模型列表...
          </div>
        </div>
      `;
  }
}

function renderShortSection(
  state: ContentCardState,
  viewState: RequestRenderViewState
): string {
  const request = state.shortRequestState;

  if (viewState.dispatchPending || request.phase === "starting") {
    return renderLoadingState("正在生成简短解释...");
  }

  if (request.phase === "streaming" || request.phase === "completed") {
    return `
      <div class="snapinsight-short-section">
        <div class="snapinsight-section-label">简短解释</div>
        <div class="snapinsight-response-text">${escapeHtml(
          request.textBuffer || "正在生成解释..."
        )}</div>
        ${
          request.phase === "streaming"
            ? '<div class="snapinsight-footnote">内容正在持续生成...</div>'
            : ""
        }
      </div>
    `;
  }

  if (request.phase === "error" && request.errorState) {
    if (request.errorState.code === "selected_model_unavailable") {
      return renderModelPicker(viewState.modelPicker);
    }

    return `
      <div class="snapinsight-blocked-state">
        <div class="snapinsight-blocked-title">解释暂时不可用</div>
        ${
          request.textBuffer
            ? `<div class="snapinsight-response-text">${escapeHtml(
                request.textBuffer
              )}</div>`
            : ""
        }
        <div class="snapinsight-blocked-message">
          ${escapeHtml(describeError(request.errorState))}
        </div>
        ${renderRetryButton(request.errorState)}
      </div>
    `;
  }

  return renderLoadingState("正在准备解释请求...");
}

export function renderContentApp(
  root: ShadowRoot,
  state: ContentCardState,
  triggerViewState: TriggerViewState,
  requestViewState: RequestRenderViewState,
  callbacks: RenderCallbacks
): void {
  const triggerAnchor =
    state.cardPhase === "triggerVisible" ? triggerViewState.anchorRect : null;
  const cardAnchor =
    state.cardPhase === "open" ? state.selectionAnchorRect : null;

  root.innerHTML = `
    <style>
      :host {
        all: initial;
      }

      #app-shell {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      button {
        font: inherit;
      }

      #snapinsight-trigger {
        position: fixed;
        border: 0;
        border-radius: 999px;
        background: #2563eb;
        color: #fff;
        cursor: pointer;
        pointer-events: auto;
        box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28);
        font-size: 12px;
        font-weight: 700;
      }

      #snapinsight-card {
        position: fixed;
        pointer-events: auto;
        box-sizing: border-box;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 14px;
        background: #fff;
        color: #0f172a;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
        padding: 14px;
      }

      .snapinsight-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .snapinsight-card-title {
        font-size: 14px;
        font-weight: 700;
      }

      #snapinsight-close {
        border: 0;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        padding: 0;
      }

      .snapinsight-card-selection {
        border-radius: 10px;
        background: #eff6ff;
        color: #1d4ed8;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 10px;
        padding: 8px 10px;
        word-break: break-word;
      }

      .snapinsight-card-body {
        color: #334155;
        font-size: 13px;
        line-height: 1.5;
      }

      .snapinsight-section-label {
        color: #0f172a;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 6px;
      }

      .snapinsight-response-text {
        color: #0f172a;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .snapinsight-loading-state {
        align-items: center;
        display: flex;
        gap: 10px;
      }

      .snapinsight-loading-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: #2563eb;
        animation: snapinsight-pulse 1.1s ease-in-out infinite;
      }

      .snapinsight-blocked-state {
        display: grid;
        gap: 8px;
      }

      .snapinsight-blocked-title {
        color: #0f172a;
        font-size: 13px;
        font-weight: 700;
      }

      .snapinsight-blocked-message,
      .snapinsight-footnote {
        color: #475569;
        font-size: 12px;
      }

      .snapinsight-field-label {
        color: #334155;
        display: block;
        font-size: 12px;
        font-weight: 600;
      }

      .snapinsight-select {
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 10px;
        box-sizing: border-box;
        color: #0f172a;
        font: inherit;
        min-height: 36px;
        padding: 0 10px;
        width: 100%;
      }

      .snapinsight-primary-button,
      .snapinsight-secondary-button {
        border-radius: 10px;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        min-height: 34px;
        padding: 0 12px;
      }

      .snapinsight-primary-button {
        border: 0;
        background: #2563eb;
        color: #fff;
      }

      .snapinsight-primary-button:disabled,
      .snapinsight-secondary-button:disabled,
      .snapinsight-select:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .snapinsight-secondary-button {
        border: 1px solid rgba(37, 99, 235, 0.2);
        background: #eff6ff;
        color: #1d4ed8;
        justify-self: start;
      }

      .snapinsight-inline-error {
        color: #b91c1c;
        font-size: 12px;
      }

      @keyframes snapinsight-pulse {
        0%,
        100% {
          opacity: 0.35;
          transform: scale(0.92);
        }

        50% {
          opacity: 1;
          transform: scale(1);
        }
      }
    </style>
    <div id="app-shell">
      ${triggerAnchor ? renderTrigger(triggerAnchor) : ""}
      ${
        cardAnchor
          ? renderCard(state).replace(
              "__SNAPINSIGHT_SHORT_SECTION__",
              renderShortSection(state, requestViewState)
            )
          : ""
      }
    </div>
  `;

  const trigger = root.getElementById("snapinsight-trigger");
  if (trigger instanceof HTMLButtonElement) {
    trigger.addEventListener("mouseenter", callbacks.onTriggerHover);
  }

  const closeButton = root.getElementById("snapinsight-close");
  if (closeButton instanceof HTMLButtonElement) {
    closeButton.addEventListener("click", callbacks.onCloseCard);
  }

  const retryButton = root.getElementById("snapinsight-retry-short");
  if (retryButton instanceof HTMLButtonElement) {
    retryButton.addEventListener("click", callbacks.onRetryShort);
  }

  const modelSelect = root.getElementById("snapinsight-model-select");
  if (modelSelect instanceof HTMLSelectElement) {
    modelSelect.addEventListener("change", () => {
      callbacks.onModelSelectionChange(modelSelect.value);
    });
  }

  const saveModelButton = root.getElementById("snapinsight-save-model");
  if (saveModelButton instanceof HTMLButtonElement) {
    saveModelButton.addEventListener("click", callbacks.onSaveModelSelection);
  }
}
