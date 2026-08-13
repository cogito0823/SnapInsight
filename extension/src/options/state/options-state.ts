import type { PromptReadinessState } from "../../prompt-api/readiness";

export type OptionsPhase =
  | "checking"
  | "preparing"
  | PromptReadinessState
  | "error";

export interface OptionsState {
  phase: OptionsPhase;
  progress: number | null;
  errorMessage: string | null;
}

export function createInitialOptionsState(): OptionsState {
  return {
    phase: "checking",
    progress: null,
    errorMessage: null
  };
}
