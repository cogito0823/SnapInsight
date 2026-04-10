import type { HealthCheckData } from "../../shared/contracts/messages";
import { LocalApiProtocolError } from "./error-mapping";
import { requestJson } from "./http-client";
import { assertTrustedHealthPayload } from "./service-identity";

export async function fetchHealth(): Promise<HealthCheckData> {
  const response = await requestJson<unknown>("/health");

  if (response.status !== 200) {
    throw new LocalApiProtocolError("Health check returned an unexpected status.");
  }

  assertTrustedHealthPayload(response.data);
  return response.data;
}
