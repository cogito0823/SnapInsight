export const EXTENSION_ERROR_CODES = [
  "service_unavailable",
  "prompt_api_unavailable",
  "model_download_required",
  "model_downloading",
  "device_unsupported",
  "language_unsupported",
  "quota_exceeded",
  "invalid_request",
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
