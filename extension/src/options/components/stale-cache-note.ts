import type { ModelSummary } from "../../shared/models/model-summary";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderStaleCacheNote(
  models: ModelSummary[],
  lastModelRefreshAt: string | null
): string {
  if (models.length === 0 && !lastModelRefreshAt) {
    return "";
  }

  const timeText = lastModelRefreshAt
    ? new Date(lastModelRefreshAt).toLocaleString("zh-CN")
    : "未知";

  return `
    <section style="border:1px dashed #cbd5e1; border-radius:12px; padding:14px; background:#f8fafc;">
      <h3 style="margin:0 0 8px; font-size:14px;">缓存诊断信息</h3>
      <p style="margin:0 0 8px; color:#475569; line-height:1.6;">
        Live 模型加载失败，下面仅展示上次成功刷新时的缓存信息，不能用于当前保存校验。
      </p>
      <p style="margin:0 0 8px; color:#334155;">上次成功刷新时间：${escapeHtml(timeText)}</p>
      ${
        models.length > 0
          ? `<ul style="margin:0; padding-left:18px; color:#334155;">
              ${models
                .map(
                  (model) =>
                    `<li>${escapeHtml(model.label)} <span style="color:#64748b;">(${escapeHtml(
                      model.id
                    )})</span></li>`
                )
                .join("")}
            </ul>`
          : '<p style="margin:0; color:#64748b;">没有可显示的缓存模型。</p>'
      }
    </section>
  `;
}
