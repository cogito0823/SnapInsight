# SnapInsight Implementation Checklist

## Document Status

- Status: Draft
- Related Documents:
  - `docs/plans/implementation-plan.md`
  - `docs/plans/project-progress.md`
  - `docs/design/implementation-design/worker-settings-and-local-api-implementation-design.md`
- `docs/design/implementation-design/options-page-and-settings-surface-implementation-design.md`
  - `docs/design/implementation-design/content-script-interaction-implementation-design.md`
  - `docs/design/implementation-design/server-streaming-and-orchestration-implementation-design.md`

## 1. Purpose

This document turns the implementation plan into a checklist that can be used during execution.

It is intended for:

- tracking batch-level completion
- recording whether verification has been performed
- recording whether document-alignment review has been performed

This document should be updated during implementation rather than treated as a static note.

## 2. Batch Checklist

### Batch 0: Contract Readiness

- [x] Read current PRD, design, repository-structure design, API spec, and state spec together
- [x] Confirm no blocking contradiction exists for scaffold work
- [x] Record a short batch-0 review note
- [x] Update `docs/plans/project-progress.md`

### Batch 1: Scaffold and Shared Boundary

- [x] Scaffold `extension/` and `server/`
- [x] Create runtime entrypoints for content, worker, options, and server
- [x] Create shared message, event, error, and routing contracts
- [x] Keep runtime-owned state out of shared modules
- [x] Verify resulting repository structure matches the approved design closely enough
- [x] Perform phase alignment review for scaffold and shared-boundary work
- [x] Update `docs/plans/project-progress.md`

### Batch 2: Local Service Foundation

- [x] Stand up the FastAPI app on `127.0.0.1:11435`
- [x] Implement `GET /health`
- [x] Implement `GET /v1/models`
- [x] Implement origin validation support
- [x] Establish the Ollama adapter boundary
- [x] Verify `GET /health` returns the expected service identity
- [x] Verify `GET /v1/models` distinguishes ready and no-models conditions
- [x] Perform phase alignment review for the server baseline
- [x] Update `docs/plans/project-progress.md`

### Batch 3: Worker HTTP and Validated Persistence

- [x] Implement worker handlers for `health.check`
- [x] Implement worker handlers for `models.list`
- [x] Implement worker handlers for `settings.getSelectedModel`
- [x] Implement worker handlers for selected-model validation and persistence
- [x] Persist selected model only after live validation
- [x] Persist model cache and last refresh time only as non-authoritative diagnostics
- [x] Verify content script still has no direct localhost access path
- [x] Verify wrong-service identity maps to `local_service_conflict`
- [x] Verify timeout outcomes normalize to retryable `request_failed`
- [x] Perform phase alignment review for worker HTTP and settings ownership
- [x] Update `docs/plans/project-progress.md`

### Batch 4: Settings Surface

- [x] Build the options page entrypoint and basic UI
- [x] Load selected model and models list through the worker
- [x] Save selected model through `settings.setSelectedModel`
- [x] Surface stable loading and save-failure states
- [x] Render stale-cache diagnostics only as convenience information when live loading fails
- [x] Verify valid selected model persists across browser restart
- [x] Verify stale selections are rejected with `selected_model_unavailable`
- [x] Verify stale-cache diagnostics never authorize a selected-model write
- [x] Perform phase alignment review for options-page settings behavior
- [x] Update `docs/plans/project-progress.md`

### Batch 5: In-Page Shell and Selection Snapshot

- [x] Implement selection readers for ordinary page text and `input` or `textarea`
- [x] Implement pure counting and validation helpers for the `1-20` rule
- [x] Implement anchor computation
- [x] Implement page-local state container
- [x] Implement Shadow DOM root, trigger, and card shell
- [x] Implement click-away, close, replacement, and reload reset behavior
- [x] Verify valid selections show the trigger and invalid selections do not
- [x] Verify accepted card snapshot survives loss of native highlight
- [x] Verify reload creates a new `pageInstanceId`
- [x] Perform phase alignment review for content-script snapshot behavior
- [x] Update `docs/plans/project-progress.md`

### Batch 6: Short Explanation End-to-End

- [x] Implement `POST /v1/explanations/stream`
- [x] Implement worker-side explanation startup path
- [x] Implement stream forwarding from worker to content script
- [x] Implement short-request state transitions in the content script
- [x] Render short explanation loading, streaming, completion, and error behavior
- [x] Render blocked setup states in the card
- [x] Render the lightweight in-page model picker only for missing or invalid model selection cases
- [x] Verify short explanation streams progressively into the card
- [x] Verify startup failures map deterministically to documented public codes
- [x] Verify short explanation output remains concise and Chinese-first where appropriate
- [x] Perform phase alignment review for short explanation flow
- [x] Update `docs/plans/project-progress.md`

