import test from "node:test";
import assert from "node:assert/strict";

import { registerActiveStream } from "../../src/worker/bridge/active-stream-registry";
import { handleExplanationsCancel } from "../../src/worker/handlers/explanations-cancel";
import { handleExplanationsStart } from "../../src/worker/handlers/explanations-start";
import { installMockChrome } from "../helpers/mock-chrome";

function installFetchMock(
  implementation: (input: string, init?: RequestInit) => Promise<Response>
): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) =>
    implementation(String(input), init)) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

function readHeader(init: RequestInit | undefined, name: string): string | null {
  const headers = new Headers(init?.headers);
  return headers.get(name);
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}

function installImmediateTimeouts(): () => void {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  globalThis.setTimeout = (((handler: TimerHandler) => {
    if (typeof handler === "function") {
      handler();
    }

    return 1 as unknown as ReturnType<typeof setTimeout>;
  }) as unknown) as typeof globalThis.setTimeout;

  globalThis.clearTimeout = (((_timeoutId?: ReturnType<typeof setTimeout>) => {
    return undefined;
  }) as unknown) as typeof globalThis.clearTimeout;

  return () => {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  };
}

test("accepted explanation startup forwards streamed events to the content script", async () => {
  const chromeEnv = installMockChrome({
    initialStorage: {
      "settings.selectedModel": "llama3.1:8b"
    }
  });
  const trustHeaders: string[] = [];
  const restoreFetch = installFetchMock(async (input, init) => {
    const trustHeader = readHeader(init, "X-SnapInsight-Extension-Id");
    if (trustHeader) {
      trustHeaders.push(trustHeader);
    }

    if (input.endsWith("/health")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "snapinsight-local-api",
          version: "v1",
          ollamaReachable: true
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    if (input.endsWith("/v1/models")) {
      return new Response(
        JSON.stringify({
          state: "ready",
          models: [
            {
              id: "llama3.1:8b",
              label: "llama3.1:8b",
              provider: "ollama",
              available: true
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    if (input.endsWith("/v1/explanations/stream")) {
      return new Response(
        [
          JSON.stringify({
            event: "start",
            requestId: "req-1",
            mode: "short",
            model: "llama3.1:8b"
          }),
          JSON.stringify({
            event: "chunk",
            requestId: "req-1",
            delta: "简短"
          }),
          JSON.stringify({
            event: "complete",
            requestId: "req-1"
          })
        ].join("\n") + "\n",
        {
          status: 200,
          headers: {
            "content-type": "application/x-ndjson"
          }
        }
      );
    }

    throw new Error(`Unexpected fetch input: ${input}`);
  });

  try {
    const response = await handleExplanationsStart(
      {
        type: "explanations.start",
        payload: {
          requestId: "req-1",
          senderContext: {
            tabId: -1,
            frameId: 0,
            pageInstanceId: "doc-1"
          },
          text: "Transformer",
          mode: "short"
        }
      },
      {
        tab: {
          id: 321
        } as chrome.tabs.Tab,
        frameId: 0
      }
    );

    assert.deepEqual(response, {
      ok: true,
      data: {
        requestId: "req-1"
      }
    });

    await flushMicrotasks();

    assert.equal(chromeEnv.tabMessages.length, 3);
    assert.deepEqual(
      chromeEnv.tabMessages.map((entry) => ({
        tabId: entry.tabId,
        frameId: entry.options?.frameId,
        event:
          typeof entry.message === "object" &&
          entry.message !== null &&
          "payload" in entry.message &&
          typeof entry.message.payload === "object" &&
          entry.message.payload !== null &&
          "event" in entry.message.payload &&
          typeof entry.message.payload.event === "object" &&
          entry.message.payload.event !== null &&
          "event" in entry.message.payload.event
            ? entry.message.payload.event.event
            : null
      })),
      [
        {
          tabId: 321,
          frameId: 0,
          event: "start"
        },
        {
          tabId: 321,
          frameId: 0,
          event: "chunk"
        },
        {
          tabId: 321,
          frameId: 0,
          event: "complete"
        }
      ]
    );
    assert.deepEqual(trustHeaders, [
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    ]);
  } finally {
    restoreFetch();
    chromeEnv.restore();
  }
});

test("bridge loss is surfaced as retryable request_failed", async () => {
  let sendAttempts = 0;
  const chromeEnv = installMockChrome({
    initialStorage: {
      "settings.selectedModel": "llama3.1:8b"
    },
    tabsSendMessage: async () => {
      sendAttempts += 1;
      if (sendAttempts === 1) {
        throw new Error("Bridge lost.");
      }

      return undefined;
    }
  });
  const restoreFetch = installFetchMock(async (input) => {
    if (input.endsWith("/health")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "snapinsight-local-api",
          version: "v1",
          ollamaReachable: true
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    if (input.endsWith("/v1/models")) {
      return new Response(
        JSON.stringify({
          state: "ready",
          models: [
            {
              id: "llama3.1:8b",
              label: "llama3.1:8b",
              provider: "ollama",
              available: true
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    if (input.endsWith("/v1/explanations/stream")) {
      return new Response(
        [
          JSON.stringify({
            event: "start",
            requestId: "req-bridge",
            mode: "short",
            model: "llama3.1:8b"
          }),
          JSON.stringify({
            event: "complete",
            requestId: "req-bridge"
          })
        ].join("\n") + "\n",
        {
          status: 200,
          headers: {
            "content-type": "application/x-ndjson"
          }
        }
      );
    }

    throw new Error(`Unexpected fetch input: ${input}`);
  });

  try {
    const response = await handleExplanationsStart(
      {
        type: "explanations.start",
        payload: {
          requestId: "req-bridge",
          senderContext: {
            tabId: -1,
            frameId: 0,
            pageInstanceId: "doc-bridge"
          },
          text: "Transformer",
          mode: "short"
        }
      },
      {
        tab: {
          id: 321
        } as chrome.tabs.Tab,
        frameId: 0
      }
    );

    assert.equal(response.ok, true);

    await flushMicrotasks();

    assert.deepEqual(
      chromeEnv.tabMessages.map((entry) => {
        const payloadEvent =
          typeof entry.message === "object" &&
          entry.message !== null &&
          "payload" in entry.message &&
          typeof entry.message.payload === "object" &&
          entry.message.payload !== null &&
          "event" in entry.message.payload &&
          typeof entry.message.payload.event === "object" &&
          entry.message.payload.event !== null &&
          "event" in entry.message.payload.event
            ? (entry.message.payload.event as Record<string, unknown>)
            : null;
        const eventName =
          payloadEvent && typeof payloadEvent.event === "string"
            ? payloadEvent.event
            : null;
        const errorCode =
          eventName === "error" &&
          payloadEvent !== null &&
          "error" in payloadEvent &&
          typeof payloadEvent.error === "object" &&
          payloadEvent.error !== null &&
          "code" in payloadEvent.error &&
          typeof payloadEvent.error.code === "string"
            ? payloadEvent.error.code
            : null;

        return {
          event: eventName,
          errorCode
        };
      }),
      [
        {
          event: "start",
          errorCode: null
        },
        {
          event: "error",
          errorCode: "request_failed"
        }
      ]
    );
  } finally {
    restoreFetch();
    chromeEnv.restore();
  }
});

test("startup fails with selected_model_unavailable when no usable model exists", async () => {
  const chromeEnv = installMockChrome();

  try {
    const response = await handleExplanationsStart(
      {
        type: "explanations.start",
        payload: {
          requestId: "req-2",
          senderContext: {
            tabId: -1,
            frameId: 0,
            pageInstanceId: "doc-2"
          },
          text: "Transformer",
          mode: "short"
        }
      },
      {
        tab: {
          id: 321
        } as chrome.tabs.Tab,
        frameId: 0
      }
    );

    assert.equal(response.ok, false);
    if (response.ok) {
      throw new Error("Expected missing selected model to fail.");
    }

    assert.deepEqual(response.error, {
      code: "selected_model_unavailable",
      message: "A valid model must be selected before explanation can start.",
      retryable: false
    });
    assert.equal(chromeEnv.tabMessages.length, 0);
  } finally {
    chromeEnv.restore();
  }
});

test("worker timeout is surfaced as retryable request_failed", async () => {
  const chromeEnv = installMockChrome({
    initialStorage: {
      "settings.selectedModel": "llama3.1:8b"
    }
  });
  const restoreTimeouts = installImmediateTimeouts();
  const restoreFetch = installFetchMock(async (input, init) => {
    if (input.endsWith("/health")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "snapinsight-local-api",
          version: "v1",
          ollamaReachable: true
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    if (input.endsWith("/v1/models")) {
      return new Response(
        JSON.stringify({
          state: "ready",
          models: [
            {
              id: "llama3.1:8b",
              label: "llama3.1:8b",
              provider: "ollama",
              available: true
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    if (input.endsWith("/v1/explanations/stream")) {
      if (init?.signal?.aborted) {
        const abortError = new Error("Timed out.");
        abortError.name = "AbortError";
        throw abortError;
      }

      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            const abortError = new Error("Timed out.");
            abortError.name = "AbortError";
            reject(abortError);
          },
          { once: true }
        );
      });
    }

    throw new Error(`Unexpected fetch input: ${input}`);
  });

  try {
    const response = await handleExplanationsStart(
      {
        type: "explanations.start",
        payload: {
          requestId: "req-timeout",
          senderContext: {
            tabId: -1,
            frameId: 0,
            pageInstanceId: "doc-timeout"
          },
          text: "Transformer",
          mode: "short"
        }
      },
      {
        tab: {
          id: 321
        } as chrome.tabs.Tab,
        frameId: 0
      }
    );

    assert.deepEqual(response, {
      ok: false,
      error: {
        code: "request_failed",
        message: "Explanation stream could not be started.",
        retryable: true
      }
    });
    assert.equal(chromeEnv.tabMessages.length, 0);
  } finally {
    restoreFetch();
    restoreTimeouts();
    chromeEnv.restore();
  }
});

test("server-side selected-model rejection is surfaced deterministically", async () => {
  const chromeEnv = installMockChrome({
    initialStorage: {
      "settings.selectedModel": "llama3.1:8b"
    }
  });
  const restoreFetch = installFetchMock(async (input) => {
    if (input.endsWith("/health")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "snapinsight-local-api",
          version: "v1",
          ollamaReachable: true
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    if (input.endsWith("/v1/models")) {
      return new Response(
        JSON.stringify({
          state: "ready",
          models: [
            {
              id: "llama3.1:8b",
              label: "llama3.1:8b",
              provider: "ollama",
              available: true
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    if (input.endsWith("/v1/explanations/stream")) {
      return new Response(
        JSON.stringify({
          error: {
            code: "selected_model_unavailable",
            message: "A valid model must be selected before explanation can start.",
            retryable: false
          }
        }),
        {
          status: 409,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    throw new Error(`Unexpected fetch input: ${input}`);
  });

  try {
    const response = await handleExplanationsStart(
      {
        type: "explanations.start",
        payload: {
          requestId: "req-3",
          senderContext: {
            tabId: -1,
            frameId: 0,
            pageInstanceId: "doc-3"
          },
          text: "Transformer",
          mode: "short"
        }
      },
      {
        tab: {
          id: 321
        } as chrome.tabs.Tab,
        frameId: 0
      }
    );

    assert.equal(response.ok, false);
    if (response.ok) {
      throw new Error("Expected startup rejection.");
    }

    assert.deepEqual(response.error, {
      code: "selected_model_unavailable",
      message: "A valid model must be selected before explanation can start.",
      retryable: false
    });
  } finally {
    restoreFetch();
    chromeEnv.restore();
  }
});

test("cancellation aborts the registered active stream by scoped identity", async () => {
  const chromeEnv = installMockChrome();
  let cancelled = false;

  registerActiveStream("req-cancel", {
    senderContext: {
      tabId: 77,
      frameId: 0,
      pageInstanceId: "doc-cancel"
    },
    cancel: () => {
      cancelled = true;
    }
  });

  try {
    const response = await handleExplanationsCancel(
      {
        type: "explanations.cancel",
        payload: {
          requestId: "req-cancel",
          senderContext: {
            tabId: -1,
            frameId: 0,
            pageInstanceId: "doc-cancel"
          }
        }
      },
      {
        tab: {
          id: 77
        } as chrome.tabs.Tab,
        frameId: 0
      }
    );

    assert.deepEqual(response, {
      ok: true,
      data: {}
    });
    assert.equal(cancelled, true);
  } finally {
    chromeEnv.restore();
  }
});

test("detailed explanation startup preserves explicit model override", async () => {
  const chromeEnv = installMockChrome();
  let capturedBody: Record<string, unknown> | null = null;
  const restoreFetch = installFetchMock(async (input, init) => {
    if (input.endsWith("/health")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "snapinsight-local-api",
          version: "v1",
          ollamaReachable: true
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    if (input.endsWith("/v1/models")) {
      return new Response(
        JSON.stringify({
          state: "ready",
          models: [
            {
              id: "llama3.1:8b",
              label: "llama3.1:8b",
              provider: "ollama",
              available: true
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    if (input.endsWith("/v1/explanations/stream")) {
      capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(
        [
          JSON.stringify({
            event: "start",
            requestId: "req-detailed",
            mode: "detailed",
            model: "llama3.1:8b"
          }),
          JSON.stringify({
            event: "complete",
            requestId: "req-detailed"
          })
        ].join("\n") + "\n",
        {
          status: 200,
          headers: {
            "content-type": "application/x-ndjson"
          }
        }
      );
    }

    throw new Error(`Unexpected fetch input: ${input}`);
  });

  try {
    const response = await handleExplanationsStart(
      {
        type: "explanations.start",
        payload: {
          requestId: "req-detailed",
          senderContext: {
            tabId: -1,
            frameId: 0,
            pageInstanceId: "doc-detail"
          },
          text: "Transformer",
          mode: "detailed",
          model: "llama3.1:8b"
        }
      },
      {
        tab: {
          id: 321
        } as chrome.tabs.Tab,
        frameId: 0
      }
    );

    assert.equal(response.ok, true);
    assert.deepEqual(capturedBody, {
      requestId: "req-detailed",
      text: "Transformer",
      model: "llama3.1:8b",
      mode: "detailed"
    });
  } finally {
    restoreFetch();
    chromeEnv.restore();
  }
});
