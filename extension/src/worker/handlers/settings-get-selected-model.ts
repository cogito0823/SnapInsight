import type { ReadSelectedModelResponse } from "../../shared/contracts/messages";
import { createExtensionError } from "../../shared/errors/error-codes";
import { settingsService } from "../settings/settings-service";

export async function handleSettingsGetSelectedModel(): Promise<ReadSelectedModelResponse> {
  try {
    const selectedModel = await settingsService.getSelectedModel();

    return {
      ok: true,
      data: {
        selectedModel
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
