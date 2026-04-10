# SnapInsight v1 Implementation Plan

## Document Status

- Status: Draft
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/design/extension-and-local-service-design.md`
  - `docs/design/repository-and-code-structure.md`
  - `docs/specs/api-spec.md`
  - `docs/specs/extension-state-spec.md`

## 1. Purpose

This document breaks the approved product and technical direction into an implementation sequence for SnapInsight v1.

It is intentionally execution-oriented:

- what should be built first
- what each phase should deliver
- what must be true before the next phase begins

This plan is not a project-management commitment. It is a technical delivery guide.

## 2. Planning Principles

- Build the smallest end-to-end slice early.
- Establish contract boundaries before polishing UI.
- Validate local-service and model-selection flows before streaming UX refinement.
- Leave low-priority `input` / `textarea` anchor-geometry edge cases deferred unless they block the main path.

## 3. Implementation Sequence Overview

Recommended phase order:

1. Repository scaffolding and shared contracts
2. Local Python service baseline
3. Extension service worker baseline
4. Options page and settings flow
5. Content script selection and card shell
6. Explanation streaming integration
7. Error handling and hardening
8. Packaging and manual verification

## 4. Phase Plan

### 4.1 Phase 1: Repository Scaffolding and Shared Contracts

Goals:

- create the repo directories defined in `docs/design/repository-and-code-structure.md`
- scaffold extension and server entrypoints
- define shared extension message and event contracts

Deliverables:

- extension folder scaffold
- server folder scaffold
- shared extension types for messages, events, error codes, and state

Exit criteria:

- all primary runtime entrypoints exist
- shared type files exist for `SenderContext`, request messages, stream events, and normalized error codes
- no major ambiguity remains about file placement

### 4.2 Phase 2: Local Python Service Baseline

Goals:

- implement `GET /health`
- implement `GET /v1/models`
- establish FastAPI app structure and Ollama adapter boundary

Deliverables:

- running FastAPI service on `127.0.0.1:11435`
- service identity response with `service = "snapinsight-local-api"`
- normalized model-list responses and failure handling

Exit criteria:

- extension-facing health contract matches `docs/specs/api-spec.md`
- wrong-service detection assumptions are testable
- model availability and dependency failure are distinguishable

### 4.3 Phase 3: Extension Service Worker Baseline

Goals:

- establish internal message handling in the worker
- implement local HTTP calls through the worker only
- persist settings in `chrome.storage.local`

Deliverables:

- worker handlers for `settings.get`
- worker handlers for `models.list`
- worker handler for `settings.setSelectedModel`
- error normalization for `service_unavailable`, `local_service_conflict`, `selected_model_unavailable`, and `request_failed`

Exit criteria:

- the options page can load the current selected model through the worker
- model selection writes are validated before persistence
- content scripts do not need direct localhost access

### 4.4 Phase 4: Options Page and Settings Flow

Goals:

- implement model selection UI
- surface model availability and validation failures

Deliverables:

- options page UI
- model list loading state
- save state and error presentation

Exit criteria:

- user can select a currently available model
- invalid or stale selections are rejected with the documented error contract
- the selected model survives browser restart

### 4.5 Phase 5: Content Script Selection and Card Shell

Goals:

- detect valid selections on supported pages
- render the trigger and card shell in a Shadow DOM root
- manage page-local state without streaming yet

Deliverables:

- selection validation with the documented `1-20` counting rule
- trigger visibility behavior
- card open and close behavior
- page-local state implementation aligned with `docs/specs/extension-state-spec.md`

Exit criteria:

- a valid selection can open a stable in-page card shell
- invalid selections never start explanation requests
- selection replacement resets stale page-local state

### 4.6 Phase 6: Explanation Streaming Integration

Goals:

- implement `explanations.start`
- implement worker stream forwarding and content-script event handling
- support separate short and detailed request states

Deliverables:

- stream startup flow
- internal `start`, `chunk`, `complete`, `error`, and cancellation event handling
- request routing keyed by `requestId` plus `senderContext`

Exit criteria:

- short explanation can stream into the card
- detailed explanation can stream without corrupting short explanation state
- stale events are ignored after page-instance changes

### 4.7 Phase 7: Error Handling and Hardening

Goals:

- verify deterministic failure mappings
- handle bridge loss and retryable failures
- clean up cancellation behavior

Deliverables:

- visible handling for service-unavailable and local-conflict conditions
- retryable failure handling for bridge loss
- silent user-driven cancellation behavior where appropriate

Exit criteria:

- setup-time failures follow the documented mapping table
- unexpected bridge loss becomes `request_failed`
- no known stale-stream routing issue remains in normal navigation flows

### 4.8 Phase 8: Packaging and Manual Verification

Goals:

- prepare the extension and local service for repeatable local use
- run a focused v1 manual test pass

Deliverables:

- local setup instructions
- build or run commands for extension and server
- manual verification checklist

Exit criteria:

- the author can install the extension locally and use the core flow end to end
- the local service can be started predictably
- core product acceptance flow is manually verified

## 5. Suggested Verification Checklist

Minimum manual checks:

- health endpoint returns the expected service identity
- model list loads when Ollama is available
- wrong-service identity is treated as `local_service_conflict`
- model selection persists only after validation
- selecting a valid term shows short explanation streaming
- expanding detail starts a separate detailed request lifecycle
- changing selection clears stale request state
- reloading the page prevents stale events from binding to the new page instance

## 6. Risks and Deferrals

Known deferrals:

- `input` / `textarea` anchor geometry edge cases
- richer visual polish
- broader page compatibility beyond the documented v1 scope

Known implementation risks:

- MV3 worker lifetime and stream bridge stability
- local environment differences around Ollama availability
- avoiding accidental coupling between runtime-specific modules

## 7. Suggested Next Execution Unit

If implementation starts immediately, the first practical coding batch should include:

1. repo scaffolding for `extension/` and `server/`
2. shared extension contract files
3. FastAPI health and models endpoints
4. service-worker handlers for settings and model loading

This batch creates the minimum cross-runtime skeleton needed before content-script UI work.

## 8. Change Record

- Initial implementation plan created after the core PRD, RFC, design, and API spec stack became stable enough to support coding.
