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

- Current overall status: `Batch 3` completed
- Current execution point: `Batch 3: Worker HTTP and Validated Persistence` is complete; `Batch 4` is next
- Current implementation state: Core product, architecture, API, state, and implementation-design documents are in place and approved where required for implementation start; the initial repository scaffold, runtime entrypoints, shared runtime contracts, local-service baseline, and worker-owned localhost and validated settings paths are now in place

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

## 4. In Progress

- None currently recorded

## 5. Next Up

### Immediate Next Actions

- Begin `Batch 4: Settings Surface`
- Reuse the completed worker-backed health, model-list, and validated selected-model flows from `Batch 3`
- Implement the options page on top of the established worker-owned persistence path

### First Coding Targets

- Next target: `Batch 4: Settings Surface`
- Planned focus: options-page view state, worker-backed model loading, selected-model saving, and stable settings-surface error presentation

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

- Status: Not started
- Goal: deliver a usable options page on top of the validated worker path

### Batch 5: In-Page Shell and Selection Snapshot

- Status: Not started
- Goal: establish the in-page trigger, card shell, and snapshot-based page-local state

### Batch 6: Short Explanation End-to-End

- Status: Not started
- Goal: complete the first end-to-end explanation flow

### Batch 7: Detailed Explanation and Coordination Rules

- Status: Not started
- Goal: complete the same-card detailed explanation flow and coordination rules

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
