import {
  createExtensionError,
  type ExtensionError
} from "../../shared/errors/error-codes";

export class LocalApiTransportError extends Error {}

export class LocalApiTimeoutError extends Error {}

export class LocalApiProtocolError extends Error {}

export class LocalServiceConflictError extends Error {}

export interface LocalApiErrorMappingOptions {
  requestFailedMessage: string;
  timeoutMessage?: string;
  transportMessage?: string;
}

export function mapLocalApiError(
  error: unknown,
  options: LocalApiErrorMappingOptions
): ExtensionError {
  if (error instanceof LocalServiceConflictError) {
    return createExtensionError(
      "local_service_conflict",
      "The expected localhost port is occupied by a different service.",
      false
    );
  }

  if (error instanceof LocalApiTransportError) {
    return createExtensionError(
      "service_unavailable",
      options.transportMessage ?? "The local service could not be reached.",
      true
    );
  }

  if (error instanceof LocalApiTimeoutError) {
    return createExtensionError(
      "request_failed",
      options.timeoutMessage ?? options.requestFailedMessage,
      true
    );
  }

  return createExtensionError(
    "request_failed",
    options.requestFailedMessage,
    true
  );
}
