import test from "node:test";
import assert from "node:assert/strict";

import {
  cardLayoutToStyle,
  computeCardLayout
} from "../../src/content/ui/card-layout";

test("places the card below when the lower viewport has comfortable space", () => {
  const layout = computeCardLayout(
    { top: 100, left: 120, width: 80, height: 20 },
    { width: 1280, height: 800 }
  );

  assert.equal(layout.placement, "below");
  assert.equal(layout.top, 130);
  assert.equal(layout.maxHeight, 662);
  assert.equal(layout.width, 520);
});

test("flips above a low selection and keeps the full card inside the viewport", () => {
  const layout = computeCardLayout(
    { top: 700, left: 900, width: 80, height: 20 },
    { width: 1280, height: 800 }
  );

  assert.equal(layout.placement, "above");
  assert.equal(layout.bottom, 110);
  assert.equal(layout.maxHeight, 682);
  assert.equal(layout.left, 752);
  assert.match(cardLayoutToStyle(layout), /bottom:110px/);
  assert.doesNotMatch(cardLayoutToStyle(layout), /top:/);
});

test("uses the larger side when neither side has comfortable space", () => {
  const layout = computeCardLayout(
    { top: 210, left: 20, width: 20, height: 20 },
    { width: 500, height: 400 }
  );

  assert.equal(layout.placement, "above");
  assert.equal(layout.maxHeight, 192);
});

test("adapts card width to narrow viewports without horizontal overflow", () => {
  const layout = computeCardLayout(
    { top: 80, left: 340, width: 20, height: 20 },
    { width: 375, height: 700 }
  );

  assert.equal(layout.width, 359);
  assert.equal(layout.left, 8);
  assert.equal(layout.left + layout.width, 367);
});
