import test from "node:test";
import assert from "node:assert/strict";

import { createInitialContentCardState } from "../../src/content/state/card-state";
import {
  applyChunkToRequestState,
  applyErrorToRequestState,
  applyForwardedStartEvent,
  createStartingRequestState
} from "../../src/content/state/request-state";
import { renderContentApp, type RenderCallbacks } from "../../src/content/ui/render-app";

function createMockRoot() {
  return { innerHTML: "", getElementById: () => null } as unknown as ShadowRoot;
}

function installMockWindow(): () => void {
  const originalWindow = globalThis.window;
  const originalButton = globalThis.HTMLButtonElement;
  globalThis.window = { innerWidth: 1280, innerHeight: 800 } as Window &
    typeof globalThis;
  globalThis.HTMLButtonElement = class {} as typeof HTMLButtonElement;
  return () => {
    globalThis.window = originalWindow;
    globalThis.HTMLButtonElement = originalButton;
  };
}

const callbacks: RenderCallbacks = {
  onTriggerHover: () => {},
  onCloseCard: () => {},
  onRetryShort: () => {},
  onExpandDetail: () => {},
  onRetryDetail: () => {},
  onCancelShort: () => {},
  onCancelDetail: () => {},
  onCopyShort: () => {},
  onCopyDetail: () => {},
  onOpenSetup: () => {}
};

const anchorRect = { top: 10, left: 20, width: 30, height: 12 };
const requestView = {
  shortDispatchPending: false,
  detailDispatchPending: false,
  shortLoadingStage: "dispatching" as const,
  detailLoadingStage: "dispatching" as const,
  shortCancelAvailable: false,
  detailCancelAvailable: false
};

function createOpenState() {
  return {
    ...createInitialContentCardState("doc-1"),
    cardPhase: "open" as const,
    selectedText: "Transformer",
    selectionAnchorRect: anchorRect,
    activeModel: "chrome-gemini-nano"
  };
}

function streamingRequest(mode: "short" | "detailed", id: string, text: string) {
  return applyChunkToRequestState(
    applyForwardedStartEvent(createStartingRequestState(mode, id), {
      event: "start",
      requestId: id,
      mode,
      model: "chrome-gemini-nano"
    }),
    text
  );
}

test("detail action stays disabled until visible short content exists", () => {
  const root = createMockRoot();
  const restore = installMockWindow();
  try {
    renderContentApp(root, createOpenState(), { anchorRect: null }, requestView, callbacks);
    assert.match(root.innerHTML, /id="snapinsight-expand-detail"[\s\S]*disabled/);
  } finally {
    restore();
  }
});

test("streaming responses expose copy, regenerate, and accessible dialog controls", () => {
  const root = createMockRoot();
  const restore = installMockWindow();
  try {
    renderContentApp(
      root,
      {
        ...createOpenState(),
        detailExpanded: true,
        shortRequestState: streamingRequest("short", "short-1", "简短解释。"),
        detailRequestState: streamingRequest(
          "detailed",
          "detail-1",
          "# 文档\n\n- **结构化说明**"
        )
      },
      { anchorRect: null },
      requestView,
      callbacks
    );

    assert.match(root.innerHTML, /role="dialog"/);
    assert.match(root.innerHTML, /id="snapinsight-copy-short"/);
    assert.match(root.innerHTML, /id="snapinsight-copy-detail"/);
    assert.match(root.innerHTML, /id="snapinsight-regenerate-short"/);
    assert.match(root.innerHTML, /id="snapinsight-regenerate-detail"/);
    assert.match(root.innerHTML, /<h1>文档<\/h1>/);
    assert.match(root.innerHTML, /<strong>结构化说明<\/strong>/);
    assert.equal(
      root.innerHTML.match(/解释正在持续生成/g)?.length,
      2
    );
  } finally {
    restore();
  }
});

test("detail errors preserve short content and remain retryable", () => {
  const root = createMockRoot();
  const restore = installMockWindow();
  try {
    renderContentApp(
      root,
      {
        ...createOpenState(),
        detailExpanded: true,
        shortRequestState: streamingRequest("short", "short-1", "保留的简短解释。"),
        detailRequestState: applyErrorToRequestState(
          createStartingRequestState("detailed", "detail-1"),
          { code: "request_failed", message: "failed", retryable: true }
        )
      },
      { anchorRect: null },
      requestView,
      callbacks
    );
    assert.match(root.innerHTML, /保留的简短解释。/);
    assert.match(root.innerHTML, /重试详细解释/);
  } finally {
    restore();
  }
});

