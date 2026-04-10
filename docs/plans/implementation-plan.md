# SnapInsight v1 Implementation Plan

## Document Status

- Status: Draft
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/design/extension-and-local-service-design.md`
  - `docs/design/repository-and-code-structure.md`
  - `docs/design/implementation-design/worker-settings-and-local-api-implementation-design.md`
  - `docs/design/implementation-design/content-script-interaction-implementation-design.md`
  - `docs/design/implementation-design/server-streaming-and-orchestration-implementation-design.md`
  - `docs/plans/project-progress.md`
  - `docs/plans/implementation-checklist.md`
  - `docs/specs/api-spec.md`
  - `docs/specs/extension-state-spec.md`
  - `docs/rfcs/RFC-001-extension-architecture.md`
  - `docs/rfcs/RFC-004-in-page-interaction-lifecycle.md`
  - `docs/rfcs/RFC-005-authoritative-startup-and-contract-semantics.md`

## 1. Purpose

This document defines the implementation order, execution rules, verification requirements, and document-alignment checkpoints for SnapInsight v1.

It is intended to be executable and auditable:

- every phase names the documents that must be followed
- every phase names the concrete implementation tasks
- every phase defines completion evidence
- every phase ends with an explicit alignment review against the approved documents

This is the working delivery plan for implementation. If code behavior must diverge from this plan or from the related approved documents, the relevant document must be updated first.

## 2. Execution Rules

### 2.1 Mandatory Reference Rule

Implementation must not treat this plan as the only source of truth.

The plan sequences the work, but the implementation must follow the approved product, design, and spec documents:

- `docs/prd/PRD-snapinsight.md` defines user-visible behavior, scope, and acceptance criteria
- `docs/design/extension-and-local-service-design.md` defines runtime ownership, interaction flows, and failure behavior
- `docs/design/repository-and-code-structure.md` defines repository structure and module boundaries
- `docs/specs/api-spec.md` defines HTTP contracts, streaming events, internal extension messages, and public error codes
- `docs/specs/extension-state-spec.md` defines state shape, lifecycle rules, storage rules, and type ownership guidance

When an implementation area already has a dedicated implementation-level design document, that document must be treated as the primary code-structure and execution guide for that area in addition to the higher-level design and spec documents.

The current implementation-level design mapping is:

- worker, settings, and local API work -> `docs/design/implementation-design/worker-settings-and-local-api-implementation-design.md`
- content-script interaction work -> `docs/design/implementation-design/content-script-interaction-implementation-design.md`
- local Python service streaming and orchestration work -> `docs/design/implementation-design/server-streaming-and-orchestration-implementation-design.md`

### 2.2 Phase Gate Rule

A phase is not complete until all of the following are true:

- the planned implementation tasks for the phase are done
- the verification tasks for the phase have been executed
- the implementation has been reviewed against the required reference documents for that phase
- any deviation has been either fixed in code or first resolved in documents

### 2.3 Change Control Rule

If implementation reveals ambiguity or conflict:

- minor editorial clarification may be updated directly in the affected plan or design document
- unresolved product or architecture ambiguity must go back to `docs/discovery/` or `docs/rfcs/`
- code must not silently establish a new contract that is not reflected in the approved documents

### 2.4 Evidence Rule

Each completed phase should leave behind concrete evidence:

- code or scaffold changes
- targeted tests where they materially reduce risk
- manual verification notes for user-visible behavior
- a short document-alignment review note in the implementation PR, task log, or follow-up document update

## 3. Delivery Strategy

The implementation order is:

1. Phase 0: Pre-implementation contract review
2. Phase 1: Repository and scaffold setup
3. Phase 2: Shared extension contracts and core types
4. Phase 3: Local Python service baseline
5. Phase 4: Extension service worker baseline
6. Phase 5: Options page and validated settings flow
7. Phase 6: Content script selection and card shell
8. Phase 7: Short explanation streaming path
9. Phase 8: Detailed explanation flow and request coordination
10. Phase 9: Hardening, packaging, and final alignment review

The sequence is strict. Later phases may prepare small local scaffolds earlier when needed, but feature behavior must not leapfrog its prerequisite contract or state-model phases.

## 4. Cross-Phase Definition of Done

The following conditions apply to every phase:

- runtime boundaries remain consistent with `docs/design/repository-and-code-structure.md`
- content script never calls the local HTTP service directly
- selected text, explanation output, request ids, sender context, and page-local geometry are never persisted
- any selected-model persistence goes through validated worker-backed flows
- error handling uses the public codes defined in `docs/specs/api-spec.md`
- implementation comments and naming reflect runtime ownership clearly enough that later work can continue without re-deriving architecture decisions

## 5. Phase Plan

### 5.1 Phase 0: Pre-Implementation Contract Review

Objective:

- confirm that implementation starts from the current approved documents rather than from assumptions

Required references:

- `docs/prd/PRD-snapinsight.md`
- `docs/design/extension-and-local-service-design.md`
- `docs/design/repository-and-code-structure.md`
- `docs/design/implementation-design/worker-settings-and-local-api-implementation-design.md`
- `docs/specs/api-spec.md`
- `docs/specs/extension-state-spec.md`

Implementation tasks:

- list the code areas to be created under `extension/` and `server/`
- identify the minimum shared contracts needed before any runtime-specific implementation
- identify the minimum end-to-end path for first working behavior
- note any document ambiguity before coding starts

Expected outputs:

- a confirmed implementation starting point
- no unresolved ambiguity blocking scaffold work

Verification:

- verify that the accepted architecture still assumes worker-only localhost access
- verify that the state spec still treats card interaction as a snapshot, not a live selection probe
- verify that the API spec still requires `requestId` plus `senderContext` for routing

Alignment review gate:

- implementation may proceed only if no contradiction is found among PRD, design, and specs for the first coding batch

### 5.2 Phase 1: Repository and Scaffold Setup

Objective:

- create the code layout that matches the approved repository and module-boundary design

Required references:

- `docs/design/repository-and-code-structure.md`
- `docs/design/extension-and-local-service-design.md`

Implementation tasks:

- create `extension/` and `server/` top-level directories if they do not already exist
- scaffold the extension runtime entrypoints for content script, worker, and options page
- scaffold the server application entrypoint and package layout
- create the shared module areas intended for contracts, errors, models, and reusable serializable types
- avoid placing runtime-owned state containers into shared folders

Expected outputs:

- directory structure aligned with the approved repository design
- empty or minimal runtime entry files in the expected locations
- no ambiguous placement for content, worker, options, shared, api, services, adapters, schemas, and core modules

Verification:

- inspect the repository tree and confirm it matches the approved structure closely enough for implementation
- verify that no worker-only code is placed under content modules
- verify that no DOM-owned code is placed under shared or worker-only modules

Alignment review gate:

- compare resulting folders and entry files against `docs/design/repository-and-code-structure.md`
- confirm that page-local state will live under content-owned modules and options view state will live under options-owned modules

### 5.3 Phase 2: Shared Extension Contracts and Core Types

Objective:

- establish the internal extension contract boundary before runtime behavior is implemented

Required references:

- `docs/specs/api-spec.md`
- `docs/specs/extension-state-spec.md`
- `docs/design/repository-and-code-structure.md`

Implementation tasks:

- define shared error-code constants matching the public contract
- define `SenderContext`
- define internal request and response message shapes for health, models, settings, explanation start, and cancellation
- define the worker-to-content-script event envelope for `start`, `chunk`, `complete`, `error`, and bridge-loss handling
- define shared request-state and model-summary types only where true cross-runtime reuse is needed
- keep runtime-local reducers, stores, and view transitions out of shared modules

Expected outputs:

- shared message contracts
- shared stream event contracts
- shared normalized error types
- reusable serializable types needed across content, worker, and options runtimes

Verification:

- check that message shapes line up with `docs/specs/api-spec.md`
- check that event names and terminal-event semantics line up with the streaming event schema
- check that shared types do not absorb runtime-local state ownership that belongs in `docs/specs/extension-state-spec.md`

Alignment review gate:

- review all exported shared types against the API and state specs
- confirm that the contract includes `requestId` plus `senderContext` routing semantics
- confirm that explicit cancellation remains optional unless deliberately surfaced

### 5.4 Phase 3: Local Python Service Baseline

Objective:

- deliver the server foundation and the two baseline endpoints required before UI explanation flows can work

Required references:

- `docs/specs/api-spec.md`
- `docs/design/extension-and-local-service-design.md`
- `docs/design/repository-and-code-structure.md`
- `docs/design/implementation-design/server-streaming-and-orchestration-implementation-design.md`

Implementation tasks:

- set up the FastAPI application on `127.0.0.1:11435`
- implement `GET /health`
- implement `GET /v1/models`
- implement `POST /v1/explanations/stream` with the documented request validation, status-code rules, and NDJSON response contract
- implement the service-identity response contract
- implement origin validation for allowed extension origins
- establish the adapter boundary for Ollama access
- normalize server-side failures into public error families without exposing raw upstream details

Expected outputs:

- running local HTTP service
- `GET /health` with `service = "snapinsight-local-api"`
- `GET /v1/models` with stable ready or no-models behavior
- `POST /v1/explanations/stream` with `application/x-ndjson` streaming behavior and pre-stream HTTP failure handling
- clear server module separation between API routes, services, adapters, schemas, and core code

Verification:

- manually call `GET /health` and confirm the response shape matches the spec
- manually call `GET /v1/models` in both available-model and no-model scenarios where feasible
- manually verify that `POST /v1/explanations/stream` returns `application/x-ndjson`, emits `start -> chunk* -> complete|error` in order, and keeps post-start failures inside terminal stream `error` events
- manually verify that invalid payloads fail before stream establishment with the documented HTTP failure boundary, including `400 Bad Request` for invalid request shape and `403 Forbidden` for disallowed origin
- verify that wrong-service detection remains possible from the worker's point of view
- add targeted server tests for route-contract and model-list normalization if practical

Alignment review gate:

- compare route behavior to `docs/specs/api-spec.md` Section 5
- compare explanation-stream transport behavior to the content-type, event-order, and failure-boundary rules in `docs/specs/api-spec.md`
- confirm that the server does not redefine product error codes locally
- confirm that transport failures and wrong-service identity can still map cleanly to the worker's public contract

### 5.5 Phase 4: Extension Service Worker Baseline

Objective:

- make the worker the sole extension entry point for localhost access and validated settings persistence

Required references:

- `docs/specs/api-spec.md`
- `docs/specs/extension-state-spec.md`
- `docs/design/extension-and-local-service-design.md`
- `docs/design/implementation-design/worker-settings-and-local-api-implementation-design.md`

Implementation tasks:

- implement worker handlers for `health.check`
- implement worker handlers for `models.list`
- implement worker handlers for `settings.getSelectedModel` as the documented read-only convenience contract
- implement worker handlers for loading persisted settings
- implement `settings.setSelectedModel` with live validation against the current model catalog
- persist only validated selected-model changes to `chrome.storage.local`
- persist model cache and last refresh timestamp only as non-authoritative convenience data
- enforce worker-owned timeout handling for extension-initiated local-service requests and normalize timeout outcomes to retryable `request_failed`
- normalize failures into `service_unavailable`, `local_service_conflict`, `selected_model_unavailable`, `no_models_available`, or `request_failed` as required

Expected outputs:

- functioning worker message layer
- worker-owned local HTTP client
- read-only selected-model lookup for settings rendering and blocked-setup hints
- validated settings persistence flow
- deterministic error normalization behavior for health and model operations

Verification:

- verify the content script still has no direct HTTP path to `127.0.0.1:11435`
- verify `settings.getSelectedModel` is available for settings rendering and blocked-setup hints but is not required before `explanations.start`
- verify that a selected model is written only after successful validation
- verify that stale or missing models fail with the documented error contract
- verify that timeout outcomes from worker-owned local-service requests become retryable `request_failed`
- verify that a wrong-service response at the fixed port maps to `local_service_conflict`
- add targeted worker tests for error normalization and persistence decisions if practical

Alignment review gate:

- compare worker handler shapes against `docs/specs/api-spec.md` internal message contracts
- compare storage writes against `docs/specs/extension-state-spec.md` persistent storage rules
- confirm `settings.getSelectedModel` remains a convenience read contract rather than an authoritative startup prerequisite
- confirm that settings writes do not bypass worker validation from any caller

### 5.6 Phase 5: Options Page and Validated Settings Flow

Objective:

- implement the long-lived settings surface using the worker-backed validation path

Required references:

- `docs/prd/PRD-snapinsight.md`
- `docs/design/extension-and-local-service-design.md`
- `docs/specs/extension-state-spec.md`
- `docs/design/implementation-design/content-script-interaction-implementation-design.md`
- `docs/specs/api-spec.md`

Implementation tasks:

- implement the options page entrypoint and view model
- load current selected model and model list through the worker
- render stale-cache diagnostics from `settings.lastKnownModels` and `settings.lastModelRefreshAt` only as convenience information when live model loading fails
- display loading, success, and save-failure states
- allow the user to choose from currently available models
- ensure save uses `settings.setSelectedModel`
- display stable settings-context messaging for service and model problems

Expected outputs:

- usable options page UI
- worker-backed model-selection flow
- optional stale-cache diagnostics that never become the authority for validation or persistence
- no direct storage writes for selected-model persistence from options UI code

Verification:

- verify initial page load reads persisted settings correctly
- verify a valid model selection persists across browser restart
- verify stale selections are rejected with `selected_model_unavailable`
- verify stale cached models and last refresh time may be displayed only as diagnostics when live loading fails, and never unlock or validate a selected-model write
- verify service and model-list failures surface stable, user-facing settings errors
- add targeted UI or state tests only if they materially protect the save flow

Alignment review gate:

- compare the options-page behavior to the design rule that it is the long-lived settings surface
- compare its local view-state fields and persistence behavior to `docs/specs/extension-state-spec.md`
- confirm stale cache remains diagnostic-only and does not become the source of truth for model validation
- confirm that model persistence still goes through the same worker-backed path intended for the in-page blocked flow

### 5.7 Phase 6: Content Script Selection and Card Shell

Objective:

- implement the in-page interaction shell and snapshot-based page-local state without explanation streaming yet

Required references:

- `docs/prd/PRD-snapinsight.md`
- `docs/design/extension-and-local-service-design.md`
- `docs/specs/extension-state-spec.md`

Implementation tasks:

- detect supported text selections on ordinary page text and `input` or `textarea`
- implement the documented `1-20` counting rule
- compute trigger and card anchor geometry
- render the trigger and card shell in a Shadow DOM root
- create page-local state for `selectedText`, `selectionAnchorRect`, `cardPhase`, `detailExpanded`, `activeModel`, `senderContext`, `shortRequestState`, and `detailRequestState`
- ensure card opening creates an accepted interaction snapshot rather than depending on continuous live selection state
- implement close, click-away, replacement, and document-instance reset behavior
- generate a fresh `pageInstanceId` per document instance

Expected outputs:

- visible trigger on valid selection
- stable card shell that remains open independently from browser-native highlight loss
- page-local state wired to the accepted interaction snapshot

Verification:

- verify valid selections show the trigger and invalid selections do not
- verify supported behavior on ordinary page text and `input` or `textarea`
- verify click-away and explicit close reset state
- verify new selection replaces the old card state
- verify page reload generates a new `pageInstanceId`
- add focused tests for counting logic and state transitions if practical

Alignment review gate:

- compare the state shape and reset rules to `docs/specs/extension-state-spec.md`
- compare interaction behavior to the PRD interaction rules
- confirm that loss of native selection highlight alone does not reset the card snapshot

### 5.8 Phase 7: Short Explanation Streaming Path

Objective:

- implement the authoritative short-explanation startup flow and progressive rendering path

Required references:

- `docs/design/extension-and-local-service-design.md`
- `docs/specs/api-spec.md`
- `docs/specs/extension-state-spec.md`
- `docs/rfcs/RFC-005-authoritative-startup-and-contract-semantics.md`
- `docs/design/implementation-design/worker-settings-and-local-api-implementation-design.md`
- `docs/design/implementation-design/content-script-interaction-implementation-design.md`
- `docs/design/implementation-design/server-streaming-and-orchestration-implementation-design.md`

Implementation tasks:

- implement `explanations.start` from content script to worker
- make the worker resolve effective model or fail startup authoritatively
- send `POST /v1/explanations/stream` only from the worker
- implement the short-explanation prompt and service behavior so the returned content stays within the PRD intent: concise, Chinese-first when appropriate, and suitable for non-technical users
- forward `start`, `chunk`, `complete`, `error`, and bridge-loss outcomes through one explicit internal event envelope
- update `shortRequestState` through `idle`, `starting`, `streaming`, `completed`, `error`, or `cancelled` as applicable
- support progressive text rendering from stream chunks
- preserve ordered progressive rendering if very small chunks are coalesced in the worker bridge or content render path
- render blocked in-card states for `service_unavailable`, `local_service_conflict`, and `no_models_available`
- render the lightweight in-page model picker only for missing or invalid model-selection cases
- keep the in-page picker on the same validated `settings.setSelectedModel` persistence path

Expected outputs:

- functional short explanation request path
- authoritative startup behavior
- in-card handling for blocked setup outcomes
- short explanation output behavior aligned with the PRD's content and style expectations
- progressive streaming UI for short explanation text

Verification:

- verify the content script can start explanation without a separate authoritative selected-model read before each attempt
- verify startup failures map deterministically to the documented public codes
- verify blocked setup outcomes stay inside the card interaction
- verify the in-page picker appears only for missing or invalid model-selection cases
- verify short explanation output is constrained to the intended concise format, remains Chinese-first where appropriate, and stays usable for non-technical readers
- verify partial text remains visible if an in-stream terminal error occurs after chunks have already arrived
- add targeted integration tests around stream-event forwarding or request-state transitions if practical

Alignment review gate:

- compare the startup path and worker responsibilities to `docs/design/extension-and-local-service-design.md`
- compare stream-event handling to `docs/specs/api-spec.md` Sections 6 through 8
- compare short explanation output behavior to the PRD's short-explanation requirements
- compare request-state transitions to `docs/specs/extension-state-spec.md` Section 6

### 5.9 Phase 8: Detailed Explanation Flow and Request Coordination

Objective:

- implement the second explanation mode and all same-card coordination rules

Required references:

- `docs/prd/PRD-snapinsight.md`
- `docs/design/extension-and-local-service-design.md`
- `docs/specs/extension-state-spec.md`
- `docs/rfcs/RFC-004-in-page-interaction-lifecycle.md`
- `docs/design/implementation-design/content-script-interaction-implementation-design.md`
- `docs/design/implementation-design/server-streaming-and-orchestration-implementation-design.md`

Implementation tasks:

- implement the `查看更多` action inside the existing card
- block detailed explanation until short explanation has already produced visible streamed content
- reuse the same accepted card snapshot and effective model for the detailed request
- keep `detailRequestState` independent from `shortRequestState`
- implement the detailed-explanation prompt and service behavior so the returned content prioritizes fuller definition, background, usage scenarios, and examples
- deduplicate repeated detail triggers while detail is starting or streaming
- implement detail retry by replacing the prior detail request state rather than creating a parallel request
- ensure short-content visibility is preserved when detail fails
- implement user-driven request replacement and best-effort cancellation behavior across short and detail requests
- ensure stale events are ignored after selection replacement, close, reload, or document-instance change

Expected outputs:

- functioning detailed explanation flow in the existing card
- correct short-detail state separation
- correct same-card reuse and deduplication behavior
- detailed explanation output behavior aligned with the PRD's content expectations
- stable request routing keyed by `requestId` plus `senderContext`

Verification:

- verify detail cannot start before visible short content exists
- verify detail can start after visible short content even if the short request later ends in error
- verify repeated detail clicks do not create parallel detail streams
- verify detail retry replaces the previous detail request state
- verify detailed explanation output prioritizes fuller definition, background, usage scenarios, and examples
- verify selection replacement cancels or abandons stale requests and removes stale detail state
- verify page reload or same-tab navigation prevents stale events from binding into a new document instance
- add focused tests for state transitions and request coordination if practical

Alignment review gate:

- compare same-card interaction behavior to `docs/design/extension-and-local-service-design.md` Sections 6.2 through 6.7
- compare detailed-request lifecycle and eligibility rules to `docs/specs/extension-state-spec.md`
- compare detailed explanation output behavior to the PRD's detailed-explanation requirements
- confirm that detailed explanation stays within the current card rather than creating a separate overlay or surface

### 5.10 Phase 9: Hardening, Packaging, and Final Alignment Review

Objective:

- make the implementation repeatable to run, verify final behavior end to end, and confirm document alignment before considering the plan executed

Required references:

- `docs/prd/PRD-snapinsight.md`
- `docs/design/extension-and-local-service-design.md`
- `docs/design/repository-and-code-structure.md`
- `docs/design/implementation-design/worker-settings-and-local-api-implementation-design.md`
- `docs/design/implementation-design/content-script-interaction-implementation-design.md`
- `docs/design/implementation-design/server-streaming-and-orchestration-implementation-design.md`
- `docs/specs/api-spec.md`
- `docs/specs/extension-state-spec.md`

Implementation tasks:

- add or refine only the tests that materially reduce regression risk for contracts, state transitions, or core user flows
- document local setup and run instructions for extension and server
- verify fixed-port identity handling, model validation, blocked setup flows, streaming flows, and request replacement flows
- verify transport details that must not silently drift, including NDJSON content type, pre-stream HTTP failures, post-start terminal error events, and origin rejection behavior
- verify timeout handling, stale-cache diagnostics behavior, and any chunk coalescing still preserve the documented contract semantics
- check privacy rules, especially that selected text and explanation output are not persisted
- check final file placement and dependency boundaries across extension and server modules
- record any remaining known deferrals explicitly

Expected outputs:

- repeatable local run instructions
- final manual verification notes
- confidence that the implemented behavior matches the approved documents closely enough for the current status

Verification:

- run the full manual checklist in Section 6
- run the targeted automated tests added during implementation
- inspect storage behavior and confirm that forbidden data is not persisted
- inspect network boundaries and confirm that only the worker calls the local service

Alignment review gate:

- perform a final document-by-document alignment review using Section 7
- any material mismatch must be either corrected in code or resolved by updating documents before the implementation plan can be treated as completed

## 6. Final Verification Checklist

### 6.1 Core User Flow Checks

- selecting `1-20` valid units shows the trigger near the selection
- invalid or oversized selections do not show the trigger
- the card opens from hover and remains visible until explicit close or click-away
- the card works on ordinary page text and `input` or `textarea`
- short explanation shows loading and progressive streaming output
- short explanation is concise, remains within the intended short-response constraint, and is Chinese-first where appropriate
- detailed explanation opens inside the same card
- detailed explanation remains blocked until short explanation content is visibly present
- detailed explanation prioritizes fuller definition, background, usage scenarios, and examples
- detailed explanation failure affects only the detail area and offers retry where appropriate
- selecting new text replaces the old interaction and does not leak stale content

### 6.2 Settings and Model Checks

- first use requires explicit model selection before explanation can proceed
- options page loads current settings through the worker
- `settings.getSelectedModel` works as a read-only convenience contract for settings rendering and blocked-setup hints
- valid model selection persists across browser restart
- stale selected model is rejected with `selected_model_unavailable`
- no-models state is distinguishable from service-unavailable state
- the in-page picker appears only when model selection is missing or invalid
- the in-page picker and options page both use the same validated persistence path
- stale cached model data and last refresh time are diagnostic-only and do not authorize selected-model writes

### 6.3 Local Service and Contract Checks

- `GET /health` returns the expected service identity
- wrong-service identity is treated as `local_service_conflict`
- `GET /v1/models` returns the documented success and no-models shapes
- the streaming endpoint uses the documented event schema
- the streaming endpoint uses `application/x-ndjson`
- invalid request payloads fail before stream establishment with the documented HTTP boundary
- disallowed extension origins are rejected according to the documented contract
- terminal stream failures are surfaced as terminal `error` events after stream start rather than as changed HTTP status
- event routing uses both `requestId` and `senderContext`

### 6.4 State and Persistence Checks

- page-local state matches the documented state ownership and reset rules
- a new `pageInstanceId` is generated on reload or same-tab navigation
- loss of the native browser highlight alone does not reset an open card
- selected text is never persisted
- explanation output is never persisted
- sender context, geometry, request ids, and per-request error state are never persisted
- cached model data is not treated as authoritative for selected-model validation

### 6.5 Failure and Recovery Checks

- startup failures follow the documented deterministic mapping
- bridge loss becomes retryable `request_failed`
- worker-owned local-service request timeouts become retryable `request_failed`
- explicit cancellation, if surfaced, uses `request_cancelled`
- silent user-driven cancellation does not require a visible terminal error
- partial streamed text remains visible when an in-stream terminal error occurs after content has already been rendered

## 7. Document Alignment Review Checklist

The final implementation review must explicitly compare the code against each document below.

### 7.1 PRD Alignment

Confirm:

- the implemented interaction still matches the PRD scope and non-goals
- the floating trigger, card behavior, short explanation, detailed explanation, model selection, and user-facing error behavior remain within the PRD acceptance criteria
- privacy requirements remain satisfied

### 7.2 Design Alignment

Confirm:

- runtime ownership still matches the content-script, worker, options-page, and local-service responsibilities
- blocked setup states remain in the card interaction
- the in-page picker remains an escape hatch rather than a second persistent settings surface
- same-card snapshot and effective-model ownership rules remain intact
- request routing, bridge-loss handling, and cancellation behavior still match the design

### 7.3 Repository-Structure Alignment

Confirm:

- code placement still follows the approved repository and module-boundary guidance
- no accidental direct dependency exists from content modules into worker implementation modules
- shared modules hold contracts and reusable serializable types rather than runtime-owned state logic

### 7.4 API-Spec Alignment

Confirm:

- local HTTP endpoints, payloads, and error behavior still match the API spec
- stream event ordering and terminal-event rules are preserved
- NDJSON content type, pre-stream HTTP failure boundary, and origin-rejection behavior are preserved
- internal message contracts remain aligned between content script, worker, and options page
- public error codes remain unchanged unless documents are updated first

### 7.5 State-Spec Alignment

Confirm:

- page-local state fields match the documented shape
- request lifecycle transitions match the documented rules
- storage keys and persistence rules match the documented constraints
- stale cache remains diagnostic-only and `settings.getSelectedModel` remains a convenience read contract rather than an authoritative startup prerequisite
- options-page state behavior still respects worker-backed persistence and card-local active-model isolation

## 8. Risks and Controlled Deferrals

Known implementation risks:

- MV3 worker lifetime and stream bridge stability
- local-environment variability around Ollama availability
- accidental coupling across runtime boundaries
- subtle stale-event bugs if routing or reset logic is incomplete

Controlled deferrals for v1:

- richer visual polish beyond core usability
- broader compatibility beyond the documented v1 scope
- stronger local-process trust guarantees beyond the fixed-port identity check
- non-essential refinement of `input` or `textarea` geometry fallback behavior unless it blocks accepted v1 behavior

Any new deferral that weakens an approved acceptance criterion must be reflected in the relevant PRD, design, or spec document before implementation proceeds.

## 9. Recommended Execution Batches

This section turns the phase plan into implementation-sized batches that can be executed one after another.

Each batch assumes the prior batch has passed its verification and alignment-review gate.

### 9.1 Batch 0: Contract Readiness

Scope:

- Phase 0 only

Primary goal:

- confirm that implementation can start without unresolved document contradictions

Concrete tasks:

- review the approved PRD, design, repository-structure design, API spec, and state spec together
- note the minimum contracts that must exist before any runtime-specific code is written
- record any ambiguity that would otherwise force ad hoc code decisions

Completion evidence:

- a short review note exists
- no blocking contradiction remains for scaffold work

### 9.2 Batch 1: Scaffold and Shared Boundary

Scope:

- Phase 1
- Phase 2

Primary goal:

- create the repository structure and the shared extension contract boundary

Concrete tasks:

- scaffold `extension/` and `server/`
- create runtime entrypoints for content, worker, options, and server
- define shared error, message, event, and routing contracts
- define only the reusable serializable shared types needed across runtimes

Completion evidence:

- repository structure matches the approved design closely enough for implementation
- shared contracts exist for health, models, settings, explanation start, cancellation, and stream events
- runtime-owned state has not been misplaced into shared modules

### 9.3 Batch 2: Local Service Foundation

Scope:

- Phase 3

Primary goal:

- make the local service reachable and contract-shaped before UI integration begins

Concrete tasks:

- stand up the FastAPI app on the fixed localhost address
- implement `GET /health`
- implement `GET /v1/models`
- establish the Ollama adapter boundary and server-side error normalization

Completion evidence:

- the local service runs on `127.0.0.1:11435`
- `GET /health` returns the expected service identity
- `GET /v1/models` can represent both ready and no-models conditions

### 9.4 Batch 3: Worker HTTP and Validated Persistence

Scope:

- Phase 4

Primary goal:

- make the worker the only local-service caller and the owner of validated model persistence

Concrete tasks:

- implement worker message handlers for health, models, settings load, and selected-model write
- implement worker-owned HTTP client logic
- normalize wrong-service, unavailable-service, invalid-model, no-models, and retryable failures
- persist selected model only after live validation

Completion evidence:

- the extension can query service health and models only through the worker
- selected-model persistence works and uses worker validation
- wrong-service identity is mapped to `local_service_conflict`

### 9.5 Batch 4: Settings Surface

Scope:

- Phase 5

Primary goal:

- deliver a usable options page on top of the validated worker path

Concrete tasks:

- build the options page UI and view state
- load persisted settings and available models through the worker
- implement save, loading, and stable error presentation

Completion evidence:

- the options page can read and save selected model correctly
- stale model selection is rejected through the documented contract
- no direct selected-model storage writes exist in options-page code

### 9.6 Batch 5: In-Page Shell and Selection Snapshot

Scope:

- Phase 6

Primary goal:

- establish the in-page trigger, card shell, and snapshot-based page-local state

Concrete tasks:

- implement selection detection and `1-20` counting
- render trigger and card shell in Shadow DOM
- implement accepted card snapshot state, reset rules, and document-instance handling
- support ordinary page text and `input` or `textarea`

Completion evidence:

- valid selection opens a stable card shell
- invalid selection does not trigger explanation behavior
- selection replacement, click-away, explicit close, and reload behave according to the state spec

### 9.7 Batch 6: Short Explanation End-to-End

Scope:

- Phase 7

Primary goal:

- complete the first end-to-end user-visible explanation flow

Concrete tasks:

- wire `explanations.start` from content to worker to server
- implement worker stream forwarding and content-side short-request lifecycle updates
- render short explanation loading, streaming, completion, and error behavior
- implement blocked setup states in the card
- implement the lightweight in-page model picker for missing or invalid model selection only

Completion evidence:

- short explanation works end to end from selection to streamed rendering
- blocked setup states stay in the card interaction
- the in-page picker reuses the validated settings flow and appears only in the allowed cases

### 9.8 Batch 7: Detailed Explanation and Coordination Rules

Scope:

- Phase 8

Primary goal:

- complete the same-card detail flow and concurrent request coordination rules

Concrete tasks:

- implement the `查看更多` action
- gate detail on visible short content
- keep short and detail request state separate
- deduplicate repeated detail triggers
- implement detail retry replacement
- handle selection replacement, cancellation, stale routing, and page-instance changes correctly

Completion evidence:

- detailed explanation works inside the existing card
- detail never starts too early
- repeated detail triggers do not create parallel detail streams
- stale events do not bind into the wrong interaction

### 9.9 Batch 8: Hardening and Release Readiness

Scope:

- Phase 9

Primary goal:

- verify the implementation comprehensively and confirm document alignment before treating v1 as implementation-ready

Concrete tasks:

- add only the tests that materially protect contract and state behavior
- finalize local setup and run documentation
- run the final manual verification checklist
- run the final document-alignment review checklist
- record remaining controlled deferrals

Completion evidence:

- the final verification checklist is complete
- the final document alignment review is complete
- any remaining mismatches are either fixed or first resolved in documents

### 9.10 Suggested Immediate Starting Point

If implementation starts now, begin with:

1. Batch 0
2. Batch 1
3. Batch 2
4. Batch 3

Do not begin content-script UI implementation until these four batches are complete, because they establish:

- the repository and module boundaries
- the shared extension contracts
- the local-service baseline
- the worker-only localhost and validated settings path

## 10. Change Record

- Rewrote the implementation plan to make it executable and verifiable, with strict per-phase document references, concrete tasks, completion evidence, and explicit post-implementation alignment review gates.
- Expanded the execution guidance from a single starting batch into a full batch-by-batch delivery breakdown so implementation can proceed in smaller, verifiable units without weakening the document-alignment requirements.
