import type { ContentCardState } from "../state/card-state";
import type { AnchorRect } from "../anchor/normalize-rect";

const TRIGGER_SIZE = 28;
const CARD_WIDTH = 320;
const CARD_GAP = 10;

export interface RenderCallbacks {
  onTriggerHover: () => void;
  onCloseCard: () => void;
}

export interface TriggerViewState {
  anchorRect: AnchorRect | null;
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
      <div class="snapinsight-card-body">
        简短解释与流式内容会在下一批次接入；本批次先完成选区快照、触发器和卡片壳。
      </div>
    </section>
  `;
}

export function renderContentApp(
  root: ShadowRoot,
  state: ContentCardState,
  triggerViewState: TriggerViewState,
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
    </style>
    <div id="app-shell">
      ${triggerAnchor ? renderTrigger(triggerAnchor) : ""}
      ${cardAnchor ? renderCard(state) : ""}
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
}
