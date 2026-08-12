import type { OptionsState } from "../state/options-state";

function statusContent(state: OptionsState): {
  tone: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
} {
  switch (state.phase) {
    case "ready":
      return {
        tone: "success",
        title: "设备端模型已就绪",
        message: "现在可以在普通网页中选中文字，将鼠标悬停在 SI 上获取解释。"
      };
    case "downloadable":
      return {
        tone: "info",
        title: "需要准备设备端模型",
        message: "点击下方按钮，由 Chrome 下载并准备模型。首次准备可能需要几分钟。"
      };
    case "downloading":
      return {
        tone: "info",
        title: "Chrome 正在下载模型",
        message: "保持 Chrome 打开；也可以点击继续准备以查看当前进度。"
      };
    case "preparing":
      return {
        tone: "info",
        title: "正在准备模型",
        message:
          state.progress === null
            ? "正在连接 Chrome 设备端模型…"
            : `模型下载进度：${state.progress}%`
      };
    case "unsupported":
      return {
        tone: "warning",
        title: "当前设备暂不支持",
        message:
          "请使用 Chrome 138 或更高版本，并确认设备满足 Chrome 内置 AI 的硬件、存储空间和地区要求。"
      };
    case "error":
      return {
        tone: "error",
        title: "模型准备失败",
        message: state.errorMessage ?? "暂时无法准备设备端模型，请稍后重试。"
      };
    case "checking":
    default:
      return {
        tone: "info",
        title: "正在检查设备",
        message: "正在确认 Chrome Prompt API 和设备端模型状态…"
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
  const canPrepare =
    state.phase === "downloadable" ||
    state.phase === "downloading" ||
    state.phase === "error";

  return `
    <main style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#0f172a; background:#f8fafc; min-height:100vh; padding:48px 20px; box-sizing:border-box;">
      <section style="max-width:760px; margin:0 auto;">
        <header style="margin-bottom:28px;">
          <div style="display:inline-flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:14px; background:#2563eb; color:white; font-weight:800; margin-bottom:16px;">SI</div>
          <h1 style="margin:0 0 10px; font-size:30px; letter-spacing:-0.02em;">SnapInsight</h1>
          <p style="margin:0; color:#475569; line-height:1.7; font-size:16px;">Chrome 设备端 AI 解释，网页内容无需发送到外部服务器。</p>
        </header>

        <section aria-live="polite" style="border:1px solid ${colors.border}; background:${colors.background}; color:${colors.text}; border-radius:16px; padding:20px; margin-bottom:20px;">
          <h2 style="margin:0 0 8px; font-size:18px;">${status.title}</h2>
          <p style="margin:0; line-height:1.65;">${status.message}</p>
          ${
            state.phase === "preparing" && state.progress !== null
              ? `<div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${state.progress}" style="height:8px; border-radius:999px; background:rgba(37,99,235,.14); overflow:hidden; margin-top:14px;"><div style="height:100%; width:${state.progress}%; background:#2563eb; transition:width .2s;"></div></div>`
              : ""
          }
        </section>

        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:28px;">
          ${
            canPrepare
              ? `<button id="prepare-model-button" type="button" style="border:0; border-radius:11px; padding:11px 18px; background:#2563eb; color:white; font-weight:650; cursor:pointer;">准备本地模型</button>`
              : ""
          }
          <button id="recheck-button" type="button" ${state.phase === "checking" || state.phase === "preparing" ? "disabled" : ""} style="border:1px solid #cbd5e1; border-radius:11px; padding:10px 18px; background:white; color:#0f172a; font-weight:600; cursor:pointer;">重新检查</button>
        </div>

        <section style="display:grid; gap:14px; background:white; border:1px solid #e2e8f0; border-radius:18px; padding:22px; box-shadow:0 12px 30px rgba(15,23,42,.05);">
          <h2 style="margin:0; font-size:18px;">使用说明</h2>
          <ol style="margin:0; padding-left:22px; color:#334155; line-height:1.8;">
            <li>打开任意普通网页，选中 1–20 个中文字符或英文单词。</li>
            <li>将鼠标悬停在选区附近的 SI 按钮上。</li>
            <li>阅读简短解释，或点击“查看更多”生成详细解释。</li>
          </ol>
          <div style="height:1px; background:#e2e8f0;"></div>
          <h2 style="margin:0; font-size:18px;">隐私与兼容性</h2>
          <ul style="margin:0; padding-left:22px; color:#334155; line-height:1.8;">
            <li>扩展只把你选中的文字交给 Chrome 设备端模型。</li>
            <li>扩展不申请网站主机访问权限，也不连接 SnapInsight 后端。</li>
            <li>模型由 Chrome 管理；首次下载由 Chrome 自身完成。</li>
            <li>中文生成当前属于实验性能力，质量可能因 Chrome 版本而变化。</li>
          </ul>
        </section>
      </section>
    </main>
  `;
}
