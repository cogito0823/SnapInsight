# Extension and Local Service Document Alignment

## Document Status

- Status: Implemented
- Related Documents:
  - `docs/discovery/technical-architecture-questions.md`
  - `docs/rfcs/RFC-001-extension-architecture.md`
  - `docs/rfcs/RFC-002-local-communication-and-security.md`
  - `docs/rfcs/RFC-003-python-service-and-ollama-integration.md`
  - `docs/design/extension-and-local-service-design.md`
  - `docs/specs/api-spec.md`
  - `docs/specs/extension-state-spec.md`

## Purpose

This discovery note records a document-alignment pass for the extension and local-service architecture.

The goal is not to reopen accepted architecture decisions. The goal is to trace the current source of truth in the order `discovery -> RFC -> design -> specs`, identify where the design document drifted, and record what should be clarified or updated next.

## 1. Current Assessment

- No architecture-level conflict was found between the accepted RFCs and the current specs.
- A first alignment pass has now been applied to `docs/design/extension-and-local-service-design.md`.
- The design document now reflects the current spec baseline more closely for stream routing, first-use model selection, `input` / `textarea` anchor fallback, and spec ownership boundaries.
- The current follow-up focus is no longer architecture drift, but keeping related design documents synchronized as implementation planning becomes more detailed.
- For the current v1 direction, this alignment note no longer carries unresolved blockers.

## 2. Discovery View

At the discovery layer, the project already explored the key questions that later became the current RFC set:

- content script owns page-local interaction and in-page UI
- service worker owns localhost access and shared extension state
- options page is the stable persistent settings surface
- localhost HTTP is the v1 transport
- FastAPI is the local service framework
- explanation streaming and best-effort cancellation are required

This alignment pass originally highlighted two focused follow-up questions that did not require a new RFC by default. Those clarifications have now been reflected in the design document:

### 2.1 What is the minimum required behavior for the first-use in-page model picker?

Resolved in design:

- the in-page picker should use the same `settings.setSelectedModel` validation and persistence flow as the options page
- the in-page picker must not bypass live validation by writing storage directly
- cached model data may be shown only as a non-authoritative convenience hint
- blocked explanation startup should remain blocked until the model-selection write succeeds
- the options page should follow the same validation-backed persistence path rather than implying a separate direct-storage write flow

Escalate to RFC only if:

- the project wants different persistence semantics between the in-page picker and the options page
- the project wants to expand the in-page picker into a broader settings surface

### 2.2 What is the minimum fallback for `input` / `textarea` anchor geometry?

Resolved in design:

- when exact range geometry is available, prefer selection-aware anchoring
- when exact range geometry is not available but the host element rect is stable, anchoring may fall back to the element rect
- if no stable anchor can be computed, the extension should fail closed by suppressing the floating trigger instead of guessing an unreliable position

Escalate to RFC only if:

- the product scope changes for `input` / `textarea`
- a new interaction surface is introduced to replace in-page anchoring

## 3. RFC Baseline

### 3.1 RFC-001 already fixes the extension runtime ownership model

`docs/rfcs/RFC-001-extension-architecture.md` already establishes that:

- the content script owns selection-aware UI and page-local interaction state
- the service worker is the only broker for localhost requests and shared extension state
- short and detailed explanations must use separate request state
- active request routing must use `requestId` plus sender context
- sender context must include `tabId`, `frameId`, and `pageInstanceId`
- stream events must use an explicit worker-to-content-script envelope
- unexpected bridge loss must become an explicit retryable failure

Implication:

- the current alignment work should refine design/spec wording, not reopen runtime ownership

### 3.2 RFC-002 already fixes the localhost and wrong-service rules

`docs/rfcs/RFC-002-local-communication-and-security.md` already establishes that:

- the Python service binds to `127.0.0.1:11435`
- the local service validates extension origins
- the extension must verify a stable service identity on the fixed port
- wrong-service responses must map to `local_service_conflict`

Implication:

- no RFC update is needed unless the project changes the fixed-port or trust model

### 3.3 RFC-003 already fixes the explanation and model-validation contract direction

`docs/rfcs/RFC-003-python-service-and-ollama-integration.md` already establishes that:

- explanation requests use one shape with a `mode` field
- short and detailed explanations both stream
- setup-time failures use HTTP failures before stream establishment
- in-stream failures use terminal stream `error` events
- selected-model writes must be validated before persistence
- the mixed-language `1-20` counting rule is explicit and example-based

Implication:

- no RFC update is needed unless the project changes explanation concurrency, persistence semantics, or transport behavior

## 4. Design Alignment Applied

The design document has now been updated to reflect the current RFC-and-spec baseline more precisely.

### 4.1 Treat specs as the field-level source of truth

Applied outcome:

- the design document now points to the specs as the exact field-level source of truth
- the design document stays focused on ownership, lifecycle responsibilities, and flow guidance

### 4.2 Remove outdated future-spec wording

Applied outcome:

