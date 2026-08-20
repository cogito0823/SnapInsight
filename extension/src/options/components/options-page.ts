import type { OptionsState } from "../state/options-state";
import { getUiLanguage, t } from "../../shared/i18n";

function statusContent(state: OptionsState): {
  tone: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  hint?: string;
} {
  switch (state.phase) {
    case "ready":
      return {
        tone: "success",
        title: t("statusReadyTitle"),
        message: t("statusReadyMessage")
      };
    case "downloadable":
      return {
        tone: "info",
        title: t("statusDownloadableTitle"),
        message: t("statusDownloadableMessage")
      };
    case "downloading":
      return {
        tone: "info",
        title: t("statusDownloadingTitle"),
        message: t("statusDownloadingMessage")
      };
    case "preparing":
      if (state.progressStage === "installing") {
        return {
          tone: "info",
          title: t("statusInstallingTitle"),
          message: t("statusInstallingMessage")
        };
      }
      return {
        tone: "info",
        title: t("statusPreparingTitle"),
        message:
          state.progress === null
            ? t("statusPreparingConnecting")
            : state.progressScope === "remaining"
              ? t("statusRemainingProgress", state.progress)
              : t("statusPreparingProgress", state.progress),
        hint:
          state.progress !== null && state.progressScope === "remaining"
            ? t("statusRemainingProgressHint")
            : undefined
      };
    case "unsupported":
      return {
        tone: "warning",
        title: t("statusUnsupportedTitle"),
        message: t("statusUnsupportedMessage")
      };
    case "error":
      return {
        tone: "error",
        title: t("statusErrorTitle"),
        message: state.errorMessage ?? t("statusErrorMessage")
      };
    case "checking":
    default:
      return {
        tone: "info",
        title: t("statusCheckingTitle"),
        message: t("statusCheckingMessage")
      };
  }
}

export function renderOptionsPage(state: OptionsState): string {
  const status = statusContent(state);
  const colors = {
    success: { background: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
    info: { background: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
    warning: { background: "#fffbeb", border: "#fde68a", text: "#92400e" },
    error: { background: "#fef2f2", border: "#fecaca", text: "#991b1b" }
  }[status.tone];
  const canStartOrMonitor =
    state.phase === "downloadable" ||
    state.phase === "downloading" ||
    state.phase === "error";
  const preparingProgress =
    state.phase === "preparing" || state.phase === "downloading"
      ? state.progress === null
        ? `<div role="progressbar" aria-label="${t("statusPreparingTitle")}" aria-valuetext="${t("progressUnknown")}" data-indeterminate="true" style="height:8px; border-radius:999px; background:rgba(37,99,235,.14); overflow:hidden; margin-top:14px;"><div style="height:100%; width:35%; background:#2563eb; border-radius:999px; animation:snapinsight-progress-indeterminate 1.2s ease-in-out infinite;"></div></div>`
        : `<div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${state.progress}" style="height:8px; border-radius:999px; background:rgba(37,99,235,.14); overflow:hidden; margin-top:14px;"><div style="height:100%; width:${state.progress}%; background:#2563eb; transition:width .2s;"></div></div>`
      : "";

  return `
    <main lang="${getUiLanguage()}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#0f172a; background:#f8fafc; min-height:100vh; padding:48px 20px; box-sizing:border-box;">
      <style>
        @keyframes snapinsight-progress-indeterminate {
          from { transform: translateX(-110%); }
          to { transform: translateX(310%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-indeterminate="true"] {
            background:repeating-linear-gradient(135deg, rgba(37,99,235,.12) 0 8px, rgba(37,99,235,.28) 8px 16px) !important;
          }
          [data-indeterminate="true"] > div { display:none; }
        }
      </style>
      <section style="max-width:760px; margin:0 auto;">
        <header style="margin-bottom:28px;">
          <div style="display:inline-flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:14px; background:#2563eb; color:white; font-weight:800; margin-bottom:16px;">SI</div>
          <h1 style="margin:0 0 10px; font-size:30px; letter-spacing:-0.02em;">SnapInsight</h1>
          <p style="margin:0; color:#475569; line-height:1.7; font-size:16px;">${t("optionsTagline")}</p>
        </header>

        <section aria-live="polite" style="border:1px solid ${colors.border}; background:${colors.background}; color:${colors.text}; border-radius:16px; padding:20px; margin-bottom:20px;">
          <h2 style="margin:0 0 8px; font-size:18px;">${status.title}</h2>
          ${state.phase === "preparing" || state.phase === "downloading" ? `<p id="model-elapsed-time" style="margin:0 0 18px; color:#64748b; font-size:13px; line-height:1.55;">${t("preparationElapsed", "00:00")}</p>` : ""}
          <p style="margin:0; line-height:1.65;">${status.message}</p>
          ${preparingProgress}
          ${status.hint ? `<p style="margin:8px 0 0; color:#64748b; font-size:13px; line-height:1.55;">${status.hint}</p>` : ""}
        </section>

        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:28px;">
          ${
            canStartOrMonitor
              ? `<button id="prepare-model-button" type="button" style="border:0; border-radius:11px; padding:11px 18px; background:#2563eb; color:white; font-weight:650; cursor:pointer;">${state.phase === "error" ? t("retrySetup") : state.phase === "downloading" ? t("showLiveProgress") : t("prepareModel")}</button>`
              : ""
          }
        </div>

        <section style="display:grid; gap:14px; background:white; border:1px solid #e2e8f0; border-radius:18px; padding:22px; box-shadow:0 12px 30px rgba(15,23,42,.05);">
          <h2 style="margin:0; font-size:18px;">${t("usageTitle")}</h2>
          <ol style="margin:0; padding-left:22px; color:#334155; line-height:1.8;">
            <li>${t("usageStep1")}</li>
            <li>${t("usageStep2")}</li>
            <li>${t("usageStep3")}</li>
          </ol>
          <div style="height:1px; background:#e2e8f0;"></div>
          <h2 style="margin:0; font-size:18px;">${t("privacyTitle")}</h2>
          <ul style="margin:0; padding-left:22px; color:#334155; line-height:1.8;">
            <li>${t("privacyItem1")}</li>
            <li>${t("privacyItem2")}</li>
            <li>${t("privacyItem3")}</li>
            <li>${t("privacyItem4")}</li>
          </ul>
        </section>
      </section>
    </main>
  `;
}
