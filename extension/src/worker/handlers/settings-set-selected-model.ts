import type {
  SettingsSetSelectedModelMessage,
  SettingsSetSelectedModelResponse
} from "../../shared/contracts/messages";
import { createExtensionError } from "../../shared/errors/error-codes";
import { fetchModelCatalog } from "../local-api/models-client";
import { mapLocalApiError } from "../local-api/error-mapping";
import { settingsService } from "../settings/settings-service";

export async function handleSettingsSetSelectedModel(
  message: SettingsSetSelectedModelMessage
): Promise<SettingsSetSelectedModelResponse> {
  const selectedModel = message.payload.selectedModel.trim();

  if (!selectedModel) {
    return {
      ok: false,
      error: createExtensionError(
        "invalid_request",
        "A model id is required.",
        false
      )
    };
  }

  try {
    const catalog = await fetchModelCatalog();

    await settingsService.setLastKnownModels(
      catalog.models,
      new Date().toISOString()
    );

    const isAvailable =
      catalog.state === "ready" &&
      catalog.models.some(
        (model) => model.id === selectedModel && model.available
      );

    if (!isAvailable) {
      return {
        ok: false,
        error: createExtensionError(
          "selected_model_unavailable",
          "The selected model is no longer available.",
          false
        )
      };
    }

    await settingsService.setSelectedModelValidated(selectedModel);

    return {
      ok: true,
      data: {}
    };
  } catch (error) {
    return {
      ok: false,
      error: mapLocalApiError(error, {
        requestFailedMessage: "The selected model could not be validated.",
        timeoutMessage: "The selected model could not be validated.",
        transportMessage: "The local service could not be reached."
      })
    };
  }
}
