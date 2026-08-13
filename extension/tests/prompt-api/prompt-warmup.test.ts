import test from "node:test";
import assert from "node:assert/strict";

import { createPromptWarmupScheduler } from "../../src/content/prompt-api/prompt-warmup";

test("warm-up scheduling debounces repeated selection updates", async () => {
  let warmups = 0;
  const scheduler = createPromptWarmupScheduler(async () => {
    warmups += 1;
  }, 5);

  scheduler.schedule();
  scheduler.schedule();
  scheduler.schedule();
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(warmups, 1);
});

test("cancelled warm-up scheduling never initializes the model", async () => {
  let warmups = 0;
  const scheduler = createPromptWarmupScheduler(async () => {
    warmups += 1;
  }, 5);

  scheduler.schedule();
  scheduler.cancel();
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(warmups, 0);
});
