import type { ExtensionError } from "../../shared/errors/error-codes";

export type BannerTone = "info" | "error" | "success" | "warning";

function toneColors(tone: BannerTone): {
  background: string;
  border: string;
  text: string;
} {
  switch (tone) {
    case "error":
      return {
        background: "#fff1f2",
        border: "#fecdd3",
        text: "#9f1239"
      };
    case "success":
      return {
        background: "#ecfdf5",
        border: "#bbf7d0",
        text: "#166534"
      };
    case "warning":
      return {
        background: "#fffbeb",
        border: "#fde68a",
        text: "#92400e"
      };
    default:
      return {
        background: "#eff6ff",
        border: "#bfdbfe",
        text: "#1d4ed8"
      };
  }
}

export function renderStatusBanner(
  message: string | null,
  tone: BannerTone
): string {
  if (!message) {
    return "";
  }

  const colors = toneColors(tone);

  return `
    <div style="border:1px solid ${colors.border}; background:${colors.background}; color:${colors.text}; border-radius:10px; padding:12px 14px; line-height:1.5;">
      ${message}
    </div>
  `;
}

export function errorMessageForOptions(error: ExtensionError): string {
  switch (error.code) {
    case "service_unavailable":
      return "本地服务暂时无法连接，请确认本机服务已经启动。";
    case "local_service_conflict":
      return "本地固定端口已被其他服务占用，请先排查端口冲突。";
    case "selected_model_unavailable":
      return "当前模型已不可用，请重新选择一个可用模型。";
    case "no_models_available":
      return "当前没有可用模型，请先在 Ollama 中安装或配置模型。";
    case "request_failed":
      return error.message;
    default:
      return error.message;
  }
}
