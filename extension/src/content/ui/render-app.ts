import type { ContentCardState } from "../state/card-state";
import type { AnchorRect } from "../anchor/normalize-rect";
import type { ExtensionError } from "../../shared/errors/error-codes";
import { renderMarkdownToHtml } from "./markdown";
import { getUiLanguage, t } from "../../shared/i18n";
import { cardLayoutToStyle, computeCardLayout } from "./card-layout";
import type { PromptLoadingStage } from "../prompt-api/prompt-client";

const TRIGGER_SIZE = 28;

export interface RenderCallbacks {
  onTriggerHover: () => void;
  onCloseCard: () => void;
  onRetryShort: () => void;
  onExpandDetail: () => void;
  onRetryDetail: () => void;
  onCancelShort: () => void;
  onCancelDetail: () => void;
  onCopyShort: () => void;
  onCopyDetail: () => void;
  onOpenSetup: () => void;
}

export interface TriggerViewState {
  anchorRect: AnchorRect | null;
}

export interface RequestRenderViewState {
  shortDispatchPending: boolean;
  detailDispatchPending: boolean;
  shortLoadingStage: PromptLoadingStage;
  detailLoadingStage: PromptLoadingStage;
  shortCancelAvailable: boolean;
  detailCancelAvailable: boolean;
}

