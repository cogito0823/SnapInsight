import test from "node:test";
import assert from "node:assert/strict";

import { createInitialContentCardState } from "../../src/content/state/card-state";
import {
  applyChunkToRequestState,
  applyErrorToRequestState,
  applyForwardedStartEvent,
  createStartingRequestState
} from "../../src/content/state/request-state";
import { renderContentApp } from "../../src/content/ui/render-app";

function createMockRoot() {
  return {
    innerHTML: "",
    getElementById: () => null
  } as unknown as ShadowRoot;
}

function installMockWindow(): () => void {
  const originalWindow = (
    globalThis as typeof globalThis & {
      window?: Window & typeof globalThis;
    }
  ).window;
  const originalButton = (
    globalThis as typeof globalThis & { HTMLButtonElement?: typeof HTMLButtonElement }
  ).HTMLButtonElement;
  const originalSelect = (
    globalThis as typeof globalThis & { HTMLSelectElement?: typeof HTMLSelectElement }
  ).HTMLSelectElement;
  (
    globalThis as typeof globalThis & {
      window?: Window & typeof globalThis;
    }
  ).window = {
    innerWidth: 1280,
    innerHeight: 800
  } as unknown as Window & typeof globalThis;
  (
    globalThis as typeof globalThis & { HTMLButtonElement?: typeof HTMLButtonElement }
  ).HTMLButtonElement = class {} as typeof HTMLButtonElement;
  (
    globalThis as typeof globalThis & { HTMLSelectElement?: typeof HTMLSelectElement }
  ).HTMLSelectElement = class {} as typeof HTMLSelectElement;

  return () => {
    (
      globalThis as typeof globalThis & {
        window?: Window & typeof globalThis;
      }
    ).window = originalWindow;
    (
      globalThis as typeof globalThis & { HTMLButtonElement?: typeof HTMLButtonElement }
    ).HTMLButtonElement = originalButton;
    (
      globalThis as typeof globalThis & { HTMLSelectElement?: typeof HTMLSelectElement }
    ).HTMLSelectElement = originalSelect;
  };
}

const anchorRect = {
  top: 10,
  left: 20,
  width: 30,
  height: 12
};

function createOpenState() {
  return {
    ...createInitialContentCardState("doc-1"),
    cardPhase: "open" as const,
    selectedText: "Transformer",
    selectionAnchorRect: anchorRect,
    activeModel: "llama3.1:8b"
  };
}

test("detail action stays disabled until visible short content exists", () => {
  const root = createMockRoot();
  const restoreWindow = installMockWindow();

  try {
    renderContentApp(
      root,
      createOpenState(),
      {
        anchorRect: null
      },
      {
        shortDispatchPending: false,
        detailDispatchPending: false,
        modelPicker: {
          phase: "idle",
          targetArea: null,
          options: [],
          selectedModel: null,
          error: null
        }
      },
      {
        onTriggerHover: () => {},
        onCloseCard: () => {},
        onRetryShort: () => {},
        onExpandDetail: () => {},
        onRetryDetail: () => {},
        onModelSelectionChange: () => {},
        onSaveModelSelection: () => {}
      }
    );

    assert.match(root.innerHTML, /id="snapinsight-expand-detail"[\s\S]*disabled/);
  } finally {
    restoreWindow();
  }
});

test("detail action becomes enabled once short explanation has visible content", () => {
  const root = createMockRoot();
  const restoreWindow = installMockWindow();
  const shortRequestState = applyChunkToRequestState(
    applyForwardedStartEvent(createStartingRequestState("short", "req-short"), {
      event: "start",
      requestId: "req-short",
      mode: "short",
      model: "llama3.1:8b"
    }),
    "这是可见的简短解释。"
  );

  try {
    renderContentApp(
      root,
      {
        ...createOpenState(),
        shortRequestState
      },
      {
        anchorRect: null
      },
      {
        shortDispatchPending: false,
        detailDispatchPending: false,
        modelPicker: {
          phase: "idle",
          targetArea: null,
          options: [],
          selectedModel: null,
          error: null
        }
      },
      {
        onTriggerHover: () => {},
        onCloseCard: () => {},
        onRetryShort: () => {},
        onExpandDetail: () => {},
        onRetryDetail: () => {},
        onModelSelectionChange: () => {},
        onSaveModelSelection: () => {}
      }
    );

    assert.match(root.innerHTML, /id="snapinsight-expand-detail"/);
    assert.doesNotMatch(root.innerHTML, /id="snapinsight-expand-detail"[\s\S]*disabled/);
  } finally {
    restoreWindow();
  }
});

