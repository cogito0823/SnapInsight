import test from "node:test";
import assert from "node:assert/strict";

import {
  PromptSessionPool,
  type PromptSessionPoolOptions
} from "../../src/content/prompt-api/prompt-session-pool";
import type {
  LanguageModelApi,
  LanguageModelSession
} from "../../src/prompt-api/language-model";

function session(options: {
  clone?: LanguageModelSession["clone"];
  onDestroy?: () => void;
} = {}): LanguageModelSession {
  return {
    prompt: async () => "",
    promptStreaming: () => new ReadableStream<string>(),
    clone: options.clone,
    destroy: () => options.onDestroy?.()
  };
}

function poolFor(api: LanguageModelApi, options: PromptSessionPoolOptions = {}) {
  return new PromptSessionPool({
    getApi: () => api,
    availabilityTimeoutMs: 50,
    unusedWarmupTtlMs: 1_000,
    ...options
  });
}

test("warm-up and concurrent acquisitions share one template creation", async () => {
  let creates = 0;
  let clones = 0;
  const template = session({
    clone: async () => {
      clones += 1;
      return session();
    }
  });
  const api: LanguageModelApi = {
    availability: async () => "available",
    create: async () => {
      creates += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return template;
    }
  };
  const pool = poolFor(api);
  const firstController = new AbortController();
  const secondController = new AbortController();

  try {
    const warmup = pool.warmUp();
    const [first, second] = await Promise.all([
      pool.acquire(firstController.signal),
      pool.acquire(secondController.signal)
    ]);
    await warmup;

    assert.equal(creates, 1);
    assert.equal(clones, 2);
    first.release();
    second.release();
  } finally {
    pool.dispose();
  }
});

test("no-clone acquisition preserves a dedicated keeper and creates an independent request session", async () => {
  const created: LanguageModelSession[] = [];
  const destroyed = new Set<LanguageModelSession>();
  const api: LanguageModelApi = {
    availability: async () => "available",
    create: async () => {
      let next!: LanguageModelSession;
      next = session({ onDestroy: () => destroyed.add(next) });
      created.push(next);
      return next;
    }
  };
  const pool = poolFor(api);

  try {
    const acquired = await pool.acquire(new AbortController().signal);
    assert.equal(acquired.path, "fallback");
    assert.equal(created.length, 2);
    assert.equal(acquired.session, created[1]);
    assert.notEqual(acquired.session, created[0]);
    acquired.release();
    assert.equal(destroyed.has(created[1]), true);
    assert.equal(destroyed.has(created[0]), false);
  } finally {
    pool.dispose();
  }
  assert.equal(destroyed.has(created[0]), true);
});

test("a failed clone invalidates the template and retries once", async () => {
  let creates = 0;
  let firstDestroyed = false;
  const api: LanguageModelApi = {
    availability: async () => "available",
    create: async () => {
      creates += 1;
      if (creates === 1) {
        return session({
          clone: async () => {
            throw new DOMException("stale template", "InvalidStateError");
          },
          onDestroy: () => {
            firstDestroyed = true;
          }
        });
      }
      return session({ clone: async () => session() });
    }
  };
  const pool = poolFor(api);

  try {
    const acquired = await pool.acquire(new AbortController().signal);
    assert.equal(creates, 2);
    assert.equal(firstDestroyed, true);
    acquired.release();
  } finally {
    pool.dispose();
  }
});

test("warm-up never creates a session when the model still needs download", async () => {
  let creates = 0;
  const pool = poolFor({
    availability: async () => "downloadable",
    create: async () => {
      creates += 1;
      return session();
    }
  });

  try {
    const result = await pool.warmUp();
    assert.equal(result.ok, false);
    assert.equal(creates, 0);
    if (!result.ok) assert.equal(result.error.code, "model_download_required");
  } finally {
    pool.dispose();
  }
});

test("an unused warm-up template is destroyed after its short TTL", async () => {
  let destroyed = false;
  const pool = poolFor(
    {
      availability: async () => "available",
      create: async () => session({ onDestroy: () => (destroyed = true) })
    },
    { unusedWarmupTtlMs: 5 }
  );

  await pool.warmUp();
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(destroyed, true);
  pool.dispose();
});

