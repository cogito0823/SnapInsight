import test from "node:test";
import assert from "node:assert/strict";

import { isModelPickerVisible, shouldIgnoreCardClickAway } from "../../src/content/ui/click-away";

test("click-away ignores events inside the shadow host", () => {
  const host = {};
  const event = {
    composedPath: () => [host]
  } as unknown as MouseEvent;
  const root = {
    activeElement: null
  } as unknown as ShadowRoot;

  assert.equal(
    shouldIgnoreCardClickAway(event, host as HTMLElement, root, false),
    true
  );
});

test("click-away ignores outside events while a model select is active", () => {
  const event = {
    composedPath: () => []
  } as unknown as MouseEvent;
  const root = {
    activeElement: null,
    getElementById: () => ({})
  } as unknown as ShadowRoot;

  assert.equal(
    shouldIgnoreCardClickAway(event, {} as HTMLElement, root, false),
    true
  );
});

test("click-away closes for outside events when no model select is active", () => {
  const event = {
    composedPath: () => []
  } as unknown as MouseEvent;
  const root = {
    activeElement: null
  } as unknown as ShadowRoot;

  assert.equal(
    shouldIgnoreCardClickAway(event, {} as HTMLElement, root, false),
    false
  );
});

test("click-away ignores outside events during model picker interaction", () => {
  const event = {
    composedPath: () => []
  } as unknown as MouseEvent;
  const root = {
    activeElement: null
  } as unknown as ShadowRoot;

  assert.equal(
    shouldIgnoreCardClickAway(event, {} as HTMLElement, root, true),
    true
  );
});

test("model picker visibility is detected from the shadow root", () => {
  const root = {
    getElementById: () => ({})
  } as unknown as ShadowRoot;

  assert.equal(isModelPickerVisible(root), true);
});
