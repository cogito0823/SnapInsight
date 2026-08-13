# RFC-006: Local Companion App Architecture

## Document Status

- Status: Draft
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/discovery/local-companion-app-mvp.md`
  - `docs/design/extension-and-local-service-design.md`
  - `docs/design/repository-and-code-structure.md`
  - `docs/rfcs/RFC-002-local-communication-and-security.md`
  - `docs/rfcs/RFC-003-python-service-and-ollama-integration.md`

## Context

SnapInsight currently works as a Chrome extension plus a local Python service plus local Ollama. This preserves the local-first privacy model, but it still requires developer-style setup steps such as creating a virtual environment and manually starting the service.

The next productization step should reduce startup friction while preserving the local inference boundary. The intended MVP should:

- remain fully local for explanation requests
- keep the current extension interaction model unchanged
- reuse the existing `server/` package rather than rewriting it
- target macOS first
- bundle Python runtime with the local shell
- continue relying on a separately installed local Ollama runtime

## Decision Drivers

- Preserve the local-first privacy boundary from the approved PRD
- Reduce installation and startup friction for non-developer users
- Reuse the current local API implementation as much as possible
- Keep the first productization step small enough to ship and validate
- Avoid taking ownership of local model runtime replacement in the same milestone

## Options

### Option A: Keep the current extension plus manually started service model

Description:
- Keep the existing architecture and improve only documentation and scripts.

Pros:
- Lowest immediate implementation effort
- No new runtime surface

Cons:
- User installation remains too developer-oriented
- Service startup and dependency diagnosis remain manual
- Productization progress is weak even if docs improve

### Option B: Add a local companion app that manages the existing Python service

Description:
- Introduce a local macOS companion app that bundles Python runtime, launches the existing SnapInsight local API as a managed subprocess, and reports local status such as service health, Ollama reachability, and model availability.

Pros:
- Preserves the local architecture and privacy model
- Reuses the existing `server/` API and runtime behavior
- Hides Python and service-startup complexity from users
- Creates a clear path toward installers and local-first distribution

Cons:
- Adds a second local product surface
- Requires packaging and process-management work
- Still leaves Ollama as an external dependency for the MVP

### Option C: Replace the current local HTTP service boundary with Native Messaging

Description:
- Move extension-to-local communication to a native host integration path rather than localhost HTTP.

Pros:
- Tighter extension-to-host boundary in theory

Cons:
- Higher installation and registration complexity
- Invalidates much of the current worker-local-API architecture
- Not necessary for the MVP productization step

## Tradeoffs

Option A does not solve the most important user-facing friction. Option C reopens a major architectural boundary that the current implementation deliberately avoided and would create a much larger migration.

Option B is the best fit for the current project state: it reduces user friction while preserving the accepted local architecture and the existing extension-to-local API contract. The product cost is a new companion-app runtime, but the companion app can stay small if it focuses on local process management and status visibility.

## Recommendation

Adopt Option B.

Specific architectural direction:

- Keep the extension plus service worker plus local HTTP service model.
- Add a new top-level `companion/` runtime for a macOS-only MVP.
- Package the companion app with a bundled Python runtime.
- Launch the existing `server/` implementation as a managed subprocess rather than rewriting the service.
- Continue to use local Ollama as an external dependency in the MVP.
- Use the companion app as the owner of:
  - local API process lifecycle
  - health polling and visible local status
  - Ollama reachability checks
  - model-availability checks
  - local log access affordances
- Do not move explanation generation, request contracts, or model validation ownership out of the existing `server/` and `extension/worker` layers in the MVP.

## Decision

The proposed post-v1 local productization direction for SnapInsight is:

1. Preserve the existing local-first extension plus local-API architecture.
2. Add a macOS-only companion app as the first productization layer.
3. Bundle Python runtime with the companion app.
4. Keep Ollama as an external local dependency in the MVP.
5. Manage the current FastAPI service as a companion-owned subprocess.

This RFC is currently in draft and should be reviewed before treating the companion architecture as the new formal long-term baseline.

## Operational Consequences

- The repository structure should grow a top-level `companion/` area.
- The high-level design should explicitly describe the companion app runtime and its boundaries.
- The current local-service API contract should remain stable so the extension does not need a parallel productization-only protocol.
- Packaging and trust-configuration responsibilities will need explicit documentation rather than remaining manual environment setup.
- If the project later wants to remove the Ollama dependency entirely or move to a different local runtime, that should be a follow-up RFC rather than an implicit extension of this one.

## Residual Risk

- The MVP still depends on users having Ollama installed locally.
- Bundling Python runtime and launching the managed subprocess is simpler than rewriting the service, but it still introduces macOS packaging complexity.
- A later production-ready release will likely need installer, update, and trust-pairing refinements beyond the MVP described here.