test("a used keeper remains alive while its document is hidden", async () => {
  let destroyed = false;
  const pool = poolFor(
    {
      availability: async () => "available",
      create: async () =>
        session({
          clone: async () => session(),
          onDestroy: () => (destroyed = true)
        })
    }
  );

  const acquired = await pool.acquire(new AbortController().signal);
  acquired.release();
  pool.handleVisibilityChange(true);
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(destroyed, false);
  pool.dispose();
  assert.equal(destroyed, true);
});

test("acquisition aborts even when clone ignores its AbortSignal", async () => {
  const pool = poolFor({
    availability: async () => "available",
    create: async () =>
      session({
        clone: async () => new Promise<LanguageModelSession>(() => undefined)
      })
  });
  const controller = new AbortController();

  try {
    const acquisition = pool.acquire(controller.signal);
    setTimeout(() => controller.abort(), 5);
    await assert.rejects(acquisition, (error: unknown) => {
      return error instanceof DOMException && error.name === "AbortError";
    });
  } finally {
    pool.dispose();
  }
});

test("a clone that resolves after abort is immediately destroyed", async () => {
  let resolveClone!: (value: LanguageModelSession) => void;
  let lateSessionDestroyed = false;
  const pool = poolFor({
    availability: async () => "available",
    create: async () =>
      session({
        clone: async () =>
          new Promise<LanguageModelSession>((resolve) => {
            resolveClone = resolve;
          })
      })
  });
  const controller = new AbortController();

  try {
    const acquisition = pool.acquire(controller.signal);
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    await assert.rejects(acquisition, { name: "AbortError" });
    resolveClone(session({ onDestroy: () => (lateSessionDestroyed = true) }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(lateSessionDestroyed, true);
  } finally {
    pool.dispose();
  }
});

test("a fallback request session that resolves after abort is destroyed without losing the keeper", async () => {
  let creates = 0;
  let resolveRequest!: (value: LanguageModelSession) => void;
  let keeperDestroyed = false;
  let lateRequestDestroyed = false;
  const pool = poolFor({
    availability: async () => "available",
    create: async () => {
      creates += 1;
      if (creates === 1) {
        return session({ onDestroy: () => (keeperDestroyed = true) });
      }
      return new Promise<LanguageModelSession>((resolve) => {
        resolveRequest = resolve;
      });
    }
  });
  const controller = new AbortController();

  const acquisition = pool.acquire(controller.signal);
  await new Promise((resolve) => setTimeout(resolve, 0));
  controller.abort();
  await assert.rejects(acquisition, { name: "AbortError" });
  resolveRequest(session({ onDestroy: () => (lateRequestDestroyed = true) }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(lateRequestDestroyed, true);
  assert.equal(keeperDestroyed, false);
  pool.dispose();
  assert.equal(keeperDestroyed, true);
});

test("unused warm-up disposal is paused while a fallback request session is being created", async () => {
  let creates = 0;
  let resolveRequest!: (value: LanguageModelSession) => void;
  let keeperDestroyed = false;
  const pool = poolFor(
    {
      availability: async () => "available",
      create: async () => {
        creates += 1;
        if (creates === 1) {
          return session({ onDestroy: () => (keeperDestroyed = true) });
        }
        return new Promise<LanguageModelSession>((resolve) => {
          resolveRequest = resolve;
        });
      }
    },
    { unusedWarmupTtlMs: 5 }
  );

  const acquisition = pool.acquire(new AbortController().signal);
  await new Promise((resolve) => setTimeout(resolve, 12));
  assert.equal(keeperDestroyed, false);
  resolveRequest(session());
  const acquired = await acquisition;
  acquired.release();
  await new Promise((resolve) => setTimeout(resolve, 12));
  assert.equal(keeperDestroyed, false);
  pool.dispose();
  assert.equal(keeperDestroyed, true);
});

test("a template create that resolves after dispose is destroyed", async () => {
  let resolveCreate!: (value: LanguageModelSession) => void;
  let lateTemplateDestroyed = false;
  const pool = poolFor({
    availability: async () => "available",
    create: async () =>
      new Promise<LanguageModelSession>((resolve) => {
        resolveCreate = resolve;
      })
  });

  const warmup = pool.warmUp();
  await new Promise((resolve) => setTimeout(resolve, 0));
  pool.dispose();
  resolveCreate(session({ onDestroy: () => (lateTemplateDestroyed = true) }));
  await warmup;
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(lateTemplateDestroyed, true);
});

test("quota failure does not retry clone and activates backoff", async () => {
  let creates = 0;
  let clones = 0;
  const pool = poolFor(
    {
      availability: async () => "available",
      create: async () => {
        creates += 1;
        return session({
          clone: async () => {
            clones += 1;
            throw new DOMException("capacity", "QuotaExceededError");
          }
        });
      }
    },
    { quotaBackoffMs: 1_000 }
  );

  try {
    await assert.rejects(
      pool.acquire(new AbortController().signal),
      (error: unknown) =>
        error instanceof Error &&
        "extensionError" in error &&
        (error as { extensionError: { code: string } }).extensionError.code ===
          "quota_exceeded"
    );
    await assert.rejects(pool.acquire(new AbortController().signal));
    assert.equal(creates, 1);
    assert.equal(clones, 1);
  } finally {
    pool.dispose();
  }
});

test("available readiness is cached across fallback requests", async () => {
  let availabilityChecks = 0;
  const pool = poolFor({
    availability: async () => {
      availabilityChecks += 1;
      return "available";
    },
    create: async () => session()
  });

  try {
    const first = await pool.acquire(new AbortController().signal);
    first.release();
    const second = await pool.acquire(new AbortController().signal);
    second.release();
    assert.equal(availabilityChecks, 1);
  } finally {
    pool.dispose();
  }
});

test("blocked readiness uses a short negative cache", async () => {
  let availabilityChecks = 0;
  const pool = poolFor({
    availability: async () => {
      availabilityChecks += 1;
      return "downloadable";
    },
    create: async () => session()
  });

  try {
    await pool.warmUp();
    await pool.warmUp();
    assert.equal(availabilityChecks, 1);
  } finally {
    pool.dispose();
  }
});

test("session creation failure invalidates cached readiness", async () => {
  let availabilityChecks = 0;
  let creates = 0;
  const pool = poolFor({
    availability: async () => {
      availabilityChecks += 1;
      return "available";
    },
    create: async () => {
      creates += 1;
      if (creates === 1) throw new Error("transient create failure");
      return session();
    }
  });

  try {
    const first = await pool.warmUp();
    assert.equal(first.ok, false);
    const result = await pool.warmUp();
    assert.equal(result.ok, true);
    assert.equal(availabilityChecks, 2);
  } finally {
    pool.dispose();
  }
});

test("a used keeper remains alive while the document stays visible", async () => {
  let templateDestroyed = false;
  const pool = poolFor(
    {
      availability: async () => "available",
      create: async () =>
        session({
          clone: async () => session(),
          onDestroy: () => (templateDestroyed = true)
        })
    }
  );

  const acquired = await pool.acquire(new AbortController().signal);
  acquired.release();
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(templateDestroyed, false);
  pool.dispose();
  assert.equal(templateDestroyed, true);
});

test("visibility changes never dispose a used keeper", async () => {
  let templateDestroyed = false;
  const pool = poolFor(
    {
      availability: async () => "available",
      create: async () =>
        session({
          clone: async () => session(),
          onDestroy: () => (templateDestroyed = true)
        })
    }
  );

  const acquired = await pool.acquire(new AbortController().signal);
  acquired.release();
  pool.handleVisibilityChange(true);
  await new Promise((resolve) => setTimeout(resolve, 3));
  pool.handleVisibilityChange(false);
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(templateDestroyed, false);
  pool.dispose();
  assert.equal(templateDestroyed, true);
});

test("concurrent fallback acquisitions never share a mutable session", async () => {
  const created: LanguageModelSession[] = [];
  const pool = poolFor({
    availability: async () => "available",
    create: async () => {
      const next = session();
      created.push(next);
      return next;
    }
  });

  try {
    const [first, second] = await Promise.all([
      pool.acquire(new AbortController().signal),
      pool.acquire(new AbortController().signal)
    ]);
    assert.notEqual(first.session, second.session);
    assert.notEqual(first.session, created[0]);
    assert.notEqual(second.session, created[0]);
    assert.equal(created.length, 3);
    first.release();
    second.release();
  } finally {
    pool.dispose();
  }
});
