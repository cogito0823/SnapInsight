import type { HealthCheckResponse } from "../../shared/contracts/messages";
import { fetchHealth } from "../local-api/health-client";
import { mapLocalApiError } from "../local-api/error-mapping";

export async function handleHealthCheck(): Promise<HealthCheckResponse> {
  try {
    const data = await fetchHealth();
    return {
      ok: true,
      data
    };
  } catch (error) {
    return {
      ok: false,
      error: mapLocalApiError(error, {
        requestFailedMessage: "Health check could not be completed.",
        timeoutMessage: "Health check could not be completed.",
        transportMessage: "The local service could not be reached."
      })
    };
  }
}
