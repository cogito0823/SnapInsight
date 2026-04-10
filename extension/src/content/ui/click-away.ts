export function isModelPickerVisible(root: ShadowRoot): boolean {
  if (typeof root.getElementById !== "function") {
    return false;
  }

  return root.getElementById("snapinsight-model-select") !== null;
}

export function shouldIgnoreCardClickAway(
  event: MouseEvent,
  host: HTMLElement,
  root: ShadowRoot,
  isModelPickerInteracting: boolean
): boolean {
  if (event.composedPath().includes(host)) {
    return true;
  }

  if (isModelPickerInteracting) {
    return true;
  }

  if (isModelPickerVisible(root)) {
    return true;
  }

  return false;
}
