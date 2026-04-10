export const EXTENSION_ERROR_CODES = [
  "service_unavailable",
  "local_service_conflict",
  "invalid_request",
  "no_models_available",
  "selected_model_unavailable",
  "request_failed",
  "request_cancelled"
] as const;

export type ExtensionErrorCode = (typeof EXTENSION_ERROR_CODES)[number];

export interface ExtensionError {
  code: ExtensionErrorCode;
  message: string;
  retryable: boolean;
}

export function createExtensionError(
  code: ExtensionErrorCode,
  message: string,
  retryable: boolean
): ExtensionError {
  return {
    code,
    message,
    retryable
  };
}
