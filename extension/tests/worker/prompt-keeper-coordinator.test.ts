import test from "node:test";
import assert from "node:assert/strict";

import {
  PromptKeeperCoordinator,
  type PromptKeeperEntry
} from "../../src/worker/prompt-keeper/keeper-coordinator";
import {
  PROMPT_KEEPER_MESSAGE_TYPE,
  type PromptKeeperLifecycleMessage
} from "../../src/shared/contracts/prompt-keeper";

function message(
  action: PromptKeeperLifecycleMessage["payload"]["action"],
  pageInstanceId: string,
  hidden = false
): PromptKeeperLifecycleMessage {
  return {
    type: PROMPT_KEEPER_MESSAGE_TYPE,
    payload: { action, pageInstanceId, hidden }
  };
}

function harness(initial: PromptKeeperEntry[] = [], maxKeepers = 5) {
  let stored = structuredClone(initial);
  const evicted: PromptKeeperEntry[] = [];
  let now = 0;
  const coordinator = new PromptKeeperCoordinator(
    {
      load: async () => structuredClone(stored),
      save: async (entries) => {
        stored = structuredClone(entries);
      }
    },
    {
      evict: async (entry) => {
        evicted.push(structuredClone(entry));
      }
    },
    () => ++now,
    maxKeepers
  );
  return { coordinator, evicted, entries: () => stored };
}

test("keeper coordinator retains the five most relevant documents", async () => {
  const state = harness([], 5);
  for (let tabId = 1; tabId <= 6; tabId += 1) {
    await state.coordinator.handle(
      message("touch", `page-${tabId}`, tabId !== 6),
      { tabId, frameId: 0 }
    );
  }

  assert.equal(state.entries().length, 5);
  assert.deepEqual(state.evicted.map((entry) => entry.pageInstanceId), ["page-1"]);
  assert.equal(state.entries().some((entry) => entry.pageInstanceId === "page-6"), true);
});

test("hidden keepers are evicted before visible keepers", async () => {
  const state = harness([], 2);
  await state.coordinator.handle(message("touch", "visible-old", false), { tabId: 1, frameId: 0 });
  await state.coordinator.handle(message("touch", "hidden-new", true), { tabId: 2, frameId: 0 });
  await state.coordinator.handle(message("touch", "visible-new", false), { tabId: 3, frameId: 0 });

  assert.deepEqual(state.evicted.map((entry) => entry.pageInstanceId), ["hidden-new"]);
  assert.deepEqual(
    state.entries().map((entry) => entry.pageInstanceId).sort(),
    ["visible-new", "visible-old"]
  );
});

test("touch refreshes LRU and a new page replaces stale state in the same frame", async () => {
  const state = harness([], 2);
  await state.coordinator.handle(message("touch", "first", true), { tabId: 1, frameId: 0 });
  await state.coordinator.handle(message("touch", "second", true), { tabId: 2, frameId: 0 });
  await state.coordinator.handle(message("touch", "first", true), { tabId: 1, frameId: 0 });
  await state.coordinator.handle(message("touch", "third", true), { tabId: 3, frameId: 0 });
  assert.deepEqual(state.evicted.map((entry) => entry.pageInstanceId), ["second"]);

  await state.coordinator.handle(message("touch", "replacement", false), { tabId: 1, frameId: 0 });
  assert.equal(state.entries().some((entry) => entry.pageInstanceId === "first"), false);
  assert.equal(state.entries().some((entry) => entry.pageInstanceId === "replacement"), true);
});

test("coordinator restores session storage and removes closed tabs", async () => {
  const state = harness([
    { tabId: 4, frameId: 0, pageInstanceId: "restored", hidden: true, lastUsedAt: 10 },
    { tabId: 5, frameId: 0, pageInstanceId: "other", hidden: false, lastUsedAt: 11 }
  ]);

  await state.coordinator.handle(message("visibility", "restored", false), { tabId: 4, frameId: 0 });
  assert.equal(state.entries().find((entry) => entry.pageInstanceId === "restored")?.hidden, false);
  await state.coordinator.removeTab(4);
  assert.deepEqual(state.entries().map((entry) => entry.pageInstanceId), ["other"]);
});

test("explicit removal unregisters a document without evicting it", async () => {
  const state = harness();
  await state.coordinator.handle(message("touch", "page", true), { tabId: 8, frameId: 0 });
  await state.coordinator.handle(message("remove", "page", true), { tabId: 8, frameId: 0 });
  assert.deepEqual(state.entries(), []);
  assert.deepEqual(state.evicted, []);
});