### Batch 7: Detailed Explanation and Coordination Rules

- [x] Implement the `查看更多` action
- [x] Gate detailed explanation on visible short content
- [x] Keep short and detail request state independent
- [x] Reuse the same accepted snapshot and effective model for detail
- [x] Deduplicate repeated detail triggers
- [x] Implement detail retry replacement
- [x] Verify detail cannot start before visible short content exists
- [x] Verify repeated detail triggers do not create parallel detail requests
- [x] Verify detail failure does not erase visible short content
- [x] Verify detailed explanation prioritizes fuller definition, background, usage scenarios, and examples
- [x] Perform phase alignment review for detailed explanation flow
- [x] Update `docs/plans/project-progress.md`

### Batch 8: Hardening and Release Readiness

- [x] Add only the tests that materially protect contract, state, and core flow behavior
- [x] Document local setup and run instructions
- [x] Run the final manual verification checklist
- [x] Run the final document alignment review checklist
- [x] Record remaining controlled deferrals explicitly
- [x] Update `docs/plans/project-progress.md`

## 3. Final Verification Checklist

### Core User Flow

- [x] Valid `1-20` selection shows the trigger near the selection
- [x] Invalid or oversized selection does not show the trigger
- [x] Card opens from hover and remains visible until explicit close or click-away
- [x] Ordinary page text and `input` or `textarea` work within v1 scope
- [x] Short explanation shows loading and progressive streaming output
- [x] Short explanation remains concise and Chinese-first where appropriate
- [x] Detailed explanation opens inside the same card
- [x] Detailed explanation remains blocked until short explanation content is visibly present
- [x] Detailed explanation prioritizes fuller definition, background, usage scenarios, and examples
- [x] Detailed explanation failure affects only the detail area and preserves short content
- [x] Selecting new text replaces the old interaction without stale content leakage

### Settings and Models

- [x] First use requires explicit model selection
- [x] Options page loads current settings through the worker
- [x] `settings.getSelectedModel` works as a read-only convenience contract
- [x] Valid selected model persists across browser restart
- [x] Stale selected model is rejected with `selected_model_unavailable`
- [x] No-models state is distinct from service-unavailable state
- [x] In-page picker appears only when model selection is missing or invalid
- [x] In-page picker and options page share the same validated persistence path
- [x] Stale cached models and last refresh time remain diagnostic-only

### Local Service and Contract

- [x] `GET /health` returns the expected service identity
- [x] Wrong-service identity is treated as `local_service_conflict`
- [x] `GET /v1/models` returns documented success and no-models shapes
- [x] Streaming endpoint follows the documented event schema
- [x] Streaming endpoint uses `application/x-ndjson`
- [x] Invalid payloads fail before stream establishment with the documented HTTP boundary
- [x] Disallowed extension origins are rejected according to the documented contract
- [x] Post-start failures become terminal stream `error` events rather than changed HTTP status
- [x] Event routing uses both `requestId` and `senderContext`

### State and Persistence

- [x] Page-local state matches the documented ownership and reset rules
- [x] Reload or same-tab navigation generates a new `pageInstanceId`
- [x] Loss of native browser highlight alone does not reset an open card
- [x] Selected text is never persisted
- [x] Explanation output is never persisted
- [x] Sender context, geometry, request ids, and per-request error state are never persisted
- [x] Cached model data is not treated as authoritative for validation

### Failure and Recovery

- [x] Startup failures follow the documented deterministic mapping
- [x] Bridge loss becomes retryable `request_failed`
- [x] Worker-owned local-service request timeouts become retryable `request_failed`
- [x] Explicit cancellation, if surfaced, uses `request_cancelled`
- [x] Silent user-driven cancellation does not require a visible terminal error
- [x] Partial streamed text remains visible after an in-stream terminal error

## 4. Final Document Alignment Review

### PRD Alignment

- [x] Interaction remains within approved PRD scope and acceptance criteria
- [x] Privacy requirements remain satisfied

### Design Alignment

- [x] Runtime ownership still matches content script, worker, options page, and local service responsibilities
- [x] Blocked setup states remain in the card interaction
- [x] In-page picker remains an escape hatch rather than a second persistent settings surface
- [x] Same-card snapshot and effective-model ownership rules remain intact

