type ProductWorkerGlobal = typeof globalThis & {
  __snapinsightProductEntrypointsRegistered__?: boolean;
};

export function registerProductEntrypoints(): void {
  const workerGlobal = self as ProductWorkerGlobal;
  if (workerGlobal.__snapinsightProductEntrypointsRegistered__) {
    return;
  }

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      void chrome.runtime.openOptionsPage();
    }
  });
  chrome.action.onClicked.addListener(() => {
    void chrome.runtime.openOptionsPage();
  });

  workerGlobal.__snapinsightProductEntrypointsRegistered__ = true;
}
