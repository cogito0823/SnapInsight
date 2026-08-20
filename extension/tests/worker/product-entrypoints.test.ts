import test from "node:test";
import assert from "node:assert/strict";

import { installMockChrome } from "../helpers/mock-chrome";
import { OPEN_DEVICE_STATUS_MESSAGE_TYPE } from "../../src/shared/contracts/open-device-status";
import { PROMPT_KEEPER_MESSAGE_TYPE } from "../../src/shared/contracts/prompt-keeper";
import { PROMPT_KEEPER_REGISTRY_KEY } from "../../src/worker/prompt-keeper/keeper-coordinator";

test("worker registers keeper lifecycle from the sender and targets LRU eviction", async () => {
  const chromeEnvironment = installMockChrome();
  const originalSelf = (globalThis as { self?: unknown }).self;
  (globalThis as { self?: unknown }).self = globalThis;

  try {
    const { registerProductEntrypoints } = await import(
      "../../src/worker/bootstrap/register-product-entrypoints"
    );
    delete (globalThis as typeof globalThis & {
      __snapinsightProductEntrypointsRegistered__?: boolean;
    }).__snapinsightProductEntrypointsRegistered__;
    registerProductEntrypoints();

    for (let tabId = 1; tabId <= 6; tabId += 1) {
      await chromeEnvironment.emitRuntimeMessage(
        {
          type: PROMPT_KEEPER_MESSAGE_TYPE,
          payload: {
            action: "touch",
            pageInstanceId: `page-${tabId}`,
            hidden: true
          }
        },
        { tab: { id: tabId } as chrome.tabs.Tab, frameId: 0 }
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    const entries = chromeEnvironment.storageState[
      PROMPT_KEEPER_REGISTRY_KEY
    ] as Array<{ pageInstanceId: string }>;
    assert.equal(entries.length, 5);
    assert.equal(entries.some((entry) => entry.pageInstanceId === "page-1"), false);
    assert.equal(chromeEnvironment.tabMessages[0]?.tabId, 1);
    assert.deepEqual(chromeEnvironment.tabMessages[0]?.options, { frameId: 0 });
  } finally {
    chromeEnvironment.restore();
    (globalThis as { self?: unknown }).self = originalSelf;
  }
});

test("worker opens a visible device status tab on request", async () => {
  const chromeEnvironment = installMockChrome();
  const originalSelf = (globalThis as { self?: unknown }).self;
  (globalThis as { self?: unknown }).self = globalThis;

  try {
    const { registerProductEntrypoints } = await import(
      "../../src/worker/bootstrap/register-product-entrypoints"
    );
    delete (globalThis as typeof globalThis & {
      __snapinsightProductEntrypointsRegistered__?: boolean;
    }).__snapinsightProductEntrypointsRegistered__;
    registerProductEntrypoints();

    await chromeEnvironment.emitRuntimeMessage({
      type: OPEN_DEVICE_STATUS_MESSAGE_TYPE
    });

    assert.deepEqual(chromeEnvironment.createdTabs, [
      {
        active: true,
        url: "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/options.html"
      }
    ]);
  } finally {
    chromeEnvironment.restore();
    (globalThis as { self?: unknown }).self = originalSelf;
  }
});
