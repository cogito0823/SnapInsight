import type {
  ExplanationsStartMessage,
  ExplanationsStartResponse
} from "../../shared/contracts/messages";
import { createExtensionError } from "../../shared/errors/error-codes";

export async function handleExplanationsStart(
  _message: ExplanationsStartMessage
): Promise<ExplanationsStartResponse> {
  return {
    ok: false,
    error: createExtensionError(
      "request_failed",
      'Worker handler for "explanations.start" is not implemented yet.',
      true
    )
  };
}
