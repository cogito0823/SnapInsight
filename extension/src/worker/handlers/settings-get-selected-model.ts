import type { ReadSelectedModelResponse } from "../../shared/contracts/messages";
import { createExtensionError } from "../../shared/errors/error-codes";
import { settingsService } from "../settings/settings-service";

export async function handleSettingsGetSelectedModel(): Promise<ReadSelectedModelResponse> {
  try {
    const snapshot = await settingsService.getSettingsSnapshot();

    return {
      ok: true,
      data: {
        selectedModel: snapshot.selectedModel,
        lastKnownModels: snapshot.lastKnownModels,
        lastModelRefreshAt: snapshot.lastModelRefreshAt
      }
    };
  } catch {
    return {
      ok: false,
      error: createExtensionError(
        "request_failed",
        "Selected model could not be loaded.",
        true
      )
    };
  }
}
