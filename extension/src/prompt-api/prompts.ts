import type { SelectionMode } from "../shared/state/request-types";

export const PROMPT_API_MODEL_ID = "chrome-gemini-nano";

export const SNAPINSIGHT_SYSTEM_PROMPT = [
  "You are SnapInsight, a focused reading assistant.",
  "Explain only the selected concept. Use the surrounding wording only when it is provided.",
  "Prefer clear Chinese output when the selected text or request is Chinese.",
  "Keep factual uncertainty explicit and do not invent citations."
].join(" ");

export function buildExplanationPrompt(text: string, mode: SelectionMode): string {
  if (mode === "short") {
    return [
      "请解释下面选中的概念。优先使用中文，必要时保留原文术语。",
      "保持简洁直观，尽量控制在 120 个汉字以内。",
      "不要添加标题或开场白。",
      "",
      `选中文本：${text}`
    ].join("\n");
  }

  return [
    "请详细解释下面选中的概念。优先使用中文，必要时保留原文术语。",
    "依次覆盖定义、背景、使用场景和一个简短示例。",
    "使用简洁的 Markdown，但不要添加与解释无关的内容。",
    "",
    `选中文本：${text}`
  ].join("\n");
}
