import type {
  ExtensionSettings
} from "../../shared/state/request-types";
import type { ModelSummary } from "../../shared/models/model-summary";
import {
  readExtensionSettings,
  writeExtensionSettings
} from "./storage";

export class SettingsService {
  async getSelectedModel(): Promise<string | null> {
    const snapshot = await readExtensionSettings();
    return snapshot.selectedModel;
  }

  async getSettingsSnapshot(): Promise<ExtensionSettings> {
    return readExtensionSettings();
  }

  async setSelectedModelValidated(selectedModel: string): Promise<void> {
    await writeExtensionSettings({
      selectedModel
    });
  }

  async setLastKnownModels(
    models: ModelSummary[],
    refreshedAt: string
  ): Promise<void> {
    await writeExtensionSettings({
      lastKnownModels: models,
      lastModelRefreshAt: refreshedAt
    });
  }
}

export const settingsService = new SettingsService();