function loadingMessage(stage: PromptLoadingStage): string {
  if (stage === "dispatching") return t("explanationDispatching");
  if (stage === "acquiring_session") return t("modelRuntimePreparing");
  if (stage === "waiting_response") return t("modelGenerating");
  return t("modelResponseSlow");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderResponseContent(text: string, fallback: string): string {
  const normalized = text.trim();
  if (!normalized) {
    return `<div class="snapinsight-response-text">${escapeHtml(fallback)}</div>`;
  }

  return `<div class="snapinsight-response-markdown">${renderMarkdownToHtml(
    text
  )}</div>`;
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
  return cardLayoutToStyle(
    computeCardLayout(anchorRect, {
      width: window.innerWidth,
      height: window.innerHeight
    })
  );
}

function bindPressAction(
  element: HTMLElement,
  callback: () => void
): void {
  let ignoreNextClick = false;

  element.addEventListener("mousedown", (event) => {
    event.preventDefault();
    ignoreNextClick = true;
    callback();
  });

  element.addEventListener("click", () => {
    if (ignoreNextClick) {
      ignoreNextClick = false;
      return;
    }

    callback();
  });
}

function isHTMLElement(value: unknown): value is HTMLElement {
  const ElementCtor = (
    globalThis as typeof globalThis & { HTMLElement?: typeof HTMLElement }
  ).HTMLElement;

  return typeof ElementCtor === "function" && value instanceof ElementCtor;
}

function renderTrigger(anchorRect: AnchorRect): string {
  return `
    <button
      id="snapinsight-trigger"
      type="button"
      aria-label="${t("cardOpen")}"
      style="${computeTriggerStyle(anchorRect)}"
    >
      SI
    </button>
  `;
}

function renderCard(state: ContentCardState, bodyMarkup: string): string {
  if (!state.selectionAnchorRect) {
    return "";
  }

  const selectionText = escapeHtml(state.selectedText ?? "");

  return `
    <section id="snapinsight-card" role="dialog" aria-label="${t("cardLabel")}" style="${computeCardStyle(
      state.selectionAnchorRect
    )}">
      <header class="snapinsight-card-header">
        <button id="snapinsight-close" type="button" aria-label="${t("cardClose")}">×</button>
      </header>
      <div id="snapinsight-card-selection" class="snapinsight-card-selection">${selectionText}</div>
      <div id="snapinsight-card-body" class="snapinsight-card-body">${bodyMarkup}</div>
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

function renderCancelButton(id: string): string {
  return `<button id="${id}" type="button" class="snapinsight-secondary-button snapinsight-cancel-button">${t("cancelGeneration")}</button>`;
}

function renderSectionLabel(
  text: string,
  tone: "short" | "detail"
): string {
  return `<div class="snapinsight-section-label snapinsight-section-label--${tone}">${text}</div>`;
}

function renderSectionActionButton(id: string, label: string): string {
  return `
    <button
      id="${id}"
      type="button"
      class="snapinsight-icon-button"
      aria-label="${label}"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path
          d="M16.2 6.2A6.5 6.5 0 1 0 17 12h-1.8a4.8 4.8 0 1 1-1.2-4.6L11.8 10H18V3.8l-1.8 2.4Z"
          fill="currentColor"
        />
      </svg>
    </button>
  `;
}

function renderCopyButton(id: string, label: string): string {
  return `
    <button id="${id}" type="button" class="snapinsight-icon-button" aria-label="${label}" title="${label}">
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h7A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5H13v1.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 15.5v-9A1.5 1.5 0 0 1 4.5 5H6V3.5Zm2 1.5h3.5A1.5 1.5 0 0 1 13 6.5V12h1V4H8v1Zm3 2H5v8h6V7Z" fill="currentColor"/>
      </svg>
    </button>
  `;
}

function renderActionGroup(...actions: string[]): string {
  return `<div class="snapinsight-section-actions">${actions.join("")}</div>`;
}

function renderSectionHeader(
  text: string,
  tone: "short" | "detail",
  actionMarkup: string = ""
): string {
  return `
    <div class="snapinsight-section-header">
      ${renderSectionLabel(text, tone)}
      ${actionMarkup}
    </div>
  `;
}

function describeError(error: ExtensionError): string {
  switch (error.code) {
    case "service_unavailable":
      return t("errorServiceUnavailable");
    case "prompt_api_unavailable":
      return t("errorPromptApiUnavailable");
    case "model_download_required":
      return t("errorModelDownloadRequired");
    case "model_downloading":
      return t("errorModelDownloading");
    case "device_unsupported":
      return t("errorDeviceUnsupported");
    case "language_unsupported":
      return t("errorLanguageUnsupported");
    case "quota_exceeded":
      return t("errorQuotaExceeded");
    case "readiness_timeout":
      return t("errorReadinessTimeout");
    case "model_startup_timeout":
      return t("errorModelStartupTimeout");
    case "first_token_timeout":
      return t("errorFirstTokenTimeout");
    case "stream_stalled":
      return t("errorStreamStalled");
    case "request_cancelled":
      return t("errorRequestCancelled");
    case "request_failed":
      return error.message;
    default:
      return error.message;
  }
}

function needsSetup(error: ExtensionError): boolean {
  return (
    error.code === "prompt_api_unavailable" ||
    error.code === "model_download_required" ||
    error.code === "model_downloading" ||
    error.code === "device_unsupported"
  );
}

function renderSetupButton(error: ExtensionError): string {
  return needsSetup(error)
    ? `<button id="snapinsight-open-setup" type="button" class="snapinsight-primary-button">${t("openDeviceStatus")}</button>`
    : "";
}

function renderRetryButton(error: ExtensionError): string {
  if (!error.retryable || needsSetup(error)) {
    return "";
  }

  return `
    <button id="snapinsight-retry-short" type="button" class="snapinsight-secondary-button">
      ${t("retry")}
    </button>
  `;
}

function renderDetailRetryButton(error: ExtensionError): string {
  if (!error.retryable || needsSetup(error)) {
    return "";
  }

  return `
    <button id="snapinsight-retry-detail" type="button" class="snapinsight-secondary-button">
      ${t("detailRetry")}
    </button>
  `;
}

function renderShortSection(
  state: ContentCardState,
  viewState: RequestRenderViewState
): string {
  const request = state.shortRequestState;

  if (viewState.shortDispatchPending || request.phase === "starting") {
    return `${renderLoadingState(
      loadingMessage(viewState.shortLoadingStage)
    )}${
      viewState.shortCancelAvailable
        ? renderCancelButton("snapinsight-cancel-short")
        : ""
    }`;
  }

  if (request.phase === "streaming" || request.phase === "completed") {
    return `
      <div class="snapinsight-short-section">
        ${renderSectionHeader(
          t("shortLabel"),
          "short",
          renderActionGroup(
            renderCopyButton("snapinsight-copy-short", t("shortCopy")),
            renderSectionActionButton(
              "snapinsight-regenerate-short",
              t("shortRegenerate")
            )
          )
        )}
        ${renderResponseContent(
          request.textBuffer,
          loadingMessage(viewState.shortLoadingStage)
        )}
        ${
          viewState.shortCancelAvailable
            ? renderCancelButton("snapinsight-cancel-short")
            : ""
        }
        ${
          request.phase === "streaming" && request.textBuffer.trim().length > 0
            ? `<div class="snapinsight-footnote">${t("explanationStreaming")}</div>`
            : ""
        }
      </div>
    `;
  }

  if (request.phase === "error" && request.errorState) {
    return `
      <div class="snapinsight-blocked-state">
        <div class="snapinsight-blocked-title">${t("explanationUnavailable")}</div>
        ${
          request.textBuffer
            ? renderResponseContent(request.textBuffer, "")
            : ""
        }
        <div class="snapinsight-blocked-message">
          ${escapeHtml(describeError(request.errorState))}
        </div>
        ${renderSetupButton(request.errorState)}
        ${renderRetryButton(request.errorState)}
      </div>
    `;
  }

  return renderLoadingState(t("explanationPreparing"));
}

function renderDetailAction(state: ContentCardState): string {
  const canExpand = state.shortRequestState.textBuffer.trim().length > 0;

  return `
    <button
      id="snapinsight-expand-detail"
      type="button"
      class="snapinsight-secondary-button snapinsight-detail-action"
      ${canExpand ? "" : "disabled"}
    >
      ${t("viewMore")}
    </button>
  `;
}

function renderDetailSection(
  state: ContentCardState,
  viewState: RequestRenderViewState
): string {
  if (!state.detailExpanded) {
    return renderDetailAction(state);
  }

  const request = state.detailRequestState;

  if (viewState.detailDispatchPending || request.phase === "starting") {
    return `
      <div class="snapinsight-detail-section">
        ${renderSectionHeader(t("detailLabel"), "detail")}
        ${renderLoadingState(
          loadingMessage(viewState.detailLoadingStage)
        )}
        ${
          viewState.detailCancelAvailable
            ? renderCancelButton("snapinsight-cancel-detail")
            : ""
        }
      </div>
    `;
  }

  if (request.phase === "streaming" || request.phase === "completed") {
    return `
      <div class="snapinsight-detail-section">
        ${renderSectionHeader(
          t("detailLabel"),
          "detail",
          renderActionGroup(
            renderCopyButton("snapinsight-copy-detail", t("detailCopy")),
            renderSectionActionButton(
              "snapinsight-regenerate-detail",
              t("detailRegenerate")
            )
          )
        )}
        ${renderResponseContent(
          request.textBuffer,
          loadingMessage(viewState.detailLoadingStage)
        )}
        ${
          viewState.detailCancelAvailable
            ? renderCancelButton("snapinsight-cancel-detail")
            : ""
        }
        ${
          request.phase === "streaming" && request.textBuffer.trim().length > 0
            ? `<div class="snapinsight-footnote">${t("explanationStreaming")}</div>`
            : ""
        }
      </div>
    `;
  }

  if (request.phase === "error" && request.errorState) {
    return `
      <div class="snapinsight-detail-section">
        ${renderSectionHeader(t("detailLabel"), "detail")}
        <div class="snapinsight-blocked-state">
          ${
            request.textBuffer
              ? renderResponseContent(request.textBuffer, "")
              : ""
          }
          <div class="snapinsight-blocked-message">
            ${escapeHtml(describeError(request.errorState))}
          </div>
          ${renderSetupButton(request.errorState)}
          ${renderDetailRetryButton(request.errorState)}
        </div>
      </div>
    `;
  }

  return `
    <div class="snapinsight-detail-section">
      ${renderSectionHeader(t("detailLabel"), "detail")}
      ${renderLoadingState(t("detailHint"))}
    </div>
  `;
}

function renderCardBody(
  state: ContentCardState,
  viewState: RequestRenderViewState
): string {
  return `${renderShortSection(state, viewState)}${renderDetailSection(state, viewState)}`;
}

function updateCardBodyContent(
  bodyElement: HTMLElement,
  nextMarkup: string
): void {
  const previousScrollTop = bodyElement.scrollTop;
  const previousScrollHeight = bodyElement.scrollHeight;
  const previousClientHeight = bodyElement.clientHeight;
  const wasNearBottom =
    previousScrollHeight - (previousScrollTop + previousClientHeight) <= 24;

  bodyElement.innerHTML = nextMarkup;

  if (wasNearBottom) {
    bodyElement.scrollTop = bodyElement.scrollHeight;
    return;
  }

  bodyElement.scrollTop = previousScrollTop;
}

function bindStaticButtons(root: ShadowRoot, callbacks: RenderCallbacks): void {
  const trigger = root.getElementById("snapinsight-trigger");
  if (trigger instanceof HTMLButtonElement) {
    trigger.addEventListener("mouseenter", callbacks.onTriggerHover);
    trigger.addEventListener("focus", callbacks.onTriggerHover);
  }

  const closeButton = root.getElementById("snapinsight-close");
  if (closeButton instanceof HTMLButtonElement) {
    bindPressAction(closeButton, callbacks.onCloseCard);
  }
}

function bindDynamicButtons(root: ShadowRoot, callbacks: RenderCallbacks): void {
  const cancelShortButton = root.getElementById("snapinsight-cancel-short");
  if (cancelShortButton instanceof HTMLButtonElement) {
    bindPressAction(cancelShortButton, callbacks.onCancelShort);
  }

  const cancelDetailButton = root.getElementById("snapinsight-cancel-detail");
  if (cancelDetailButton instanceof HTMLButtonElement) {
    bindPressAction(cancelDetailButton, callbacks.onCancelDetail);
  }

  const retryButton = root.getElementById("snapinsight-retry-short");
  if (retryButton instanceof HTMLButtonElement) {
    bindPressAction(retryButton, callbacks.onRetryShort);
  }

  const regenerateShortButton = root.getElementById("snapinsight-regenerate-short");
  if (regenerateShortButton instanceof HTMLButtonElement) {
    bindPressAction(regenerateShortButton, callbacks.onRetryShort);
  }

  const expandDetailButton = root.getElementById("snapinsight-expand-detail");
  if (expandDetailButton instanceof HTMLButtonElement) {
    bindPressAction(expandDetailButton, callbacks.onExpandDetail);
  }

  const retryDetailButton = root.getElementById("snapinsight-retry-detail");
  if (retryDetailButton instanceof HTMLButtonElement) {
    bindPressAction(retryDetailButton, callbacks.onRetryDetail);
  }

  const regenerateDetailButton = root.getElementById("snapinsight-regenerate-detail");
  if (regenerateDetailButton instanceof HTMLButtonElement) {
    bindPressAction(regenerateDetailButton, callbacks.onRetryDetail);
  }

  const copyShortButton = root.getElementById("snapinsight-copy-short");
  if (copyShortButton instanceof HTMLButtonElement) {
    bindPressAction(copyShortButton, callbacks.onCopyShort);
  }

  const copyDetailButton = root.getElementById("snapinsight-copy-detail");
  if (copyDetailButton instanceof HTMLButtonElement) {
    bindPressAction(copyDetailButton, callbacks.onCopyDetail);
  }

  const setupButton = root.getElementById("snapinsight-open-setup");
  if (setupButton instanceof HTMLButtonElement) {
    bindPressAction(setupButton, callbacks.onOpenSetup);
  }
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
  const cardBodyMarkup = cardAnchor ? renderCardBody(state, requestViewState) : "";

  const existingTrigger = root.getElementById("snapinsight-trigger");
  const existingCard = root.getElementById("snapinsight-card");
  const existingCardSelection = root.getElementById("snapinsight-card-selection");
  const existingCardBody = root.getElementById("snapinsight-card-body");

  const canPatchInPlace =
    (triggerAnchor ? existingTrigger instanceof HTMLButtonElement : !existingTrigger) &&
    (cardAnchor
      ? isHTMLElement(existingCard) &&
        isHTMLElement(existingCardSelection) &&
        isHTMLElement(existingCardBody)
      : !existingCard);

  if (canPatchInPlace) {
    if (triggerAnchor && existingTrigger instanceof HTMLButtonElement) {
      existingTrigger.setAttribute("style", computeTriggerStyle(triggerAnchor));
    }

    if (
      cardAnchor &&
      isHTMLElement(existingCard) &&
      isHTMLElement(existingCardSelection) &&
      isHTMLElement(existingCardBody)
    ) {
      existingCard.setAttribute("style", computeCardStyle(cardAnchor));
      existingCardSelection.innerHTML = escapeHtml(state.selectedText ?? "");
      updateCardBodyContent(existingCardBody, cardBodyMarkup);
      bindDynamicButtons(root, callbacks);
    }

    return;
  }

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

      button:focus-visible {
        outline: 3px solid rgba(37, 99, 235, 0.35);
        outline-offset: 2px;
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
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 16px;
        background: #fff;
        color: #0f172a;
        box-shadow: 0 20px 48px rgba(15, 23, 42, 0.16);
        max-height: min(720px, calc(100vh - 16px));
        padding: 12px 14px 14px;
      }

      .snapinsight-card-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 6px;
      }

      #snapinsight-close {
        border: 0;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        width: 24px;
        height: 24px;
        border-radius: 999px;
        padding: 0;
      }

      #snapinsight-close:hover {
        background: #f1f5f9;
        color: #334155;
      }

      .snapinsight-card-selection {
        border: 1px solid rgba(37, 99, 235, 0.12);
        border-radius: 12px;
        background: linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%);
        color: #1d4ed8;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
        padding: 10px 12px;
        word-break: break-word;
      }

      .snapinsight-card-body {
        color: #334155;
        flex: 1;
        font-size: 14px;
        line-height: 1.6;
        min-height: 0;
        overflow-y: auto;
        padding-right: 4px;
      }

      .snapinsight-short-section,
      .snapinsight-detail-section {
        display: grid;
        gap: 8px;
        border-radius: 14px;
        padding: 12px;
      }

      .snapinsight-short-section {
        background: rgba(239, 246, 255, 0.55);
      }

      .snapinsight-detail-section {
        margin-top: 14px;
        background: rgba(248, 250, 252, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.16);
      }

      .snapinsight-section-label {
        display: inline-flex;
        align-items: center;
        justify-self: start;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.02em;
        margin-bottom: 2px;
        padding: 4px 9px;
      }

      .snapinsight-section-label--short {
        background: rgba(37, 99, 235, 0.12);
        color: #1d4ed8;
      }

      .snapinsight-section-label--detail {
        background: rgba(124, 58, 237, 0.12);
        color: #6d28d9;
      }

      .snapinsight-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .snapinsight-section-actions {
        display: inline-flex;
        align-items: center;
        gap: 2px;
      }

      .snapinsight-response-text {
        color: #0f172a;
        font-size: 14px;
        line-height: 1.7;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .snapinsight-response-markdown {
        color: #0f172a;
        font-size: 14px;
        line-height: 1.7;
        word-break: break-word;
      }

      .snapinsight-response-markdown > :first-child {
        margin-top: 0;
      }

      .snapinsight-response-markdown > :last-child {
        margin-bottom: 0;
      }

      .snapinsight-response-markdown p,
      .snapinsight-response-markdown ul,
      .snapinsight-response-markdown ol,
      .snapinsight-response-markdown hr {
        margin: 0 0 10px;
      }

      .snapinsight-response-markdown h1,
      .snapinsight-response-markdown h2,
      .snapinsight-response-markdown h3,
      .snapinsight-response-markdown h4,
      .snapinsight-response-markdown h5,
      .snapinsight-response-markdown h6 {
        color: #0f172a;
        font-weight: 700;
        line-height: 1.4;
        margin: 12px 0 8px;
      }

      .snapinsight-response-markdown h1 {
        font-size: 18px;
      }

      .snapinsight-response-markdown h2 {
        font-size: 16px;
      }

      .snapinsight-response-markdown h3 {
        font-size: 14px;
      }

      .snapinsight-response-markdown ul,
      .snapinsight-response-markdown ol {
        padding-left: 18px;
      }

      .snapinsight-response-markdown li + li {
        margin-top: 4px;
      }

      .snapinsight-response-markdown code {
        border-radius: 6px;
        background: #f8fafc;
        color: #1e293b;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        padding: 1px 4px;
      }

      .snapinsight-response-markdown hr {
        border: 0;
        border-top: 1px solid rgba(148, 163, 184, 0.3);
      }

      .snapinsight-response-markdown a {
        color: #1d4ed8;
        text-decoration: underline;
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

      .snapinsight-model-option-list {
        display: grid;
        gap: 6px;
        max-height: 140px;
        overflow-y: auto;
      }

      .snapinsight-model-option {
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 10px;
        background: #fff;
        color: #0f172a;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        min-height: 36px;
        padding: 0 10px;
        text-align: left;
        width: 100%;
      }

      .snapinsight-model-option.is-selected {
        border-color: rgba(37, 99, 235, 0.45);
        background: #eff6ff;
        color: #1d4ed8;
      }

      .snapinsight-primary-button,
      .snapinsight-secondary-button {
        border-radius: 12px;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        min-height: 36px;
        padding: 0 14px;
      }

      .snapinsight-primary-button {
        border: 0;
        background: #2563eb;
        color: #fff;
        justify-self: start;
      }

      .snapinsight-primary-button:disabled,
      .snapinsight-secondary-button:disabled,
      .snapinsight-model-option:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .snapinsight-secondary-button {
        border: 1px solid rgba(37, 99, 235, 0.2);
        background: #eff6ff;
        color: #1d4ed8;
        justify-self: start;
      }

      .snapinsight-icon-button {
        align-items: center;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        display: inline-flex;
        flex: 0 0 auto;
        height: 28px;
        justify-content: center;
        padding: 0;
        width: 28px;
      }

      .snapinsight-icon-button:hover {
        background: rgba(148, 163, 184, 0.14);
        color: #334155;
      }

      .snapinsight-icon-button svg {
        width: 15px;
        height: 15px;
      }

      .snapinsight-detail-action {
        margin-top: 4px;
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

      @media (prefers-reduced-motion: reduce) {
        .snapinsight-loading-dot {
          animation: none;
        }
      }
    </style>
    <div id="app-shell" lang="${getUiLanguage()}">
      ${triggerAnchor ? renderTrigger(triggerAnchor) : ""}
      ${cardAnchor ? renderCard(state, cardBodyMarkup) : ""}
    </div>
  `;

  bindStaticButtons(root, callbacks);
  bindDynamicButtons(root, callbacks);
}
