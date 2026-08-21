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
      idleAgeBucket: "4m_to_10m",
      outcome: "success"
    });
    assert.deepEqual(events, [
      {
        phase: "first_token",
        durationMs: 12.3,
        path: "warm",
        mode: "short",
        idleAgeBucket: "4m_to_10m",
        outcome: "success"
      }
    ]);
    assert.deepEqual(Object.keys(events[0]).sort(), [
      "durationMs",
      "idleAgeBucket",
      "mode",
      "outcome",
      "path",
      "phase"
    ]);
  } finally {
    setPromptPerformanceSink(null);
  }
});

test("debug performance output is a single machine-readable JSON payload", () => {
  const debugGlobal = globalThis as typeof globalThis & {
    __snapinsightPromptPerformanceDebug__?: boolean;
  };
  const previousFlag = debugGlobal.__snapinsightPromptPerformanceDebug__;
  const previousDebug = console.debug;
  const calls: unknown[][] = [];
  console.debug = (...args: unknown[]) => calls.push(args);
  debugGlobal.__snapinsightPromptPerformanceDebug__ = true;
  setPromptPerformanceSink(null);

  try {
    emitPromptPerformance({
      phase: "visible_wait",
      durationMs: 5001.27,
      path: "warm",
      mode: "detailed",
      idleAgeBucket: "1m_to_4m",
      outcome: "success"
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "[SnapInsight prompt performance]");
    assert.equal(typeof calls[0][1], "string");
    assert.deepEqual(JSON.parse(calls[0][1] as string), {
      phase: "visible_wait",
      durationMs: 5001.3,
      path: "warm",
      mode: "detailed",
      idleAgeBucket: "1m_to_4m",
      outcome: "success"
    });
  } finally {
    console.debug = previousDebug;
    if (previousFlag === undefined) {
      delete debugGlobal.__snapinsightPromptPerformanceDebug__;
    } else {
      debugGlobal.__snapinsightPromptPerformanceDebug__ = previousFlag;
    }
    setPromptPerformanceSink(null);
  }
});
