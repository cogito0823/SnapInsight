import {
  getLanguageModelApi,
  type LanguageModelAvailability
} from "./language-model";

export type PromptReadinessState =
  | "ready"
  | "downloadable"
  | "downloading"
  | "unsupported";

export interface PromptReadiness {
  state: PromptReadinessState;
  availability: LanguageModelAvailability | "missing";
}

export class PromptPreparationError extends Error {
  constructor(
    public readonly reason:
      | "api_missing"
      | "device_unsupported"
      | "download_failed"
      | "language_unsupported"
      | "quota_exceeded"
  ) {
    super(reason);
    this.name = "PromptPreparationError";
  }
}

export async function readPromptReadiness(): Promise<PromptReadiness> {
  const languageModel = getLanguageModelApi();
  if (!languageModel) {
    return { state: "unsupported", availability: "missing" };
  }

  const availability = await languageModel.availability();
  switch (availability) {
    case "available":
      return { state: "ready", availability };
    case "downloadable":
      return { state: "downloadable", availability };
    case "downloading":
      return { state: "downloading", availability };
    case "unavailable":
    default:
      return { state: "unsupported", availability };
  }
}

function mapPreparationError(error: unknown): PromptPreparationError {
  if (error instanceof DOMException) {
    if (error.name === "NotSupportedError") {
      return new PromptPreparationError("language_unsupported");
    }
    if (error.name === "QuotaExceededError") {
      return new PromptPreparationError("quota_exceeded");
    }
  }

  return new PromptPreparationError("download_failed");
}

export async function preparePromptModel(options?: {
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}): Promise<void> {
  const languageModel = getLanguageModelApi();
  if (!languageModel) {
    throw new PromptPreparationError("api_missing");
  }

  const availability = await languageModel.availability();
  if (availability === "unavailable") {
    throw new PromptPreparationError("device_unsupported");
  }

  try {
    const session = await languageModel.create({
      signal: options?.signal,
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", (event) => {
          options?.onProgress?.(
            Math.min(100, Math.max(0, Math.round(event.loaded * 100)))
          );
        });
      }
    });
    session.destroy();
    options?.onProgress?.(100);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw mapPreparationError(error);
  }
}
