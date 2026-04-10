# SnapInsight Options Page and Settings Surface Implementation Design

## Document Status

- Status: Approved
- Project-Owner Sign-Off: Completed
- Related Documents:
  - `docs/design/extension-and-local-service-design.md`
  - `docs/design/repository-and-code-structure.md`
  - `docs/specs/api-spec.md`
  - `docs/specs/extension-state-spec.md`
  - `docs/plans/implementation-plan.md`

## 1. Purpose

This document provides implementation-level design guidance for the SnapInsight options page and its validated settings flows.

It translates the approved product, design, repository-structure, and spec decisions into code-level guidance for:

- options-page bootstrap and module layout
- worker-backed settings reads and writes
- model-list loading and stale-cache diagnostics
- loading, save, and retryable failure presentation

This document does not redefine public contracts or selected-model validation rules. It explains how the options-page runtime should be structured in code.

## 2. Scope

In scope:

- options-page entrypoint and bootstrap wiring
- options-page local view state
- worker-backed reads for selected model and model list
- worker-backed selected-model update flow
- settings-surface rendering for loading, save failure, and stale-cache diagnostics

Out of scope:

- content-script card rendering and in-page picker behavior
- service-worker HTTP and storage implementation details
- local Python service internals

## 3. Design Goals

- Keep the options page as the long-lived settings surface for model configuration.
- Reuse the same validated worker-backed persistence path used elsewhere.
- Keep options-page view state local to `src/options/` rather than leaking into shared modules.
- Preserve the distinction between live authoritative model data and diagnostic stale-cache hints.
- Make loading and save-failure behavior deterministic and easy to verify.

## 4. Suggested File Layout

Recommended initial file layout:

```text
extension/
  src/
    options/
      index.ts
      bootstrap/start-options-app.ts
      state/options-state.ts
      state/reducer.ts
      state/actions.ts
      actions/load-settings.ts
      actions/save-selected-model.ts
      components/options-page.ts
      components/model-select.ts
      components/status-banner.ts
      components/stale-cache-note.ts
```

These paths are recommendations. The key requirement is to keep bootstrap, local view state, worker-backed actions, and UI composition separate.

## 5. Ownership Boundaries

### 5.1 Options Page Responsibilities

The options page owns:

- rendering the persistent model-selection UI
- loading the current selected model and live model list through worker message contracts
- keeping local draft, loading, and save-error view state
- showing stale-cache diagnostics when live model loading fails
- calling `settings.setSelectedModel` for persistence

### 5.2 Options Page Non-Responsibilities

The options page must not own:

- direct writes to `chrome.storage.local`
- direct localhost HTTP calls
- live model validation logic outside the worker contract
- card-local `activeModel` ownership for in-page interactions

### 5.3 State Boundary Rule

The options page owns only its runtime-local view state.

`extension/src/shared/` may define reusable serializable types, but it must not own:

- options-page reducer logic
- options-page loading or save transitions
- worker-side storage adapters

## 6. Options Submodule Design

### 6.1 Bootstrap Layer

`options/index.ts` and bootstrap files should:

- mount the options-page app
- trigger initial worker-backed loading for selected model and model list
- keep startup wiring separate from rendering details

### 6.2 State Layer

The options page should keep a local view model with at least:

- `selectedModelDraft`
- `availableModels`
- `loadingPhase`
- `saveError`
- `lastKnownModels`
- `lastModelRefreshAt`

Recommended `loadingPhase` values:

- `idle`
- `loading`
- `ready`
- `error`

Rules:

- `selectedModelDraft` initializes from persisted `settings.selectedModel`
- `availableModels` should come from live `models.list` responses when available
- `lastKnownModels` and `lastModelRefreshAt` are diagnostic-only convenience data
- save failure must not silently mutate persisted selection state in the UI

### 6.3 Actions Layer

Recommended actions:

- `loadSettingsSurface()`
- `refreshModels()`
- `saveSelectedModel(selectedModel)`

The actions layer should:

- call `settings.getSelectedModel` for persisted selection display
- read stale-cache diagnostics through the same worker-backed settings read path rather than directly from `chrome.storage.local`
- call `models.list` for authoritative live model availability
- call `settings.setSelectedModel` for validated persistence
- keep message-contract usage centralized rather than scattered across components

