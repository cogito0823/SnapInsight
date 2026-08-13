export interface PromptWarmupScheduler {
  schedule(): void;
  cancel(): void;
}

export function createPromptWarmupScheduler(
  warmUp: () => Promise<void>,
  delayMs: number = 300
): PromptWarmupScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = (): void => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };

  return {
    schedule() {
      cancel();
      timer = setTimeout(() => {
        timer = null;
        void warmUp();
      }, delayMs);
    },
    cancel
  };
}
