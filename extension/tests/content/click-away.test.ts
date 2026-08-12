import test from "node:test";
import assert from "node:assert/strict";

import { shouldIgnoreCardClickAway } from "../../src/content/ui/click-away";

test("click-away ignores events inside the shadow host", () => {
  const host = {} as HTMLElement;
  const event = { composedPath: () => [host] } as unknown as MouseEvent;
  assert.equal(shouldIgnoreCardClickAway(event, host), true);
});

test("click-away closes for events outside the shadow host", () => {
  const event = { composedPath: () => [] } as unknown as MouseEvent;
  assert.equal(shouldIgnoreCardClickAway(event, {} as HTMLElement), false);
});
