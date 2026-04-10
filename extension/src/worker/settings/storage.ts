import type { ExtensionSettings } from "../../shared/state/request-types";
import { STORAGE_KEYS } from "../../shared/state/request-types";

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

type StorageSnapshot = Partial<Record<StorageKey, unknown>>;

function getStorageArea(): chrome.storage.LocalStorageArea {
  return chrome.storage.local;
}

function storageGet(keys: StorageKey[]): Promise<StorageSnapshot> {
  return new Promise((resolve, reject) => {
    getStorageArea().get(keys, (items) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(items as StorageSnapshot);
    });
  });
}

function storageSet(items: StorageSnapshot): Promise<void> {
  return new Promise((resolve, reject) => {
    getStorageArea().set(items, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

export async function readExtensionSettings(): Promise<ExtensionSettings> {
  const snapshot = await storageGet([
    STORAGE_KEYS.selectedModel,
    STORAGE_KEYS.lastKnownModels,
    STORAGE_KEYS.lastModelRefreshAt
  ]);
  const rawSelectedModel = snapshot[STORAGE_KEYS.selectedModel];
  const rawLastKnownModels = snapshot[STORAGE_KEYS.lastKnownModels];
  const rawLastModelRefreshAt = snapshot[STORAGE_KEYS.lastModelRefreshAt];

  return {
    selectedModel:
      typeof rawSelectedModel === "string" ? rawSelectedModel : null,
    lastKnownModels: Array.isArray(rawLastKnownModels)
      ? (rawLastKnownModels as ExtensionSettings["lastKnownModels"])
      : [],
    lastModelRefreshAt:
      typeof rawLastModelRefreshAt === "string"
        ? rawLastModelRefreshAt
        : null
  };
}

export async function writeExtensionSettings(
  items: Partial<ExtensionSettings>
): Promise<void> {
  const storageSnapshot: StorageSnapshot = {};

  if ("selectedModel" in items) {
    storageSnapshot[STORAGE_KEYS.selectedModel] = items.selectedModel ?? null;
  }

  if ("lastKnownModels" in items) {
    storageSnapshot[STORAGE_KEYS.lastKnownModels] = items.lastKnownModels ?? [];
  }

  if ("lastModelRefreshAt" in items) {
    storageSnapshot[STORAGE_KEYS.lastModelRefreshAt] =
      items.lastModelRefreshAt ?? null;
  }

  await storageSet(storageSnapshot);
}
