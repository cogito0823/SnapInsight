export function shouldIgnoreCardClickAway(
  event: MouseEvent,
  host: HTMLElement
): boolean {
  return event.composedPath().includes(host);
}
