import test from "node:test";
import assert from "node:assert/strict";

import {
  countSelectionUnits,
  normalizeSelectionText
} from "../../src/content/selection/count-selection-units";
import { validateSelection } from "../../src/content/selection/validate-selection";

test("selection normalization trims outer whitespace and punctuation", () => {
  assert.equal(normalizeSelectionText('  “Transformer,”  '), "Transformer");
  assert.equal(normalizeSelectionText("（AI大模型）"), "AI大模型");
});

test("selection counting follows the documented representative examples", () => {
  assert.equal(countSelectionUnits("GPT-4"), 1);
  assert.equal(countSelectionUnits("RAG-based agent"), 2);
  assert.equal(countSelectionUnits("AI大模型"), 5);
});

test("selection validation accepts only 1-20 counted units", () => {
  assert.deepEqual(validateSelection(""), {
    isValid: false,
    normalizedText: "",
    unitCount: 0
  });

  assert.equal(validateSelection("Transformer").isValid, true);
  assert.equal(
    validateSelection("one two three four five six seven eight nine ten eleven").isValid,
    true
  );
  assert.equal(
    validateSelection(
      "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone"
    ).isValid,
    false
  );
});
