import type { AnchorRect } from "../anchor/normalize-rect";

const VIEWPORT_MARGIN = 8;
const CARD_GAP = 10;
const CARD_MAX_HEIGHT = 720;
const CARD_MIN_COMFORTABLE_HEIGHT = 240;
const CARD_MIN_WIDTH = 400;
const CARD_MAX_WIDTH = 520;
const CARD_VIEWPORT_WIDTH_RATIO = 0.42;

export interface ViewportSize {
  width: number;
  height: number;
}

export interface CardLayout {
  placement: "above" | "below";
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeCardLayout(
  anchorRect: AnchorRect,
  viewport: ViewportSize
): CardLayout {
  const viewportWidth = Math.max(0, viewport.width);
  const viewportHeight = Math.max(0, viewport.height);
  const availableWidth = Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2);
  const responsiveWidth = clamp(
    viewportWidth * CARD_VIEWPORT_WIDTH_RATIO,
    CARD_MIN_WIDTH,
    CARD_MAX_WIDTH
  );
  const width = Math.min(responsiveWidth, availableWidth);
  const left = clamp(
    anchorRect.left,
    VIEWPORT_MARGIN,
    Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN)
  );

  const anchorBottom = anchorRect.top + anchorRect.height;
  const availableBelow = Math.max(
    0,
    viewportHeight - anchorBottom - CARD_GAP - VIEWPORT_MARGIN
  );
  const availableAbove = Math.max(
    0,
    anchorRect.top - CARD_GAP - VIEWPORT_MARGIN
  );
  const placement =
    availableBelow >= CARD_MIN_COMFORTABLE_HEIGHT || availableBelow >= availableAbove
      ? "below"
      : "above";
  const maxHeight = Math.min(
    CARD_MAX_HEIGHT,
    placement === "below" ? availableBelow : availableAbove
  );

  if (placement === "below") {
    return {
      placement,
      top: anchorBottom + CARD_GAP,
      left,
      width,
      maxHeight
    };
  }

  return {
    placement,
    bottom: viewportHeight - anchorRect.top + CARD_GAP,
    left,
    width,
    maxHeight
  };
}

export function cardLayoutToStyle(layout: CardLayout): string {
  const verticalPosition =
    layout.placement === "below"
      ? `top:${layout.top}px;`
      : `bottom:${layout.bottom}px;`;

  return `${verticalPosition}left:${layout.left}px;width:${layout.width}px;max-height:${layout.maxHeight}px;`;
}
