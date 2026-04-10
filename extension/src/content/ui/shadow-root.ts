const HOST_ID = "snapinsight-content-root";

export interface ShadowRootHandle {
  host: HTMLDivElement;
  root: ShadowRoot;
}

export function ensureShadowRoot(): ShadowRootHandle {
  const existingHost = document.getElementById(HOST_ID);

  if (existingHost instanceof HTMLDivElement && existingHost.shadowRoot) {
    return {
      host: existingHost,
      root: existingHost.shadowRoot
    };
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.documentElement.appendChild(host);

  const root = host.attachShadow({ mode: "open" });

  return { host, root };
}
