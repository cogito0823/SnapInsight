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

- [ ] Build the options page entrypoint and basic UI
- [ ] Load selected model and models list through the worker
- [ ] Save selected model through `settings.setSelectedModel`
- [ ] Surface stable loading and save-failure states
- [ ] Render stale-cache diagnostics only as convenience information when live loading fails
- [ ] Verify valid selected model persists across browser restart
- [ ] Verify stale selections are rejected with `selected_model_unavailable`
- [ ] Verify stale-cache diagnostics never authorize a selected-model write
- [ ] Perform phase alignment review for options-page settings behavior
- [ ] Update `docs/plans/project-progress.md`

### Batch 5: In-Page Shell and Selection Snapshot

- [ ] Implement selection readers for ordinary page text and `input` or `textarea`
- [ ] Implement pure counting and validation helpers for the `1-20` rule
- [ ] Implement anchor computation
- [ ] Implement page-local state container
- [ ] Implement Shadow DOM root, trigger, and card shell
- [ ] Implement click-away, close, replacement, and reload reset behavior
- [ ] Verify valid selections show the trigger and invalid selections do not
- [ ] Verify accepted card snapshot survives loss of native highlight
- [ ] Verify reload creates a new `pageInstanceId`
- [ ] Perform phase alignment review for content-script snapshot behavior
- [ ] Update `docs/plans/project-progress.md`

### Batch 6: Short Explanation End-to-End

- [ ] Implement `POST /v1/explanations/stream`
- [ ] Implement worker-side explanation startup path
- [ ] Implement stream forwarding from worker to content script
- [ ] Implement short-request state transitions in the content script
- [ ] Render short explanation loading, streaming, completion, and error behavior
- [ ] Render blocked setup states in the card
- [ ] Render the lightweight in-page model picker only for missing or invalid model selection cases
- [ ] Verify short explanation streams progressively into the card
- [ ] Verify startup failures map deterministically to documented public codes
- [ ] Verify short explanation output remains concise and Chinese-first where appropriate
- [ ] Perform phase alignment review for short explanation flow
- [ ] Update `docs/plans/project-progress.md`

### Batch 7: Detailed Explanation and Coordination Rules

- [ ] Implement the `查看更多` action
- [ ] Gate detailed explanation on visible short content
- [ ] Keep short and detail request state independent
- [ ] Reuse the same accepted snapshot and effective model for detail
- [ ] Deduplicate repeated detail triggers
- [ ] Implement detail retry replacement
- [ ] Verify detail cannot start before visible short content exists
- [ ] Verify repeated detail triggers do not create parallel detail requests
- [ ] Verify detail failure does not erase visible short content
- [ ] Verify detailed explanation prioritizes fuller definition, background, usage scenarios, and examples
- [ ] Perform phase alignment review for detailed explanation flow
- [ ] Update `docs/plans/project-progress.md`

### Batch 8: Hardening and Release Readiness

- [ ] Add only the tests that materially protect contract, state, and core flow behavior
- [ ] Document local setup and run instructions
- [ ] Run the final manual verification checklist
- [ ] Run the final document alignment review checklist
- [ ] Record remaining controlled deferrals explicitly
- [ ] Update `docs/plans/project-progress.md`

## 3. Final Verification Checklist

### Core User Flow

- [ ] Valid `1-20` selection shows the trigger near the selection
- [ ] Invalid or oversized selection does not show the trigger
- [ ] Card opens from hover and remains visible until explicit close or click-away
- [ ] Ordinary page text and `input` or `textarea` work within v1 scope
- [ ] Short explanation shows loading and progressive streaming output
- [ ] Short explanation remains concise and Chinese-first where appropriate
- [ ] Detailed explanation opens inside the same card
- [ ] Detailed explanation remains blocked until short explanation content is visibly present
- [ ] Detailed explanation prioritizes fuller definition, background, usage scenarios, and examples
- [ ] Detailed explanation failure affects only the detail area and preserves short content
- [ ] Selecting new text replaces the old interaction without stale content leakage

