import type { PromptReadinessState } from "../../prompt-api/readiness";

export type OptionsPhase =
  | "checking"
  | "preparing"
  | PromptReadinessState
  | "error";

export interface OptionsState {
  phase: OptionsPhase;
  progress: number | null;
  progressStage: "downloading" | "installing" | null;
  progressScope: "overall" | "remaining" | null;
  errorMessage: string | null;
}

export function createInitialOptionsState(): OptionsState {
  return {
    phase: "checking",
    progress: null,
    progressStage: null,
    progressScope: null,
    errorMessage: null
  };
}

export function formatElapsedTime(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1_000));
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const twoDigits = (value: number): string => String(value).padStart(2, "0");

  return hours > 0
    ? `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`
    : `${twoDigits(totalMinutes)}:${twoDigits(seconds)}`;
}
