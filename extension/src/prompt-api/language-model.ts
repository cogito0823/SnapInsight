export type LanguageModelAvailability =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable";

export interface LanguageModelDownloadProgressEvent extends Event {
  loaded: number;
}

export interface LanguageModelMonitor {
  addEventListener(
    type: "downloadprogress",
    listener: (event: LanguageModelDownloadProgressEvent) => void
  ): void;
}

export interface LanguageModelSession {
  prompt(
    input: string,
    options?: { signal?: AbortSignal }
  ): Promise<string>;
  promptStreaming(
    input: string,
    options?: { signal?: AbortSignal }
  ): ReadableStream<string>;
  clone?(options?: { signal?: AbortSignal }): Promise<LanguageModelSession>;
  destroy(): void;
}

export interface LanguageModelApi {
  availability(): Promise<LanguageModelAvailability>;
  create(options?: {
    signal?: AbortSignal;
    initialPrompts?: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }>;
    monitor?: (monitor: LanguageModelMonitor) => void;
  }): Promise<LanguageModelSession>;
}

declare global {
  var LanguageModel: LanguageModelApi | undefined;
}

export function getLanguageModelApi(): LanguageModelApi | null {
  return globalThis.LanguageModel ?? null;
}
