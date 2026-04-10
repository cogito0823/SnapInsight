# Local Companion App MVP Questions

## Document Status

- Status: Draft
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/design/extension-and-local-service-design.md`
  - `docs/design/repository-and-code-structure.md`
  - `docs/discovery/post-batch-8-next-phase-candidates.md`

## Purpose

This discovery document clarifies the minimum productization direction for a local-first SnapInsight release that remains fully local for inference.

The goal is to make installation and startup significantly easier for non-developer users without changing the core privacy model or moving explanation requests to a hosted service.

## 1. Should SnapInsight keep the current local-first runtime model?

Options:
- Replace the local architecture with a hosted API
- Keep the extension plus local service architecture, but improve only documentation
- Keep the extension plus local service architecture and add a productized local companion app

Preliminary recommendation:
- Keep the local-first architecture.
- Add a local companion app that manages the existing local service and hides Python-service startup complexity from the user.

Reasoning:
- The PRD explicitly values keeping selected text on the local machine.
- The current extension and Python service already work well enough to justify reuse.
- The largest adoption gap is installation and startup friction, not the core explanation interaction.

## 2. What should the first companion app platform scope be?

Options:
- macOS only for the MVP
- macOS first but fully cross-platform from day one
- macOS and Windows at the same time

Preliminary recommendation:
- Build the first MVP for macOS only.

Reasoning:
- The current active development environment is macOS.
- Packaging, process management, and tray or menu-bar behavior are all easier to control when one platform is targeted first.
- A smaller scope lowers the risk of turning the MVP into a packaging project before the core local-productization path is proven.

## 3. What should the companion app bundle and what should remain external?

Options:
- Bundle both Python runtime and model runtime
- Bundle Python runtime but keep Ollama as an external local dependency
- Keep both Python and Ollama external in the first MVP

Preliminary recommendation:
- Bundle the Python runtime and the SnapInsight local service.
- Keep Ollama external for the MVP and detect or guide it rather than re-implementing local model runtime management immediately.

Reasoning:
- Removing the Python and virtualenv requirement materially simplifies installation.
- Replacing Ollama in the same milestone would expand scope too far into model-runtime ownership, download management, and hardware compatibility.
- The current server code can be reused directly if Python is bundled with the companion app.

## 4. What should the companion app own in the MVP?

Options:
- Only a process launcher shell
- A menu-bar or tray app with process control and local status
- A larger desktop application with rich settings and onboarding UI

Preliminary recommendation:
- Use a menu-bar style macOS companion app with lightweight status and control.

Reasoning:
- The MVP needs to prove that local startup can be reliable and user-visible without introducing a large second application surface.
- The app should primarily manage the local API lifecycle and environment status rather than becoming a full second product UI.

Minimum responsibilities:
- start and stop the existing SnapInsight local API
- monitor whether the local API is healthy
- check whether Ollama is reachable
- check whether at least one model is available
- expose lightweight status text and log access

## 5. How should the companion app integrate with the current server implementation?

Options:
- Rebuild the current server inside a different desktop runtime
- Launch the existing Python service as a managed subprocess
- Merge all service code directly into the desktop-shell process

Preliminary recommendation:
- Launch the existing Python service as a managed subprocess in the MVP.

Reasoning:
- The current `server/` package already exposes a script entrypoint and stable API behavior.
- Reusing the service reduces risk and keeps the companion app focused on local productization rather than service reimplementation.
- A managed subprocess keeps future replacement options open if a later version needs tighter embedding.

## 6. What should the companion app explicitly not do in the MVP?

Preliminary recommendation:
- Do not replace Ollama
- Do not introduce cloud fallback
- Do not add account systems
- Do not add full settings parity with the extension options page
- Do not make cross-platform packaging a day-one requirement
- Do not rewrite the current FastAPI service behavior unless packaging constraints force a small change

## 7. Working MVP Recommendation

Recommended MVP:

- add a new top-level `companion/` workspace
- implement a macOS-only menu-bar app
- bundle Python runtime and the current SnapInsight local service
- keep Ollama as an external dependency
- manage the current `server/` code as a subprocess
- surface health, Ollama reachability, model availability, and log access

## 8. Open Questions

- What is the preferred packaging tool for a macOS Python-based menu-bar app in this project?
- Should the first MVP auto-start the local API on app launch, or require an explicit click?
- Should extension trust configuration stay explicit in the MVP, or should the companion app begin owning a first-run pairing flow?
- What level of in-app onboarding is enough before this stops being a “minimal local shell” and becomes a larger desktop product?