test("first-run model error links to the device status page", () => {
  const root = createMockRoot();
  const restore = installMockWindow();
  try {
    renderContentApp(
      root,
      {
        ...createOpenState(),
        shortRequestState: applyErrorToRequestState(
          createStartingRequestState("short", "short-1"),
          {
            code: "model_download_required",
            message: "prepare model",
            retryable: false
          }
        )
      },
      { anchorRect: null },
      requestView,
      callbacks
    );
    assert.match(root.innerHTML, /首次使用前需要先准备/);
    assert.match(root.innerHTML, /id="snapinsight-open-setup"/);
    assert.doesNotMatch(root.innerHTML, /id="snapinsight-retry-short"/);
  } finally {
    restore();
  }
});

test("model download in progress links to device status without retry actions", () => {
  const root = createMockRoot();
  const restore = installMockWindow();
  try {
    renderContentApp(
      root,
      {
        ...createOpenState(),
        detailExpanded: true,
        shortRequestState: applyErrorToRequestState(
          createStartingRequestState("short", "short-downloading"),
          {
            code: "model_downloading",
            message: "model downloading",
            retryable: true
          }
        ),
        detailRequestState: applyErrorToRequestState(
          createStartingRequestState("detailed", "detail-downloading"),
          {
            code: "model_downloading",
            message: "model downloading",
            retryable: true
          }
        )
      },
      { anchorRect: null },
      requestView,
      callbacks
    );

    assert.match(root.innerHTML, /Chrome 正在下载设备端模型/);
    assert.match(root.innerHTML, /id="snapinsight-open-setup"/);
    assert.doesNotMatch(root.innerHTML, /id="snapinsight-retry-short"/);
    assert.doesNotMatch(root.innerHTML, /id="snapinsight-retry-detail"/);
  } finally {
    restore();
  }
});

test("long-running generation exposes an explicit cancel action", () => {
  const restoreWindow = installMockWindow();
  try {
    const root = createMockRoot();
    renderContentApp(
      root,
      {
        ...createOpenState(),
        shortRequestState: createStartingRequestState("short", "short-cancel")
      },
      { anchorRect },
      {
        ...requestView,
        shortDispatchPending: true,
        shortCancelAvailable: true
      },
      callbacks
    );
    assert.match(root.innerHTML, /snapinsight-cancel-short/);
    assert.match(root.innerHTML, /取消生成/);
  } finally {
    restoreWindow();
  }
});

test("loading copy describes request phases without claiming model readiness", () => {
  const restoreWindow = installMockWindow();
  try {
    const expected = [
      ["dispatching", "正在开始解释"],
      ["acquiring_session", "启动或恢复可能需要一些时间"],
      ["waiting_response", "本地模型已接收请求"],
      ["response_slow", "本地模型仍在生成"]
    ] as const;

    for (const [stage, copy] of expected) {
      const root = createMockRoot();
      renderContentApp(
        root,
        {
          ...createOpenState(),
          shortRequestState: createStartingRequestState("short", `short-${stage}`)
        },
        { anchorRect },
        {
          ...requestView,
          shortDispatchPending: true,
          shortLoadingStage: stage
        },
        callbacks
      );
      assert.match(root.innerHTML, new RegExp(copy));
    }
  } finally {
    restoreWindow();
  }
});

test("stream start without a first chunk shows only the current request phase", () => {
  const root = createMockRoot();
  const restoreWindow = installMockWindow();
  try {
    const request = applyForwardedStartEvent(
      createStartingRequestState("short", "short-waiting"),
      {
        event: "start",
        requestId: "short-waiting",
        mode: "short",
        model: "chrome-gemini-nano"
      }
    );

    renderContentApp(
      root,
      { ...createOpenState(), shortRequestState: request },
      { anchorRect },
      { ...requestView, shortLoadingStage: "waiting_response" },
      callbacks
    );

    assert.match(root.innerHTML, /本地模型已接收请求/);
    assert.doesNotMatch(root.innerHTML, /解释正在持续生成/);
  } finally {
    restoreWindow();
  }
});
