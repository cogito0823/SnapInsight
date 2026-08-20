import {
  getLanguageModelApi,
  type LanguageModelCreateCoreOptions,
  type LanguageModelAvailability
} from "./language-model";

const MODEL_PREPARATION_CAPABILITIES: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }]
};

export type PromptReadinessState =
  | "ready"
  | "downloadable"
  | "downloading"
  | "unsupported";

export interface PromptReadiness {
  state: PromptReadinessState;
  availability: LanguageModelAvailability | "missing";
}

export interface PromptPreparationProgress {
  percentage: number | null;
  stage: "downloading" | "installing";
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

  const availability = await languageModel.availability(
    MODEL_PREPARATION_CAPABILITIES
  );
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
  onProgress?: (progress: PromptPreparationProgress) => void;
}): Promise<void> {
  const languageModel = getLanguageModelApi();
  if (!languageModel) {
    throw new PromptPreparationError("api_missing");
  }

  const availability = await languageModel.availability(
    MODEL_PREPARATION_CAPABILITIES
  );
  if (availability === "unavailable") {
    throw new PromptPreparationError("device_unsupported");
  }

  try {
    const session = await languageModel.create({
      ...MODEL_PREPARATION_CAPABILITIES,
      signal: options?.signal,
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", (event) => {
          const progress = Math.min(1, Math.max(0, event.loaded));
          options?.onProgress?.({
            percentage:
              progress > 0 && progress < 1
                ? Math.min(99, Math.max(1, Math.round(progress * 100)))
                : null,
            stage: progress === 1 ? "installing" : "downloading"
          });
        });
      }
    });
    session.destroy();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw mapPreparationError(error);
  }
}
