# SnapInsight Project Progress

## Document Status

- Status: Draft
- Related Documents:
  - `docs/plans/implementation-plan.md`
  - `docs/design/implementation-design/worker-settings-and-local-api-implementation-design.md`
  - `docs/design/implementation-design/options-page-and-settings-surface-implementation-design.md`
  - `docs/design/implementation-design/content-script-interaction-implementation-design.md`
  - `docs/design/implementation-design/server-streaming-and-orchestration-implementation-design.md`

## 1. Purpose

This document records the current implementation status of SnapInsight.

It is intended to answer:

- what has already been completed
- what is currently in progress
- what should happen next
- what is blocked or still uncertain

This document should be updated as implementation progresses. It complements `docs/plans/implementation-plan.md` and does not replace it.

## 2. Current Status Summary

- Current overall status: `Batches 0-7 complete`
- Current execution point: `Batch 7` is now complete with verification and alignment review recorded, and `Batch 8` is the next execution target
- Current implementation state: Core product, architecture, API, state, and implementation-design documents are in place and approved where required for implementation start; the initial repository scaffold, runtime entrypoints, shared runtime contracts, local-service baseline, worker-owned localhost and validated settings paths, the options-page settings surface, the content-script in-page trigger plus card-shell snapshot baseline, the first end-to-end short explanation flow, and the same-card detailed explanation flow are now in place, including visible-short-content gating, independent detail request state, same-card model reuse, detail retry replacement, and in-card model-reselection recovery for both short and detail areas

## 3. Completed

### 3.1 Product and Architecture Documentation

- Completed: PRD is available and defines product goals, scope, interaction rules, and acceptance criteria
- Completed: high-level extension and local-service design is available
- Completed: repository and module-structure design is available
- Completed: accepted RFC set is available for the current architecture and interaction decisions

### 3.2 Contract and State Documentation

- Completed: API spec is available for health, model list, explanation stream, stream events, error codes, and internal extension messages
- Completed: extension state spec is available for page-local state, request lifecycle, and storage rules

### 3.3 Implementation Guidance Documentation

- Completed: execution-oriented implementation plan is available
- Completed: worker, settings, and local API implementation-level design is available
- Completed: options-page settings-surface implementation-level design is available
- Completed: content-script interaction implementation-level design is available
- Completed: server streaming and orchestration implementation-level design is available
- Completed: the implementation-level design set is aligned with the explicit Phase 5 options-page workstream in the implementation plan
- Completed: the implementation-level design set is marked as ready for project-owner approval review

### 3.4 Batch Review Evidence

- Completed: `Batch 0` contract-readiness review note recorded
- Completed: worker `models.list` no-models success semantics were aligned with `docs/specs/api-spec.md`
- Completed: same-card effective-model reuse requirements were made explicit across implementation design and state/API contract documents
- Completed: repository-structure guidance was aligned with documented worker `health.check` handling and server origin-validation and stream-schema module placement
- Completed: the request-lifecycle diagram in `docs/specs/extension-state-spec.md` now shows startup rejection before acceptance explicitly
- Completed: formal review findings for the implementation-level design package were resolved and the follow-up formal re-review found no remaining substantive findings
- Completed: final formal review found no substantive findings and recommended approval pending project-owner sign-off
- Completed: follow-up implementation-design gap review added a dedicated options-page implementation design and backfilled privacy/logging and origin-validation configuration guidance where it had been missing
- Completed: a final pre-approval review checklist was added so the project owner can perform one explicit approval pass before implementation begins
- Completed: the project owner approved the implementation-level design package and it now serves as the execution baseline for `Batch 1` and later phases
- Completed: a formal post-`Batch 5` code-versus-design alignment review was recorded and identified three follow-up issues that must be resolved before `Batch 6`

### 3.5 Batch 1 Implementation Baseline

- Completed: scaffolded `extension/` and `server/` according to the approved repository-structure guidance
- Completed: created runtime entrypoints for content script, service worker, options page, and server startup
- Completed: added shared extension contracts for worker messages, forwarded stream events, error objects, sender context, and reusable request-state types
- Completed: established extension build tooling with Vite and TypeScript and server packaging baseline with FastAPI dependencies
- Completed: added a project-wide Cursor rule requiring a repository-local `.venv` and activation before every Python command

### 3.6 Batch 2 Local Service Foundation