test("detail error renders inside the detail area without erasing short content", () => {
  const root = createMockRoot();
  const restoreWindow = installMockWindow();
  const shortRequestState = applyChunkToRequestState(
    applyForwardedStartEvent(createStartingRequestState("short", "req-short"), {
      event: "start",
      requestId: "req-short",
      mode: "short",
      model: "llama3.1:8b"
    }),
    "保留的简短解释。"
  );
  const detailRequestState = applyErrorToRequestState(
    createStartingRequestState("detailed", "req-detail"),
    {
      code: "request_failed",
      message: "Detailed explanation failed.",
      retryable: true
    }
  );

  try {
    renderContentApp(
      root,
      {
        ...createOpenState(),
        detailExpanded: true,
        shortRequestState,
        detailRequestState
      },
      {
        anchorRect: null
      },
      {
        shortDispatchPending: false,
        detailDispatchPending: false,
        modelPicker: {
          phase: "idle",
          targetArea: null,
          options: [],
          selectedModel: null,
          error: null
        }
      },
      {
        onTriggerHover: () => {},
        onCloseCard: () => {},
        onRetryShort: () => {},
        onExpandDetail: () => {},
        onRetryDetail: () => {},
        onModelSelectionChange: () => {},
        onSaveModelSelection: () => {}
      }
    );

    assert.match(root.innerHTML, /保留的简短解释。/);
    assert.match(root.innerHTML, /重试详细解释/);
  } finally {
    restoreWindow();
  }
});

test("detail selected-model error renders the in-card model picker in the detail area", () => {
  const root = createMockRoot();
  const restoreWindow = installMockWindow();
  const shortRequestState = applyChunkToRequestState(
    applyForwardedStartEvent(createStartingRequestState("short", "req-short"), {
      event: "start",
      requestId: "req-short",
      mode: "short",
      model: "llama3.1:8b"
    }),
    "保留的简短解释。"
  );
  const detailRequestState = applyErrorToRequestState(
    createStartingRequestState("detailed", "req-detail"),
    {
      code: "selected_model_unavailable",
      message: "A valid model must be selected before explanation can start.",
      retryable: false
    }
  );

  try {
    renderContentApp(
      root,
      {
        ...createOpenState(),
        detailExpanded: true,
        shortRequestState,
        detailRequestState
      },
      {
        anchorRect: null
      },
      {
        shortDispatchPending: false,
        detailDispatchPending: false,
        modelPicker: {
          phase: "ready",
          targetArea: "detail",
          options: [
            {
              id: "llama3.1:8b",
              label: "llama3.1:8b",
              provider: "ollama",
              available: true
            }
          ],
          selectedModel: "llama3.1:8b",
          error: null
        }
      },
      {
        onTriggerHover: () => {},
        onCloseCard: () => {},
        onRetryShort: () => {},
        onExpandDetail: () => {},
        onRetryDetail: () => {},
        onModelSelectionChange: () => {},
        onSaveModelSelection: () => {}
      }
    );

    assert.match(root.innerHTML, /详细解释/);
    assert.match(root.innerHTML, /保存并继续解释/);
  } finally {
    restoreWindow();
  }
});

test("detail markdown content renders formatted blocks inside scrollable card body", () => {
  const root = createMockRoot();
  const restoreWindow = installMockWindow();
  const shortRequestState = applyChunkToRequestState(
    applyForwardedStartEvent(createStartingRequestState("short", "req-short"), {
      event: "start",
      requestId: "req-short",
      mode: "short",
      model: "llama3.1:8b"
    }),
    "简短解释。"
  );
  const detailRequestState = applyChunkToRequestState(
    applyForwardedStartEvent(createStartingRequestState("detailed", "req-detail"), {
      event: "start",
      requestId: "req-detail",
      mode: "detailed",
      model: "llama3.1:8b"
    }),
    "# 文档\n\n- **结构化说明**\n- 第二项"
  );

  try {
    renderContentApp(
      root,
      {
        ...createOpenState(),
        detailExpanded: true,
        shortRequestState,
        detailRequestState
      },
      {
        anchorRect: null
      },
      {
        shortDispatchPending: false,
        detailDispatchPending: false,
        modelPicker: {
          phase: "idle",
          targetArea: null,
          options: [],
          selectedModel: null,
          error: null
        }
      },
      {
        onTriggerHover: () => {},
        onCloseCard: () => {},
        onRetryShort: () => {},
        onExpandDetail: () => {},
        onRetryDetail: () => {},
        onModelSelectionChange: () => {},
        onSaveModelSelection: () => {}
      }
    );

    assert.match(root.innerHTML, /overflow-y: auto/);
    assert.match(root.innerHTML, /<h1>文档<\/h1>/);
    assert.match(root.innerHTML, /<strong>结构化说明<\/strong>/);
  } finally {
    restoreWindow();
  }
});