### Settings and Models

- [ ] First use requires explicit model selection
- [ ] Options page loads current settings through the worker
- [ ] `settings.getSelectedModel` works as a read-only convenience contract
- [ ] Valid selected model persists across browser restart
- [ ] Stale selected model is rejected with `selected_model_unavailable`
- [ ] No-models state is distinct from service-unavailable state
- [ ] In-page picker appears only when model selection is missing or invalid
- [ ] In-page picker and options page share the same validated persistence path
- [ ] Stale cached models and last refresh time remain diagnostic-only

### Local Service and Contract

- [ ] `GET /health` returns the expected service identity
- [ ] Wrong-service identity is treated as `local_service_conflict`
- [ ] `GET /v1/models` returns documented success and no-models shapes
- [ ] Streaming endpoint follows the documented event schema
- [ ] Streaming endpoint uses `application/x-ndjson`
- [ ] Invalid payloads fail before stream establishment with the documented HTTP boundary
- [ ] Disallowed extension origins are rejected according to the documented contract
- [ ] Post-start failures become terminal stream `error` events rather than changed HTTP status
- [ ] Event routing uses both `requestId` and `senderContext`

### State and Persistence

- [ ] Page-local state matches the documented ownership and reset rules
- [ ] Reload or same-tab navigation generates a new `pageInstanceId`
- [ ] Loss of native browser highlight alone does not reset an open card
- [ ] Selected text is never persisted
- [ ] Explanation output is never persisted
- [ ] Sender context, geometry, request ids, and per-request error state are never persisted
- [ ] Cached model data is not treated as authoritative for validation

### Failure and Recovery

- [ ] Startup failures follow the documented deterministic mapping
- [ ] Bridge loss becomes retryable `request_failed`
- [ ] Worker-owned local-service request timeouts become retryable `request_failed`
- [ ] Explicit cancellation, if surfaced, uses `request_cancelled`
- [ ] Silent user-driven cancellation does not require a visible terminal error
- [ ] Partial streamed text remains visible after an in-stream terminal error

## 4. Final Document Alignment Review

### PRD Alignment

- [ ] Interaction remains within approved PRD scope and acceptance criteria
- [ ] Privacy requirements remain satisfied

### Design Alignment

- [ ] Runtime ownership still matches content script, worker, options page, and local service responsibilities
- [ ] Blocked setup states remain in the card interaction
- [ ] In-page picker remains an escape hatch rather than a second persistent settings surface
- [ ] Same-card snapshot and effective-model ownership rules remain intact

### Repository-Structure Alignment

- [ ] File placement follows the approved repository and module-boundary guidance
- [ ] No accidental direct dependency exists from content modules into worker implementation modules
- [ ] Shared modules hold contracts and reusable serializable types rather than runtime-owned state logic

### API-Spec Alignment

- [ ] Local HTTP endpoints, payloads, and error behavior still match the API spec
- [ ] Stream event ordering and terminal-event rules are preserved
- [ ] NDJSON content type, pre-stream failure boundary, and origin-rejection behavior are preserved
- [ ] Internal message contracts remain aligned across extension runtimes
- [ ] Public error codes remain unchanged unless documents are updated first

### State-Spec Alignment

- [ ] Page-local state fields match the documented shape
- [ ] Request lifecycle transitions match the documented rules
- [ ] Storage keys and persistence rules match documented constraints
- [ ] Stale cache remains diagnostic-only
- [ ] `settings.getSelectedModel` remains a convenience read contract rather than an authoritative startup prerequisite
- [ ] Options-page behavior still respects worker-backed persistence and card-local active-model isolation

## 5. Change Log

- Initial implementation checklist created from the current implementation plan and implementation-level design documents.
- Added the dedicated options-page implementation-level design document to the related-document set so Batch 4 settings-surface work has an explicit implementation guide.
