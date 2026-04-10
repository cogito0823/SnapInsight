export function createPageInstanceId(): string {
  return `doc-${crypto.randomUUID().slice(0, 8)}`;
}

export function bindPageInstanceNavigation(
  onDocumentInstanceChange: () => void
): () => void {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  const handleChange = (): void => {
    onDocumentInstanceChange();
  };

  history.pushState = function pushState(...args) {
    originalPushState.apply(this, args);
    handleChange();
  };

  history.replaceState = function replaceState(...args) {
    originalReplaceState.apply(this, args);
    handleChange();
  };

  window.addEventListener("popstate", handleChange);
  window.addEventListener("hashchange", handleChange);

  return () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener("popstate", handleChange);
    window.removeEventListener("hashchange", handleChange);
  };
}