### 6.4 Components Layer

The UI layer should render:

- selected-model dropdown
- loading indicators
- save and retryable error states
- stale-cache diagnostics when live model loading fails

Rules:

- the options page remains the primary persistent settings surface
- stale-cache diagnostics may inform the user, but must not authorize a selected-model write
- save failure should preserve the local draft so the user can retry or change selection
- options-page rendering must not assume that an already open in-page card will adopt its new selection immediately

## 7. Core Settings Flows

### 7.1 Initial Load

Recommended flow:

1. start in `loading`
2. request `settings.getSelectedModel`
3. request `models.list`
4. if live models load successfully, render authoritative selectable options
5. if live model loading fails, keep the persisted selected-model view where useful and show stale-cache diagnostics if present

Rules:

- `settings.getSelectedModel` is a convenience read and does not validate current availability by itself
- the same worker-backed read may also supply `lastKnownModels` and `lastModelRefreshAt` as diagnostic snapshot fields for the settings surface
- `models.list` remains the authoritative source of current selectable models
- `models.list` returning `ok: true` with `data.state = "no_models_available"` is a valid blocked settings state, not a transport failure

### 7.2 Save Selected Model

Recommended flow:

1. user updates the dropdown
2. options page stores the local draft
3. options page calls `settings.setSelectedModel`
4. on success, clear `saveError` and keep the new selection as the persisted state
5. on failure, preserve the draft and show the normalized error state

Failure handling:

- `selected_model_unavailable` means the user must choose a currently available model again
- `service_unavailable` means the local service could not be reached during validation
- `local_service_conflict` means the fixed localhost port belongs to another service
- `request_failed` means validation or catalog loading failed for another retryable reason

### 7.3 Live Data Versus Stale Diagnostics

Rules:

- `availableModels` used for an actual save attempt should come only from a successful live `models.list` response
- `settings.lastKnownModels` and `settings.lastModelRefreshAt` may be shown when live loading fails
- options-page code should obtain those diagnostics through the worker-backed read contract rather than directly from `chrome.storage.local`
- stale-cache diagnostics are for messaging only and must not be treated as an authoritative writable catalog

## 8. Card-Isolation Rule

The options page updates the global persisted selected model, but it does not own already-open in-page card interactions.

Rules:

- global selected-model changes initiated from the options page must apply to newly created interactions
- the options page must not assume that an already open card will silently replace its card-scoped `activeModel`
- same-card effective-model stability remains governed by the content-script and worker contracts

## 9. Privacy and Logging Guidance

The options page should follow the same privacy posture as the rest of the extension.

Rules:

- the options page must not persist selected page text or explanation output
- routine UI logging should not include selected text, explanation content, or raw worker payloads unnecessarily
- temporary debug logging, if added during development, should be opt-in and disabled by default

## 10. Default Implementation Decisions

Unless a later document changes the direction, prefer the following defaults:

- one local options-page state container
- one actions layer that wraps worker message contracts
- one reusable status-banner style for loading and normalized error presentation
- one stale-cache note component that stays clearly non-authoritative

## 11. Implementation Order Inside This Area

Recommended order:

1. scaffold the options-page entrypoint and bootstrap
2. implement the local view-state container
3. implement worker-backed load actions
4. render the selected-model UI and loading states
5. implement worker-backed save flow
6. add stale-cache diagnostics and retry behavior

## 12. Verification Guidance

Minimum focused checks for this implementation area:

- the options page loads selected-model state through the worker
- the options page loads live models through the worker
- saving a model always goes through `settings.setSelectedModel`
- stale-cache diagnostics never authorize a selected-model write
- `no_models_available` renders as a blocked settings state rather than a transport failure
- save failures preserve local draft state and expose normalized retryable or blocked outcomes
- changing the global selected model does not imply that an already open in-page card silently mutates its `activeModel`

## 13. Change Record

- Initial implementation-level design for the options-page settings surface.
- Added explicit guidance for worker-backed loading and persistence, stale-cache diagnostics, card-local model isolation, and options-page privacy/logging behavior.
- Marked the document `Approved` after project-owner sign-off confirmed it as the execution baseline for the Phase 5 settings surface.
