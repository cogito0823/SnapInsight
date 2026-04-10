import type { ExtensionError } from "../../shared/errors/error-codes";
import { persistSelectedModel } from "./worker-client";

export interface SaveSelectedModelResult {
  ok: boolean;
  error: ExtensionError | null;
}

export async function saveSelectedModel(
  selectedModel: string
): Promise<SaveSelectedModelResult> {
  const response = await persistSelectedModel(selectedModel);

  if (!response.ok) {
    return {
      ok: false,
      error: response.error
    };
  }

  return {
    ok: true,
    error: null
  };
}

export function createUnexpectedSaveError(): ExtensionError {
  return {
    code: "request_failed",
    message: "The selected model could not be saved.",
    retryable: true
  };
}
