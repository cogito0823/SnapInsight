import type { SelectionMode } from "../shared/state/request-types";
import { getUiLanguage } from "../shared/i18n";

export const PROMPT_API_MODEL_ID = "chrome-gemini-nano";

export const SNAPINSIGHT_SYSTEM_PROMPT = [
  "You are SnapInsight, a focused reading assistant.",
  "Explain only the selected concept. Use the surrounding wording only when it is provided.",
  "Respond in the Chrome UI language specified by the user prompt, regardless of the selected text's language.",
  "Keep factual uncertainty explicit and do not invent citations."
].join(" ");

export function buildExplanationPrompt(text: string, mode: SelectionMode): string {
  const responseLanguage = getUiLanguage();
  const languageInstruction =
    `Respond in the user's Chrome UI language (${responseLanguage}), regardless of the selected text's language.`;

  if (mode === "short") {
    return [
      "Explain the selected concept below.",
      languageInstruction,
      "Keep useful original-language terms when appropriate.",
      "Be concise and direct: use at most 120 Chinese characters or about 80 English words.",
      "Do not add a heading or preamble.",
      "",
      `Selected text: ${text}`
    ].join("\n");
  }

  return [
    "Explain the selected concept below in detail.",
    languageInstruction,
    "Keep useful original-language terms when appropriate.",
    "Cover its definition, background, use cases, and one short example in that order.",
    "Use concise Markdown and omit unrelated content.",
    "",
    `Selected text: ${text}`
  ].join("\n");
}
