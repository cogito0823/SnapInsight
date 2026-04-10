import type { HealthCheckData } from "../../shared/contracts/messages";
import { LocalServiceConflictError } from "./error-mapping";

const EXPECTED_SERVICE_NAME = "snapinsight-local-api";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function assertTrustedHealthPayload(
  payload: unknown
): asserts payload is HealthCheckData {
  if (!isObjectRecord(payload)) {
    throw new LocalServiceConflictError(
      "The fixed localhost port did not respond with the SnapInsight service."
    );
  }

  if (
    payload.status !== "ok" ||
    payload.service !== EXPECTED_SERVICE_NAME ||
    typeof payload.ollamaReachable !== "boolean"
  ) {
    throw new LocalServiceConflictError(
      "The fixed localhost port did not respond with the SnapInsight service."
    );
  }

  if (
    "version" in payload &&
    payload.version !== undefined &&
    payload.version !== "v1"
  ) {
    throw new LocalServiceConflictError(
      "The fixed localhost port did not respond with the SnapInsight service."
    );
  }
}
