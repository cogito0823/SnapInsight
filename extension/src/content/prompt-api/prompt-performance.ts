import type { SelectionMode } from "../../shared/state/request-types";

export type PromptPerformancePhase =
  | "availability"
  | "template_create"
  | "clone"
  | "fallback_create"
  | "acquire"
  | "first_token"
  | "visible_wait"
  | "complete";

export type PromptIdleAgeBucket =
  | "unknown"
  | "under_1m"
  | "1m_to_4m"
  | "4m_to_10m"
  | "over_10m";

export interface PromptPerformanceEvent {
  phase: PromptPerformancePhase;
  durationMs: number;
  path?: "cold" | "warm" | "fallback";
  mode?: SelectionMode;
  prewarmed?: boolean;
  cacheHit?: boolean;
  idleAgeBucket?: PromptIdleAgeBucket;
  outcome: "success" | "error" | "cancelled" | "timeout";
}

export type PromptPerformanceSink = (event: PromptPerformanceEvent) => void;

type PromptDebugGlobal = typeof globalThis & {
  __snapinsightPromptPerformanceDebug__?: boolean;
};

const defaultSink: PromptPerformanceSink = (event) => {
  if (!(globalThis as PromptDebugGlobal).__snapinsightPromptPerformanceDebug__) {
    return;
  }

  // The payload deliberately contains no text, prompt, output, URL, or identity.
  console.debug("[SnapInsight prompt performance]", JSON.stringify(event));
};

let sink: PromptPerformanceSink = defaultSink;

export function emitPromptPerformance(event: PromptPerformanceEvent): void {
  sink({
    ...event,
    durationMs: Math.max(0, Math.round(event.durationMs * 10) / 10)
  });
}

export function setPromptPerformanceSink(
  nextSink: PromptPerformanceSink | null
): void {
  sink = nextSink ?? defaultSink;
}
