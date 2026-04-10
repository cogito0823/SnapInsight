export type SelectionSource = "page" | "input" | "textarea";

export interface ReadSelectionResult {
  text: string;
  source: SelectionSource;
  range?: Range;
  element?: HTMLInputElement | HTMLTextAreaElement;
}

function isTextLikeInput(
  element: Element | null
): element is HTMLInputElement {
  return (
    element instanceof HTMLInputElement &&
    ["text", "search", "url", "tel", "email"].includes(element.type)
  );
}

function isTextarea(
  element: Element | null
): element is HTMLTextAreaElement {
  return element instanceof HTMLTextAreaElement;
}

function isInsideUnsupportedEditable(node: Node | null): boolean {
  const element =
    node instanceof Element ? node : node?.parentElement ?? null;

  return !!element?.closest(
    '[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"]'
  );
}

function readInputLikeSelection(
  element: HTMLInputElement | HTMLTextAreaElement
): ReadSelectionResult | null {
  const start = element.selectionStart;
  const end = element.selectionEnd;

  if (start === null || end === null || start === end) {
    return null;
  }

  return {
    text: element.value.slice(start, end),
    source: element instanceof HTMLTextAreaElement ? "textarea" : "input",
    element
  };
}

export function readSelection(): ReadSelectionResult | null {
  const activeElement = document.activeElement;

  if (isTextLikeInput(activeElement) || isTextarea(activeElement)) {
    return readInputLikeSelection(activeElement);
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const text = selection.toString();

  if (!text.trim()) {
    return null;
  }

  if (isInsideUnsupportedEditable(range.commonAncestorContainer)) {
    return null;
  }

  return {
    text,
    source: "page",
    range
  };
}