- Completed: added server configuration with explicit trusted extension identity resolution and fixed localhost host or port settings
- Completed: added centralized core error primitives, logging setup, and origin-validation support for later streaming-route enforcement
- Completed: implemented the Ollama adapter boundary for reachability checks and model catalog loading
- Completed: implemented `GET /health` with fixed service identity, contract version, and `ollamaReachable`
- Completed: implemented `GET /v1/models` with normalized `ready` and `no_models_available` states plus retryable failure mapping
- Completed: added focused server tests covering health identity, model-list normalization, upstream-failure mapping, and origin-validation configuration rules

### 3.7 Batch 3 Worker HTTP and Validated Persistence

- Completed: implemented worker-side local API clients for health and models plus shared transport, timeout, and wrong-service normalization
- Completed: implemented worker handlers for `health.check`, `models.list`, `settings.getSelectedModel`, and `settings.setSelectedModel`
- Completed: added worker-owned settings storage helpers and a single validated selected-model persistence path
- Completed: verified that localhost access remains isolated to `extension/src/worker/local-api/`

### 3.8 Batch 4 Settings Surface

- Completed: implemented the options-page local state model, startup wiring, and persistent settings UI
- Completed: implemented worker-backed selected-model loading and live model-list loading
- Completed: implemented worker-backed selected-model save with normalized save-error handling
- Completed: implemented stale-cache diagnostics that render only when live model loading fails
- Completed: added focused extension tests covering settings persistence, stale-model rejection, and non-authoritative stale-cache fallback behavior

### 3.9 Batch 5 In-Page Shell and Selection Snapshot

- Completed: implemented content-side selection readers for ordinary page text and focused `input` or `textarea` selections
- Completed: implemented pure `1-20` counting and validation helpers aligned with the approved representative examples
- Completed: implemented viewport anchor computation and content-owned page-local card state with accepted snapshot semantics
- Completed: implemented Shadow DOM trigger and minimal card shell with hover-open, explicit close, click-away, replacement, and document-instance reset behavior
- Completed: added focused extension tests covering counting examples, trigger-versus-snapshot state semantics, live-selection replacement, native-highlight loss preservation, and page-instance rotation

### 3.10 Batch 6 Short Explanation End-to-End

- Completed: implemented `POST /v1/explanations/stream` with startup validation, selected-model conflict mapping, NDJSON start or chunk or complete or error event output, and focused server integration coverage
- Completed: implemented worker-side `explanations.start` and `explanations.cancel`, active stream registration, stream forwarding, startup failure normalization, and focused worker tests for acceptance, deterministic startup failures, and scoped cancellation
- Completed: implemented content-side short-request lifecycle updates, streamed card rendering, blocked in-card setup states, and the lightweight model-selection picker path that reuses `settings.setSelectedModel`
- Completed: tightened content-side async interaction scoping so stale startup or picker results from an older same-text interaction cannot bind into a newer card in the same document
- Completed: verified the batch with focused extension tests, extension type-check, production build, server unit/integration tests, and lint inspection

### 3.11 Batch 7 Detailed Explanation and Coordination Rules

- Completed: implemented the same-card `查看更多` flow with visible-short-content gating and independent detail-request rendering
- Completed: reused the accepted snapshot, sender-context routing, and card-scoped `activeModel` for detailed explanation startup and retry
- Completed: implemented repeated-detail deduplication, detail retry replacement, and best-effort detail cancellation during close, replacement, and navigation resets
- Completed: implemented in-card model-reselection recovery for detail-side `selected_model_unavailable` outcomes without collapsing the existing short explanation area
- Completed: verified the batch with focused extension tests, extension type-check, production build, server unit/integration tests, and lint inspection

## 4. In Progress

- None currently recorded

## 5. Next Up

### Immediate Next Actions

- Begin `Batch 8: Hardening and Release Readiness`
- Reuse the completed short and detailed explanation flows for final verification and contract hardening
- Add only the remaining high-value tests and finish final manual and document-alignment review work

### First Coding Targets

- Next target: `Batch 8: Hardening and Release Readiness`
- Planned focus: final verification, document-alignment review, controlled deferrals, and release-readiness documentation

## 6. Current Batch Tracking

### Batch 0: Contract Readiness

- Status: Completed
- Goal: confirm no blocking contradiction remains across PRD, design, and specs
- Completion signal:
  - short review note exists
  - no blocking contradiction remains for scaffold work

Review note:

- Completed a document-alignment review across PRD, high-level design, repository structure, API spec, state spec, and the implementation-level design set available at that time
- Corrected the `models.list` no-models success-vs-error distinction so worker guidance now matches the approved API contract
- Corrected same-card effective-model reuse guidance so detail and retry flows explicitly reuse the card-scoped `activeModel` rather than silently re-resolving from later global settings changes
- Aligned repository-structure guidance with the approved `health.check` handler and server-side origin-validation and stream-event-schema placement
- Result: no blocking contradiction remains for `Batch 1` scaffold work

### Batch 1: Scaffold and Shared Boundary

- Status: Completed
- Goal: create repository structure and shared extension contract boundary
- Completion signal:
  - repository structure matches approved design closely enough for implementation
  - shared contracts exist
  - runtime-owned state has not been misplaced into shared modules

Review note:

- Scaffolded `extension/` with Vite + TypeScript and `server/` with FastAPI packaging baseline
- Added runtime entrypoints for content script, service worker, options page, and server app startup
- Added shared contract modules for worker messages, forwarded stream events, public error objects, model summaries, sender context, and shared request-state types
- Kept runtime-owned state logic out of `extension/src/shared/`; shared modules currently hold serializable contracts and reusable types only
- Verified the scaffold with extension type-check and production build plus Python syntax compilation for the server baseline

### Batch 2: Local Service Foundation

- Status: Completed
- Goal: make the local service reachable and contract-shaped before UI integration

Review note:

- Implemented the FastAPI app factory with fixed localhost runtime settings, explicit trusted-extension configuration, and a CORS baseline derived from the configured trusted origin
- Added a centralized Ollama adapter plus service-layer normalization so `GET /health` and `GET /v1/models` stay aligned with the approved API contract instead of leaking upstream payloads
- Verified the batch with server unit/integration tests, a route-construction smoke check, and lint inspection for the edited server files
- Alignment result: current server baseline matches the approved repository structure, server implementation design, and API-spec behavior required for `Batch 2`

### Batch 3: Worker HTTP and Validated Persistence

- Status: Completed
- Goal: make the worker the only local-service caller and the owner of validated model persistence

Review note:

- Implemented worker-side local API clients for `GET /health` and `GET /v1/models`, including fixed-port identity verification, transport and timeout normalization, and explicit message-handler dispatch
- Added worker-owned settings storage helpers and a settings service so `settings.getSelectedModel` and `settings.setSelectedModel` now go through one authoritative persistence path backed by live model validation
- Verified the batch with extension type-check and production build, confirmed the localhost base URL only exists under `extension/src/worker/local-api/`, and checked that timeout and wrong-service paths normalize to the documented public error families in the worker code
- Alignment result: the worker baseline now matches the approved worker implementation design, API-spec internal message contracts, and state-spec persistence rules required for `Batch 3`; explanation streaming handlers remain intentionally deferred to later batches

### Batch 4: Settings Surface

- Status: Completed
- Goal: deliver a usable options page on top of the validated worker path

Review note:

- Implemented the options page as a worker-backed settings surface with local view state for selected-model draft, loading, save status, and diagnostic stale-cache fields
- Wired initial load through `settings.getSelectedModel` and `models.list`, wired save through `settings.setSelectedModel`, and kept stale-cache display explicitly non-authoritative
- Verified the batch with focused extension tests, extension type-check, production build, lint inspection, and source checks confirming that the options page saves only through the worker message contract and contains no direct localhost HTTP access
- Alignment result: the settings surface now matches the approved options-page implementation design, extension-state spec rules for worker-backed persistence, and API-spec message-contract usage required for `Batch 4`

### Batch 5: In-Page Shell and Selection Snapshot

- Status: Completed
- Goal: establish the in-page trigger, card shell, and snapshot-based page-local state

Review note:

- Added content-side selection readers for ordinary page text and focused `input` or `textarea` selections, plus pure `1-20` validation helpers and representative example coverage
- Added viewport-anchor computation, page-instance id generation, navigation-triggered document-instance reset wiring, and content-owned page-local card state helpers
- Added Shadow DOM rendering for the in-page trigger and minimal card shell, including hover-open, explicit close, click-away reset, and replacement-by-new-selection behavior
- Current implementation follows the approved batch-5 counting examples, including `AI大模型 -> 5`, and the focused tests now lock that representative behavior in place for subsequent content-script work
- Follow-up fixes now keep trigger-visible live selection separate from the accepted card snapshot stored in content state
- The hover-open path now revalidates the current live selection before opening the card and captures the accepted snapshot only after that revalidation succeeds
- Verified the batch with focused extension tests, extension type-check, production build, lint inspection, and source checks covering accepted-snapshot timing, replacement semantics, native-highlight loss behavior, and page-instance rotation
- Formal post-batch alignment review finding 1 (high): `extension/src/content/state/selection-interaction.ts` currently replaces an already open interaction whenever a non-null live selection is observed, even when that live selection is the same still-valid selection that originally opened the card; because `start-content-app.ts` re-applies selection handling on later `selectionchange`, `mouseup`, and `keyup` events, this breaks the approved accepted-snapshot rule by dropping the card back to `triggerVisible`
- Formal post-batch alignment review finding 2 (medium, cross-batch follow-up): `server/app/core/origin_validation.py` defines `ensure_allowed_origin()`, but the current API route path still relies on CORS configuration alone, so `GET /health` and `GET /v1/models` succeed without an allowed `Origin` header; this remains misaligned with the approved local-service allowed-origin enforcement requirement and should be fixed before stream work builds on the same path
- Formal post-batch alignment review finding 3 (low, cross-batch follow-up): `extension/src/options/actions/load-settings.ts` still reads `settings.lastKnownModels` and `settings.lastModelRefreshAt` directly from `chrome.storage.local` for diagnostics instead of going through a worker-backed message contract; selected-model writes remain correctly validated through `settings.setSelectedModel`, but the settings-surface boundary is no longer fully worker-backed for those diagnostics fields
- Follow-up fix applied: `extension/src/content/state/selection-interaction.ts` now preserves an already open interaction when the current live selection still matches the accepted card snapshot, so later `selectionchange`, `mouseup`, or `keyup` events no longer demote the same open card back to `triggerVisible`; focused content tests now include an explicit regression check for this case
- Follow-up fix applied: `server/app/api/health.py` and `server/app/api/models.py` now enforce the trusted extension `Origin` explicitly through `ensure_allowed_origin()` instead of relying on CORS configuration alone; the current server tests now verify that missing or untrusted origins are rejected with `403 Forbidden` while the trusted extension origin still preserves the existing success-path behavior
- Follow-up fix applied: the options settings surface now reads stale-cache diagnostics through the worker-backed `settings.getSelectedModel` response instead of directly from `chrome.storage.local`; shared contracts, worker handler behavior, options loading logic, and the related design and API documents were updated together so diagnostics remain worker-backed but still non-authoritative
- Alignment result: the post-`Batch 5` follow-up items are now resolved, so the alignment gate for the completed baseline through `Batch 5` can be treated as cleanly passed and `Batch 6` may begin

### Batch 6: Short Explanation End-to-End

- Status: Completed
- Goal: complete the first end-to-end explanation flow

Review note:

- Implemented the server explanation route, request schema, prompt-building orchestration, and NDJSON event schema so short explanation startup and post-start failures now follow the approved pre-stream-vs-in-stream boundary
- Implemented the worker explanation-start path as the authoritative startup gate, including persisted-model fallback, explicit model-override validation, scoped active-stream forwarding, and best-effort cancellation by `requestId` plus `senderContext`
- Implemented content-side short-request state transitions, loading and streaming rendering, retryable error handling, and in-card blocked setup presentation, with the lightweight model picker limited to the missing or invalid model-selection path and reusing the validated worker-backed persistence flow
- Added focused automated checks for worker stream forwarding, deterministic startup failure mapping, short-request state transitions, server stream-route behavior, and short-mode prompt guidance for concise Chinese-first output
- Alignment review result: no remaining substantive code-versus-design findings were identified for `Batch 6` after the final interaction-scoping fix that prevents stale same-text async startup results from rebinding into a newer card interaction

### Batch 7: Detailed Explanation and Coordination Rules

- Status: Completed
- Goal: complete the same-card detailed explanation flow and coordination rules

Review note:

- Implemented the same-card detail experience with a dedicated detail section, `查看更多` trigger, visible-short-content gating, and independent detail request lifecycle rendering so short and detail content no longer overwrite each other
- Implemented same-card detail startup and retry using the accepted selection snapshot, the current routed sender context, and the card-scoped `activeModel`, so detail startup does not silently fall back to a later global selected-model value
- Implemented repeated-detail deduplication and detail retry replacement by refusing parallel detail startup while a detail request is already dispatching or active, and by reusing one explicit replacement path when retry is requested
- Implemented detail-side blocked recovery for `selected_model_unavailable` so model re-selection can complete inside the detail area and resume the intended detailed request instead of incorrectly dropping back into the short path
- Verified the batch with focused extension tests covering detail gating, detail-area failure preservation, detail-side model-picker rendering, explicit detailed-model override forwarding, request-state independence, extension type-check, production build, full server tests, lint inspection, and source checks for repeated-detail deduplication and stale-event routing
- Alignment review result: no remaining substantive code-versus-design findings were identified for `Batch 7`; the implemented detail flow now matches the approved gating, same-card reuse, retry-replacement, and stale-routing requirements

### Batch 8: Hardening and Release Readiness

- Status: Not started
- Goal: finish verification, alignment review, and release-readiness checks

## 7. Open Risks and Blockers

### Active Blockers

- None currently recorded

### Known Risks

- MV3 worker lifetime and stream bridge stability
- local-environment variability around Ollama availability
- stale-event handling bugs if routing and reset logic are incomplete
- accidental cross-runtime coupling during initial scaffolding

## 8. Implementation Notes

### Update Rules

When implementation starts, this document should be updated using the following rules:

- move work items from `Next Up` to `In Progress` when coding begins
- move items to `Completed` only when their batch-level verification and alignment review gate have passed
- record blockers explicitly rather than leaving progress implied in chat only
- keep entries outcome-focused and observable

### Recommended Entry Style

Prefer entries such as:

- Completed: `GET /health` returns fixed service identity
- In progress: worker `models.list` handler and selected-model validation path
- Next up: content-script accepted snapshot state container

Avoid vague entries such as:

- Completed: backend done
- In progress: fixing some issues

## 9. Change Log

- Initial project progress document created. Current state recorded as documentation-ready with implementation batches not yet started.
- Recorded completion of `Batch 0` contract-readiness review and the associated document-alignment fixes for worker model-list semantics, same-card effective-model reuse, and repository-structure placement guidance.
- Recorded the follow-up document hardening pass that moved the implementation-level design documents to `In Review` and clarified the state-spec lifecycle diagram for pre-acceptance startup rejection.
- Recorded the start of formal review for the implementation-level design package and linked the review findings document.
- Recorded resolution of the formal review findings and the follow-up formal re-review outcome of no remaining substantive findings.
- Updated `Next Up` to reflect that `Batch 0` is complete and `Batch 1` is now the immediate next step.
- Recorded that the implementation-level design set and formal review package are now ready for project-owner approval review.
- Recorded the final formal review outcome of no substantive findings and a recommendation to approve pending project-owner sign-off.
- Recorded the follow-up implementation-design coverage pass that added the options-page implementation design and filled the missing privacy/logging and origin-validation configuration guidance.
- Recorded that a final pre-approval review checklist was added and that project-owner sign-off is now the immediate gate before `Batch 1`.
- Recorded project-owner sign-off completion and updated the project state so the approved implementation-level design package is now the baseline for starting `Batch 1`.
- Recorded the start of `Batch 1` implementation work and moved scaffold and shared-boundary setup into the active execution state.
- Recorded `Batch 1` completion, including scaffold verification results, and explicitly held the project before `Batch 2` per the current instruction.
- Recorded the formal post-`Batch 5` alignment review outcome, including one high-severity content-script snapshot regression, one server allowed-origin enforcement gap, and one lower-severity options-page diagnostics boundary drift; updated current status so `Batch 6` remains blocked until these follow-up items are resolved or explicitly documented.
- Recorded the fix for the accepted-snapshot regression in `extension/src/content/state/selection-interaction.ts`, added a focused regression test for repeated same-selection events against an already open card, and removed that issue from the active blockers that still gate `Batch 6`.
- Recorded the fix for the server allowed-origin enforcement gap by wiring explicit `Origin` validation into `GET /health` and `GET /v1/models`, adding focused integration coverage for missing and untrusted origins, and removing that issue from the active blockers that still gate `Batch 6`.
- Recorded `Batch 6` completion, including the short explanation end-to-end flow, focused extension and server verification, the final interaction-scoping fix for stale same-text async rebinding, and a clean post-batch alignment review outcome with no remaining substantive findings.
- Recorded `Batch 7` completion, including same-card detail rendering, independent detail request coordination, detail-side model-reselection recovery, focused verification, and a clean post-batch alignment review outcome with no remaining substantive findings.
