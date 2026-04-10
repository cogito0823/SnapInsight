import { normalizeRect, type AnchorRect } from "./normalize-rect";

export function computeTextareaAnchor(
  element: HTMLInputElement | HTMLTextAreaElement
): AnchorRect | null {
  return normalizeRect(element.getBoundingClientRect());
}
