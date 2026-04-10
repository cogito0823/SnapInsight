import type { ReadSelectionResult } from "../selection/read-selection";
import { normalizeRect, type AnchorRect } from "./normalize-rect";
import { computeTextareaAnchor } from "./textarea-anchor";

function rectFromRange(range: Range): DOMRect | null {
  const directRect = range.getBoundingClientRect();

  if (directRect.width > 0 || directRect.height > 0) {
    return directRect;
  }

  const firstClientRect = range.getClientRects().item(0);
  return firstClientRect ?? null;
}

export function computeAnchor(
  selection: ReadSelectionResult
): AnchorRect | null {
  if (selection.source === "page" && selection.range) {
    return normalizeRect(rectFromRange(selection.range));
  }

  if (selection.element) {
    return computeTextareaAnchor(selection.element);
  }

  return null;
}
