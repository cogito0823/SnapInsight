export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function normalizeRect(rect: DOMRect | null): AnchorRect | null {
  if (!rect) {
    return null;
  }

  if (rect.width <= 0 && rect.height <= 0) {
    return null;
  }

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  };
}
