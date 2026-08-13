import test from "node:test";
import assert from "node:assert/strict";

import {
  emitPromptPerformance,
  setPromptPerformanceSink,
  type PromptPerformanceEvent
} from "../../src/content/prompt-api/prompt-performance";

test("performance events expose timing metadata without content-bearing fields", () => {
  const events: PromptPerformanceEvent[] = [];
  setPromptPerformanceSink((event) => events.push(event));
  try {
    emitPromptPerformance({
      phase: "first_token",
      durationMs: 12.345,
      path: "warm",
      mode: "short",
      outcome: "success"
    });
    assert.deepEqual(events, [
      {
        phase: "first_token",
        durationMs: 12.3,
        path: "warm",
        mode: "short",
        outcome: "success"
      }
    ]);
    assert.deepEqual(Object.keys(events[0]).sort(), [
      "durationMs",
      "mode",
      "outcome",
      "path",
      "phase"
    ]);
  } finally {
    setPromptPerformanceSink(null);
  }
});
