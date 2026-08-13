import { isPromptKeeperLifecycleMessage } from "../../shared/contracts/prompt-keeper";
import { createChromePromptKeeperCoordinator } from "../prompt-keeper/keeper-coordinator";
import { PROMPT_KEEPER_REGISTRY_KEY } from "../prompt-keeper/keeper-coordinator";

type ProductWorkerGlobal = typeof globalThis & {
  __snapinsightProductEntrypointsRegistered__?: boolean;
};

export function registerProductEntrypoints(): void {
  const workerGlobal = self as ProductWorkerGlobal;
  if (workerGlobal.__snapinsightProductEntrypointsRegistered__) {
    return;
  }

  const keeperCoordinator = createChromePromptKeeperCoordinator();

  chrome.runtime.onInstalled.addListener((details) => {
    void chrome.storage.session.remove(PROMPT_KEEPER_REGISTRY_KEY);
    if (details.reason === "install") {
      void chrome.runtime.openOptionsPage();
    }
  });
  chrome.action.onClicked.addListener(() => {
    void chrome.runtime.openOptionsPage();
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isPromptKeeperLifecycleMessage(message)) return;
    const tabId = sender.tab?.id;
    if (tabId === undefined) return;
    void keeperCoordinator
      .handle(message, {
        tabId,
        frameId: sender.frameId ?? 0
      })
      .then(
        () => sendResponse({ ok: true }),
        () => sendResponse({ ok: false })
      );
    return true;
  });
  chrome.tabs.onRemoved.addListener((tabId) => {
    void keeperCoordinator.removeTab(tabId);
  });

  workerGlobal.__snapinsightProductEntrypointsRegistered__ = true;
}
