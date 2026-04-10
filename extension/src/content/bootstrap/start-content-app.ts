const CONTENT_APP_MARKER = "data-snapinsight-content-app";

export function startContentApp(): void {
  if (document.documentElement.hasAttribute(CONTENT_APP_MARKER)) {
    return;
  }

  document.documentElement.setAttribute(CONTENT_APP_MARKER, "ready");
}
