export type InferenceProviderId = "ollama" | "chrome-prompt";

declare const __SNAPINSIGHT_INFERENCE_PROVIDER__: InferenceProviderId;

export const inferenceProvider: InferenceProviderId =
  typeof __SNAPINSIGHT_INFERENCE_PROVIDER__ === "string"
    ? __SNAPINSIGHT_INFERENCE_PROVIDER__
    : "ollama";

export const isChromePromptExperiment = inferenceProvider === "chrome-prompt";
