import test from "node:test";
import assert from "node:assert/strict";

import {
  applyChunkToRequestState,
  applyCompleteToRequestState,
  applyErrorToRequestState,
  applyForwardedStartEvent,
  createErroredRequestState,
  createStartingRequestState
} from "../../src/content/state/request-state";

test("accepted short request enters starting with a fresh buffer", () => {
  const requestState = createStartingRequestState("short", "req-1");

  assert.equal(requestState.requestId, "req-1");
  assert.equal(requestState.phase, "starting");
  assert.equal(requestState.textBuffer, "");
  assert.equal(requestState.errorState, null);
});

test("forwarded start event establishes streaming state and authoritative model", () => {
  const requestState = createStartingRequestState("short", "req-1");
  const updatedState = applyForwardedStartEvent(requestState, {
    event: "start",
    requestId: "req-1",
    mode: "short",
    model: "llama3.1:8b"
  });

  assert.equal(updatedState.phase, "streaming");
  assert.equal(updatedState.model, "llama3.1:8b");
});

test("chunk and completion events preserve progressively rendered text", () => {
  const requestState = applyForwardedStartEvent(
    createStartingRequestState("short", "req-2"),
    {
      event: "start",
      requestId: "req-2",
      mode: "short",
      model: "llama3.1:8b"
    }
  );
  const afterChunk = applyChunkToRequestState(requestState, "简短解释");
  const completed = applyCompleteToRequestState(afterChunk);

  assert.equal(afterChunk.textBuffer, "简短解释");
  assert.equal(completed.phase, "completed");
  assert.equal(completed.textBuffer, "简短解释");
});

test("error state preserves partial content when streaming fails after chunks", () => {
  const requestState = applyChunkToRequestState(
    applyForwardedStartEvent(createStartingRequestState("short", "req-3"), {
      event: "start",
      requestId: "req-3",
      mode: "short",
      model: "llama3.1:8b"
    }),
    "已生成内容"
  );
  const errored = applyErrorToRequestState(requestState, {
    code: "request_failed",
    message: "Explanation generation failed.",
    retryable: true
  });

  assert.equal(errored.phase, "error");
  assert.equal(errored.textBuffer, "已生成内容");
  assert.deepEqual(errored.errorState, {
    code: "request_failed",
    message: "Explanation generation failed.",
    retryable: true
  });
});

test("startup rejection can move directly from idle-equivalent setup into error", () => {
  const errored = createErroredRequestState("short", "req-4", {
    code: "selected_model_unavailable",
    message: "A valid model must be selected before explanation can start.",
    retryable: false
  });

  assert.equal(errored.phase, "error");
  assert.equal(errored.requestId, "req-4");
  assert.equal(errored.textBuffer, "");
});
