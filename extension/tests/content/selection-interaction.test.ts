import test from "node:test";
import assert from "node:assert/strict";

import { createInitialContentCardState } from "../../src/content/state/card-state";
import {
  acceptLiveSelectionForOpen,
  applyLiveSelectionUpdate,
  type PendingSelectionSnapshot
} from "../../src/content/state/selection-interaction";

const anchorRect = {
  top: 10,
  left: 20,
  width: 30,
  height: 12
};

const liveSelection: PendingSelectionSnapshot = {
  selectedText: "Transformer",
  anchorRect
};

test("valid live selection shows trigger and keeps snapshot pending only", () => {
  const initialState = createInitialContentCardState("doc-first");
  const result = applyLiveSelectionUpdate(initialState, null, liveSelection);

  assert.equal(result.state.cardPhase, "triggerVisible");
  assert.equal(result.state.selectedText, null);
  assert.equal(result.state.selectionAnchorRect, null);
  assert.deepEqual(result.pendingSelection, liveSelection);
});

test("hover-open accepts the current live selection as the card snapshot", () => {
  const initialState = createInitialContentCardState("doc-first");
  const triggerResult = applyLiveSelectionUpdate(initialState, null, liveSelection);
  const openResult = acceptLiveSelectionForOpen(
    triggerResult.state,
    triggerResult.pendingSelection
  );

  assert.equal(openResult.state.cardPhase, "open");
  assert.equal(openResult.state.selectedText, "Transformer");
  assert.deepEqual(openResult.state.selectionAnchorRect, anchorRect);
  assert.equal(openResult.pendingSelection, null);
});

test("native highlight loss alone does not reset an already open card", () => {
  const initialState = createInitialContentCardState("doc-first");
  const triggerResult = applyLiveSelectionUpdate(initialState, null, liveSelection);
  const openResult = acceptLiveSelectionForOpen(
    triggerResult.state,
    triggerResult.pendingSelection
  );
  const afterLoss = applyLiveSelectionUpdate(openResult.state, null, null);

  assert.equal(afterLoss.state.cardPhase, "open");
  assert.equal(afterLoss.state.selectedText, "Transformer");
  assert.equal(afterLoss.pendingSelection, null);
});

test("the same still-valid live selection does not replace an already open card", () => {
  const initialState = createInitialContentCardState("doc-first");
  const triggerResult = applyLiveSelectionUpdate(initialState, null, liveSelection);
  const openResult = acceptLiveSelectionForOpen(
    triggerResult.state,
    triggerResult.pendingSelection
  );
  const afterRepeatedSelection = applyLiveSelectionUpdate(
    openResult.state,
    null,
    liveSelection
  );

  assert.equal(afterRepeatedSelection.state.cardPhase, "open");
  assert.equal(afterRepeatedSelection.state.selectedText, "Transformer");
  assert.deepEqual(afterRepeatedSelection.state.selectionAnchorRect, anchorRect);
  assert.equal(afterRepeatedSelection.pendingSelection, null);
});

test("new valid selection replaces the old card interaction with a new trigger", () => {
  const initialState = createInitialContentCardState("doc-first");
  const triggerResult = applyLiveSelectionUpdate(initialState, null, liveSelection);
  const openResult = acceptLiveSelectionForOpen(
    triggerResult.state,
    triggerResult.pendingSelection
  );
  const replacement = applyLiveSelectionUpdate(openResult.state, null, {
    selectedText: "AI大模型",
    anchorRect: {
      top: 40,
      left: 60,
      width: 50,
      height: 18
    }
  });

  assert.equal(replacement.state.cardPhase, "triggerVisible");
  assert.equal(replacement.state.selectedText, null);
  assert.equal(replacement.state.selectionAnchorRect, null);
  assert.equal(replacement.state.shortRequestState.phase, "idle");
  assert.deepEqual(replacement.pendingSelection?.selectedText, "AI大模型");
});

test("invalid live selection hides the trigger when no card is open", () => {
  const initialState = createInitialContentCardState("doc-first");
  const triggerResult = applyLiveSelectionUpdate(initialState, null, liveSelection);
  const hiddenResult = applyLiveSelectionUpdate(
    triggerResult.state,
    triggerResult.pendingSelection,
    null
  );

  assert.equal(hiddenResult.state.cardPhase, "hidden");
  assert.equal(hiddenResult.pendingSelection, null);
});
