import type { ModelsListResponse } from "../../shared/contracts/messages";
import { fetchModelCatalog } from "../local-api/models-client";
import { mapLocalApiError } from "../local-api/error-mapping";
import { settingsService } from "../settings/settings-service";

export async function handleModelsList(): Promise<ModelsListResponse> {
  try {
    const data = await fetchModelCatalog();

    await settingsService.setLastKnownModels(data.models, new Date().toISOString());

    return {
      ok: true,
      data
    };
  } catch (error) {
    return {
      ok: false,
      error: mapLocalApiError(error, {
        requestFailedMessage: "Model list could not be loaded.",
        timeoutMessage: "Model list could not be loaded.",
        transportMessage: "The local service could not be reached."
      })
    };
  }
}