- `docs/specs/api-spec.md` is referenced as the current source of truth for transport and message contracts
- `docs/specs/extension-state-spec.md` is referenced as the current source of truth for extension state shape

### 4.3 Clarify stream-bridge granularity

Applied outcome:

- the worker maintains stream delivery per active request
- routing and cancellation are keyed by `requestId` plus `senderContext`
- one page interaction may contain both a short request and a detailed request

### 4.4 Clarify first-use picker behavior

Applied outcome:

- the in-page picker is only a blocked-first-use escape hatch
- persistence still goes through `settings.setSelectedModel`
- cached model data does not override live validation
- the options page follows the same validation-backed selected-model write path

### 4.5 Add minimum fallback guidance for `input` / `textarea`

Applied outcome:

- the design document now states the minimum fallback behavior when exact geometry cannot be derived reliably

### 4.6 Align the high-level repository structure with the more detailed repository design

Applied outcome:

- the high-level structure in `docs/design/extension-and-local-service-design.md` now points to `docs/design/repository-and-code-structure.md` for detailed module layout guidance
- the outdated `server/app/models/` high-level structure has been replaced with the current `schemas/` and `core/` direction used by the repository-structure design

### 4.7 Clarify stale-cache and timeout ownership guidance

Applied outcome:

- the design document now states that cached model data may be rendered as stale diagnostics without becoming the validation source of truth
- the design document now states that timeout thresholds remain an implementation detail, while timeout enforcement belongs to the service worker unless the API spec later narrows the contract

## 5. Specs Baseline

### 5.1 `docs/specs/api-spec.md`

The API spec is already the source of truth for:

- `GET /health`
- `GET /v1/models`
- `POST /v1/explanations/stream`
- stream-event order and payloads
- startup failure mapping
- `settings.setSelectedModel`
- `explanations.start`
- `explanations.cancel`
- explicit bridge-loss and explicit-cancellation forwarding behavior

### 5.2 `docs/specs/extension-state-spec.md`

The state spec is already the source of truth for:

- request-state shape
- page-local content-script state
- persistent storage keys
- request lifecycle transitions
- stale-event rejection using sender context

### 5.3 Change discipline going forward

When field-level contracts change:

- update the relevant spec in the same change or first
- then update the design document only if ownership, flow, or implementation guidance also changes
- do not leave the design document carrying a stale duplicate of spec-level structures

## 6. Recommended Document Actions

### 6.1 Immediate actions

- keep `docs/design/extension-and-local-service-design.md` and `docs/design/repository-and-code-structure.md` aligned when high-level structure guidance changes
- keep the current RFC set unchanged because no decision-level conflict was found

### 6.1.1 Non-blocking future watchpoints

- if timeout behavior later becomes product-significant rather than implementation-only, promote the exact public timeout contract into `docs/specs/api-spec.md`
- if the options page evolves beyond the current model-selection and diagnostics role, re-check whether a new discovery note or RFC is needed

### 6.1.2 Current maturity recommendation

Recommended status moves:

- `docs/design/extension-and-local-service-design.md` is now a reasonable candidate for `In Review`
- `docs/specs/api-spec.md` and `docs/specs/extension-state-spec.md` are now reasonable candidates to move together to `In Review`

Reasoning:

- the core runtime ownership, request lifecycle, blocked setup handling, and model-selection rules now align with the accepted RFC baseline
- the API spec and extension-state spec are explicit enough to support implementation planning without leaving the main runtime semantics ambiguous
- the remaining follow-up items are lightweight implementation-boundary questions, not unresolved architecture conflicts

Recommended docs to keep as `Draft` for now:

- `docs/discovery/extension-local-service-doc-alignment.md`
- `docs/discovery/extension-local-service-design-review-questions.md`
- `docs/design/repository-and-code-structure.md`

Reasoning:

- the two discovery documents remain exploratory records and should stay in a discovery maturity state unless their purpose changes
- `docs/design/repository-and-code-structure.md` has useful guidance, but this review pass focused on runtime behavior and contract clarity rather than a full module-layout readiness review

Approval boundary reminder:

- the design and spec documents look close to review-ready, but the remaining lightweight follow-up items still argue for `In Review` rather than `Approved`

Current closure note:

- the original alignment drift identified by this discovery note has been resolved
- the remaining items above are future watchpoints, not active issues blocking the current document set

### 6.2 Future escalation criteria

Create a new RFC only if one of the following changes is proposed:

- changing the concurrency model for short and detailed explanation requests
- changing the model-selection persistence contract
- changing the localhost trust model or port strategy
- changing the in-page interaction surface in a way that materially alters product behavior

## 7. Change Record

- Created a dedicated discovery note to track alignment work across discovery, RFC, design, and specs for the extension/local-service architecture.
- Updated the note after the design-document alignment pass so it records resolved drift items and the remaining lightweight follow-up boundaries.
- Added a maturity-review recommendation to distinguish documents that are now review-ready from documents that should remain in discovery or draft status.
