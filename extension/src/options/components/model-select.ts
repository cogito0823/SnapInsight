import type { ModelSummary } from "../../shared/models/model-summary";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderModelSelect(
  models: ModelSummary[],
  selectedModelDraft: string | null,
  disabled: boolean
): string {
  const selectedValue = selectedModelDraft ?? "";

  return `
    <label style="display:flex; flex-direction:column; gap:8px; font-size:14px; color:#0f172a;">
      <span>当前模型</span>
      <select id="model-select" ${
        disabled ? "disabled" : ""
      } style="padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; background:white; font-size:14px;">
        <option value="">请选择一个模型</option>
        ${models
          .map((model) => {
            const selected = model.id === selectedValue ? "selected" : "";
            return `<option value="${escapeHtml(model.id)}" ${selected}>${escapeHtml(
              model.label
            )}</option>`;
          })
          .join("")}
      </select>
    </label>
  `;
}
