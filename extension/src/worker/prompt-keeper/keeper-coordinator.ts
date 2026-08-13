import {
  PROMPT_KEEPER_EVICT_MESSAGE_TYPE,
  type PromptKeeperLifecycleMessage
} from "../../shared/contracts/prompt-keeper";

export const PROMPT_KEEPER_REGISTRY_KEY = "promptKeeperRegistry";
export const MAX_PROMPT_KEEPERS = 5;

export interface PromptKeeperEntry {
  tabId: number;
  frameId: number;
  pageInstanceId: string;
  hidden: boolean;
  lastUsedAt: number;
}

export interface PromptKeeperCoordinatorStorage {
  load(): Promise<PromptKeeperEntry[]>;
  save(entries: PromptKeeperEntry[]): Promise<void>;
}

export interface PromptKeeperCoordinatorMessenger {
  evict(entry: PromptKeeperEntry): Promise<void>;
}

function entryKey(entry: Pick<PromptKeeperEntry, "tabId" | "frameId" | "pageInstanceId">): string {
  return `${entry.tabId}:${entry.frameId}:${entry.pageInstanceId}`;
}

function isValidEntry(value: unknown): value is PromptKeeperEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<PromptKeeperEntry>;
  return (
    Number.isInteger(entry.tabId) &&
    Number.isInteger(entry.frameId) &&
    typeof entry.pageInstanceId === "string" &&
    entry.pageInstanceId.length > 0 &&
    typeof entry.hidden === "boolean" &&
    typeof entry.lastUsedAt === "number" &&
    Number.isFinite(entry.lastUsedAt)
  );
}

export class PromptKeeperCoordinator {
  private entries = new Map<string, PromptKeeperEntry>();
  private loading: Promise<void> | null = null;
  private operation = Promise.resolve();
  private lastTimestamp = 0;

  constructor(
    private readonly storage: PromptKeeperCoordinatorStorage,
    private readonly messenger: PromptKeeperCoordinatorMessenger,
    private readonly now: () => number = Date.now,
    private readonly maxKeepers = MAX_PROMPT_KEEPERS
  ) {}

  private ensureLoaded(): Promise<void> {
    if (!this.loading) {
      this.loading = this.storage.load().then((entries) => {
        const validEntries = entries.filter(isValidEntry);
        this.entries = new Map(validEntries.map((entry) => [entryKey(entry), entry]));
        this.lastTimestamp = Math.max(
          this.lastTimestamp,
          ...validEntries.map((entry) => entry.lastUsedAt)
        );
      });
    }
    return this.loading;
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.operation.then(operation, operation);
    this.operation = next.catch(() => undefined);
    return next;
  }

  handle(
    message: PromptKeeperLifecycleMessage,
    sender: { tabId: number; frameId: number }
  ): Promise<void> {
    return this.enqueue(async () => {
      await this.ensureLoaded();
      const identity = {
        tabId: sender.tabId,
        frameId: sender.frameId,
        pageInstanceId: message.payload.pageInstanceId
      };
      const key = entryKey(identity);

      if (message.payload.action === "remove") {
        this.entries.delete(key);
        await this.storage.save([...this.entries.values()]);
        return;
      }

      if (message.payload.action === "visibility") {
        const existing = this.entries.get(key);
        if (!existing) return;
        existing.hidden = message.payload.hidden;
        await this.storage.save([...this.entries.values()]);
        return;
      }

      // A new document supersedes stale registry state for the same tab/frame.
      for (const [existingKey, existing] of this.entries) {
        if (
          existing.tabId === sender.tabId &&
          existing.frameId === sender.frameId &&
          existing.pageInstanceId !== message.payload.pageInstanceId
        ) {
          this.entries.delete(existingKey);
        }
      }
      this.entries.set(key, {
        ...identity,
        hidden: message.payload.hidden,
        lastUsedAt: (this.lastTimestamp = Math.max(
          this.now(),
          this.lastTimestamp + 1
        ))
      });

      const evicted: PromptKeeperEntry[] = [];
      while (this.entries.size > this.maxKeepers) {
        const candidates = [...this.entries.values()].sort(
          (left, right) =>
            Number(left.hidden) - Number(right.hidden) ||
            right.lastUsedAt - left.lastUsedAt
        );
        const victim = candidates.at(-1);
        if (!victim) break;
        this.entries.delete(entryKey(victim));
        evicted.push(victim);
      }
      await this.storage.save([...this.entries.values()]);
      await Promise.allSettled(evicted.map((entry) => this.messenger.evict(entry)));
    });
  }

  removeTab(tabId: number): Promise<void> {
    return this.enqueue(async () => {
      await this.ensureLoaded();
      let changed = false;
      for (const [key, entry] of this.entries) {
        if (entry.tabId === tabId) {
          this.entries.delete(key);
          changed = true;
        }
      }
      if (changed) await this.storage.save([...this.entries.values()]);
    });
  }
}

export function createChromePromptKeeperCoordinator(): PromptKeeperCoordinator {
  return new PromptKeeperCoordinator(
    {
      load: async () => {
        const stored = await chrome.storage.session.get(PROMPT_KEEPER_REGISTRY_KEY);
        const entries = stored[PROMPT_KEEPER_REGISTRY_KEY];
        return Array.isArray(entries) ? entries : [];
      },
      save: async (entries) => {
        await chrome.storage.session.set({ [PROMPT_KEEPER_REGISTRY_KEY]: entries });
      }
    },
    {
      evict: async (entry) => {
        await chrome.tabs.sendMessage(
          entry.tabId,
          {
            type: PROMPT_KEEPER_EVICT_MESSAGE_TYPE,
            payload: {
              pageInstanceId: entry.pageInstanceId,
              reason: "lru_limit"
            }
          },
          { frameId: entry.frameId }
        );
      }
    }
  );
}