### Repository-Structure Alignment

- [x] File placement follows the approved repository and module-boundary guidance
- [x] No accidental direct dependency exists from content modules into worker implementation modules
- [x] Shared modules hold contracts and reusable serializable types rather than runtime-owned state logic

### API-Spec Alignment

- [x] Local HTTP endpoints, payloads, and error behavior still match the API spec
- [x] Stream event ordering and terminal-event rules are preserved
- [x] NDJSON content type, pre-stream failure boundary, and origin-rejection behavior are preserved
- [x] Internal message contracts remain aligned across extension runtimes
- [x] Public error codes remain unchanged unless documents are updated first

### State-Spec Alignment

- [x] Page-local state fields match the documented shape
- [x] Request lifecycle transitions match the documented rules
- [x] Storage keys and persistence rules match documented constraints
- [x] Stale cache remains diagnostic-only
- [x] `settings.getSelectedModel` remains a convenience read contract rather than an authoritative startup prerequisite
- [x] Options-page behavior still respects worker-backed persistence and card-local active-model isolation

## 5. Change Log

- Initial implementation checklist created from the current implementation plan and implementation-level design documents.
- Added the dedicated options-page implementation-level design document to the related-document set so Batch 4 settings-surface work has an explicit implementation guide.
- Batch 8 started with focused release-readiness work: added worker regression coverage for bridge-loss and startup-time timeout normalization, documented local setup and run instructions in `README.md`, and began checking off final verification items backed by automated evidence.
- Batch 8 manual verification and final alignment review were executed. The review found one remaining release-blocking runtime question around strict extension-origin validation in a real loaded-browser environment, recorded in `docs/discovery/extension-origin-validation-runtime-question.md`.
- Batch 8 release-readiness closure completed: content-script production output now builds as a directly injectable single file, the worker and local API now use the documented hybrid trust boundary, focused header-validation tests were added, and real-browser verification confirmed restored options-page model loading plus in-page trigger and card activation.
- Post-closure follow-up verification fixed two remaining real-use gaps: active native text selection no longer suppresses content-card model actions, and the server's Ollama adapter now streams visible answer text for `qwen3.5:0.8b` through the chat API with `think: false`, which was re-verified in a real loaded-browser flow.
- Post-closure content-card UI hardening improved long-detail readability: the card body now scrolls inside a bounded viewport height, the explanation renderer now formats common markdown output instead of showing raw syntax, and focused content rendering tests plus a production rebuild were completed.
- Post-v1 local productization work has started in document-first form: the project now includes discovery, RFC, and implementation-design drafts for a macOS-only companion-app MVP that manages the current local Python service while keeping Ollama as an external local dependency.
- The companion-app MVP now has a working repository scaffold and development-mode runtime loop: configuration loading, menu-bar entrypoints, managed subprocess startup and shutdown for the existing local API, status checks for local API plus Ollama, and a verified start/health/stop path on an alternate local port.
- The companion-app packaging path now has an executable implementation baseline: the build stages `server/app` into app resources, the companion owns a dedicated `--run-local-api` launch mode for both development and packaged builds, and the repository now includes an initial `py2app`-based macOS app build script.
- The macOS packaging baseline has been runtime-verified: the generated `.app` bundle contains the staged server resources, the bundled Python runtime can execute the companion module, and packaged local-API mode served successful health and model responses on an alternate localhost port.
- A real browser integration pass has now verified the packaged companion path on the standard localhost port: Playwright Chromium loaded the unpacked extension, the extension reused the expected stable id, and the in-page card produced both short and detailed explanation output while the packaged API served streaming explanation requests successfully.
- The packaged app's GUI startup path has now been fixed and re-verified: the bundle plist declares `PyRuntimeLocations`, the py2app launcher preserves argv into `mac_app.py`, and a clean `open SnapInsight.app` launch now spawns both the menu-bar process and a `--run-local-api` child that listens on `127.0.0.1:11435`.
- The companion menu and startup settings now cover basic local-app ergonomics: the menu bar displays `SI`, packaged runs can persist `auto_start_service` and `launch_at_login`, and the Launch at Login toggle registers or removes a user LaunchAgent successfully during verification.
- The Launch at Login follow-up fix now keeps the current session stable: enabling the toggle no longer spawns a second menu-bar instance immediately, and verification confirmed the packaged GUI process count stays unchanged while the login-item registration is written for future macOS logins.
