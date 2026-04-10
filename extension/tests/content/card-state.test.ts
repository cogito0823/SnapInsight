import test from "node:test";
import assert from "node:assert/strict";

import {
  acceptSelectionSnapshot,
  createInitialContentCardState,
  resetCardInteraction,
  showTriggerForSelection,
  updatePageInstance
} from "../../src/content/state/card-state";

const anchorRect = {
  top: 10,
  left: 20,
  width: 30,
  height: 12
};

test("trigger-visible state does not store the accepted selection snapshot yet", () => {
  const initialState = createInitialContentCardState("doc-first");
  const triggerState = showTriggerForSelection(initialState);

  assert.equal(triggerState.cardPhase, "triggerVisible");
  assert.equal(triggerState.selectedText, null);
  assert.equal(triggerState.selectionAnchorRect, null);
});

test("opening a card captures the accepted selection snapshot", () => {
  const initialState = createInitialContentCardState("doc-first");
  const openState = acceptSelectionSnapshot(
    showTriggerForSelection(initialState),
    "Transformer",
    anchorRect
  );

  assert.equal(openState.cardPhase, "open");
  assert.equal(openState.selectedText, "Transformer");
  assert.deepEqual(openState.selectionAnchorRect, anchorRect);
});

test("reset clears the accepted interaction fields and request state", () => {
  const initialState = createInitialContentCardState("doc-first");
  const openState = acceptSelectionSnapshot(
    showTriggerForSelection(initialState),
    "AI大模型",
    anchorRect
  );
  const resetState = resetCardInteraction(openState);

  assert.equal(resetState.cardPhase, "hidden");
  assert.equal(resetState.selectedText, null);
  assert.equal(resetState.selectionAnchorRect, null);
  assert.equal(resetState.activeModel, null);
  assert.equal(resetState.shortRequestState.phase, "idle");
  assert.equal(resetState.detailRequestState.phase, "idle");
});

test("document-instance update rotates pageInstanceId and resets interaction", () => {
  const initialState = createInitialContentCardState("doc-first");
  const openState = acceptSelectionSnapshot(
    showTriggerForSelection(initialState),
    "Transformer",
    anchorRect
  );
  const updatedState = updatePageInstance(openState, "doc-second");

  assert.equal(updatedState.senderContext.pageInstanceId, "doc-second");
  assert.equal(updatedState.cardPhase, "hidden");
  assert.equal(updatedState.selectedText, null);
});
