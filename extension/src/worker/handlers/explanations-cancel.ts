import type {
  ExplanationsCancelMessage,
  ExplanationsCancelResponse
} from "../../shared/contracts/messages";
import { createExtensionError } from "../../shared/errors/error-codes";

export async function handleExplanationsCancel(
  _message: ExplanationsCancelMessage
): Promise<ExplanationsCancelResponse> {
  return {
    ok: false,
    error: createExtensionError(
      "request_failed",
      'Worker handler for "explanations.cancel" is not implemented yet.',
      true
    )
  };
}
