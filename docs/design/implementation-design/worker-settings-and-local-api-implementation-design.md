# SnapInsight Worker, Settings, and Local API Implementation Design

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

This document provides implementation-level design guidance for the Chrome extension service worker, its settings flows, and its local API integration.

It is intended to bridge the gap between:

- the approved runtime and ownership design
- the API and state contracts
- the execution order in `docs/plans/implementation-plan.md`

This document does not redefine product behavior or public contracts. It explains how the worker-side implementation should be structured in code.

## 2. Scope

In scope:

- service worker bootstrap and message registration
- worker handlers for health, models, selected-model read, selected-model write, explanation start, and cancellation
- worker-owned local HTTP client and stream setup
- worker-owned settings persistence in `chrome.storage.local`
- worker-owned timeout and error normalization behavior
- bridge setup for forwarding explanation stream events toward the content script

Out of scope:

- content-script selection geometry and card rendering
- options-page UI component design
- Python service internal implementation details beyond what the worker relies on
- prompt wording details beyond the worker inputs and outputs

## 3. Design Goals

- Keep localhost access exclusively inside the service worker.
- Make worker message handlers thin, explicit, and easy to trace.
- Keep settings persistence and validation in one authoritative path.
- Make startup-time failure handling deterministic and aligned with the public contract.
- Preserve the distinction between pre-stream HTTP failures and post-start stream terminal errors.
- Prevent runtime-local UI state from leaking into worker-owned persistence or shared modules.

## 4. Suggested File Layout

Recommended initial file layout:

```text
extension/
  src/
    worker/
      index.ts
      bootstrap/register-handlers.ts
      handlers/health-check.ts
      handlers/models-list.ts
      handlers/settings-get-selected-model.ts
      handlers/settings-set-selected-model.ts
      handlers/explanations-start.ts
      handlers/explanations-cancel.ts
      bridge/active-stream-registry.ts
      bridge/stream-forwarder.ts
      bridge/bridge-failure.ts
      settings/storage.ts
      settings/settings-service.ts
      local-api/http-client.ts
      local-api/health-client.ts
      local-api/models-client.ts
      local-api/explanations-client.ts
      local-api/error-mapping.ts
      local-api/service-identity.ts
      local-api/timeouts.ts
    shared/
      contracts/messages.ts
      contracts/events.ts
      errors/error-codes.ts
      state/request-types.ts
      models/model-summary.ts
```

These filenames are recommendations, not a locked contract. The important requirement is to preserve the ownership boundaries.

## 5. Ownership Boundaries

### 5.1 Worker Responsibilities

The worker owns:

- extension-facing internal message handling
- all calls to `http://127.0.0.1:11435`
- service identity verification
- timeout enforcement for worker-initiated local-service requests
- selected-model validation before persistence
- non-authoritative model-cache refreshes
- request-scoped bridge registration for active explanation streams
- normalization of local-service and transport failures into extension-facing error results

### 5.2 Worker Non-Responsibilities

The worker must not own:

- DOM interaction
- selection extraction
- card open and close decisions
- page-local visual state transitions
- options-page rendering logic

### 5.3 Shared Module Boundaries

`extension/src/shared/` should contain:

- serializable message and event contracts
- normalized error codes and shared error shapes
- reusable serializable request and model types

`extension/src/shared/` should not contain:

- storage adapters
- Chrome runtime side effects
- request orchestration with side effects
- options-page view state or content-script card state containers

## 6. Worker Submodule Design

### 6.1 Bootstrap Layer

`worker/index.ts` and `worker/bootstrap/register-handlers.ts` should:

- register the runtime message listener
- decode the incoming message type
- dispatch to a dedicated handler
- keep the registration table explicit rather than dynamically inferred

The bootstrap layer should not contain:

- HTTP request logic
- storage logic
- normalization branching beyond top-level dispatch failure handling

### 6.2 Handler Layer

Each message type should have one handler entry file.

Recommended handlers:

- `health.check`
- `models.list`
- `settings.getSelectedModel`
- `settings.setSelectedModel`
- `explanations.start`
- `explanations.cancel`

Handler responsibilities:

- validate message payload shape if needed
- call worker services or local-api clients
- normalize returned results into the shared message contract
- keep branching shallow enough that the happy path is easy to audit

Handlers should not:

- reimplement error mapping logic inline
- directly access `chrome.storage.local` in multiple places
- build ad hoc stream event payloads outside the shared envelope

### 6.3 Settings Layer

The settings layer should be the only worker-local place that reads and writes `chrome.storage.local`.

Recommended responsibilities:

- read `settings.selectedModel`
- read and write `settings.lastKnownModels`
- read and write `settings.lastModelRefreshAt`
- expose helper methods that hide raw storage keys from handlers

Recommended service surface:

- `getSelectedModel()`
- `getSettingsSnapshot()`
- `setSelectedModelValidated(selectedModel)`
- `setLastKnownModels(models, refreshedAt)`
- `clearSelectedModel()` only if a later design explicitly requires it

### 6.4 Local API Layer

The local API layer should isolate all HTTP details from handlers.

Recommended client split:

- `health-client.ts` for `GET /health`
- `models-client.ts` for `GET /v1/models`
- `explanations-client.ts` for `POST /v1/explanations/stream`
- `http-client.ts` for shared fetch setup, content-type checks, timeout support, and response parsing helpers

The local API layer should own:

- base URL construction
- request headers
- allowed response content-type checks where useful
- transport-error classification
- wrong-service identity detection
- timeout enforcement hooks

The local API layer should not own:

- persistence decisions
- page routing state
- options-page behavior

### 6.5 Bridge Layer

The bridge layer should manage active explanation stream forwarding.

Recommended responsibilities:

- register an active request by `requestId` plus `senderContext`
- forward `start`, `chunk`, `complete`, and `error`
- convert bridge-loss or worker-side teardown failures into the documented internal failure outcome
- support best-effort cancellation lookup by the same scoped identity

Bridge keys must include:

- `requestId`
- `tabId`
- `frameId`
- `pageInstanceId`

`requestId` alone is not sufficient.

## 7. Core Message Flows

### 7.1 `health.check`

Flow:

1. handler calls the health client
2. health client performs `GET /health`
3. response is trusted only if `service == "snapinsight-local-api"`
4. wrong-service identity maps to `local_service_conflict`
5. transport failure maps to `service_unavailable`
6. successful result is returned through the shared message contract

Implementation notes:

- keep wrong-service identity detection in one reusable helper
- use the same helper from health, models, and explanation-start paths

### 7.2 `models.list`

Flow:

1. handler calls the model-list client
2. client requests `GET /v1/models`
3. successful model list updates `settings.lastKnownModels` and `settings.lastModelRefreshAt`
4. no-models state is returned as a valid product condition, not a transport failure
5. wrong-service identity and transport failures are normalized consistently with other entry points

Implementation notes:

- cache refresh should happen only on successful live responses
- cached data is diagnostic only and must not become the source of truth for model validation
- `models.list` must preserve the success-shape distinction from `docs/specs/api-spec.md`:
  - `ok: true` with `data.state = "ready"` when models are available
  - `ok: true` with `data.state = "no_models_available"` when the catalog is empty
  - `ok: false` only for normalized transport, identity, or retryable failure cases

### 7.3 `settings.getSelectedModel`

Flow:

1. handler reads the persisted settings snapshot from worker-owned storage
2. result is returned as the read-only selected-model convenience data together with worker-backed stale-cache diagnostics for settings rendering

Rules:

- this is a read-only convenience contract
- it supports settings rendering and blocked-setup hints
- it may include `lastKnownModels` and `lastModelRefreshAt` as diagnostic snapshot fields for settings rendering, but those fields remain non-authoritative and must not bypass live validation
- it must not become an authoritative prerequisite for `explanations.start`

### 7.4 `settings.setSelectedModel`

Flow:

1. handler receives the candidate model id
2. worker calls the live model-list client
3. worker verifies the selected model is currently available
4. only after successful validation does the worker persist `settings.selectedModel`
5. the worker may refresh `settings.lastKnownModels` and `settings.lastModelRefreshAt` from that same successful live response

Failure mapping:

- unreachable local service -> `service_unavailable`
- wrong service on fixed port -> `local_service_conflict`
- model not currently selectable -> `selected_model_unavailable`
- other retryable catalog-load or validation failure -> `request_failed`

Rules:

- no UI layer may write `settings.selectedModel` directly
- failed validation must leave the persisted selected model unchanged

Shared usage rule:

- the options page and the in-page blocked model-selection picker must both use this same worker-backed validation and persistence path
- cached model data may inform UI hints, but it must not bypass live validation before persistence

### 7.5 `explanations.start`

Flow:

1. handler receives `requestId`, `senderContext`, `text`, `mode`, and optional model hint
2. worker determines the effective model using:
   - explicit payload model if allowed by the contract
   - otherwise persisted `settings.selectedModel`
3. if no usable model exists, startup fails with `selected_model_unavailable`
4. worker performs the explanation-stream request through the local API layer
5. on successful stream establishment, worker registers the active request in the bridge registry
6. worker returns setup acknowledgement through the message response
7. actual runtime progression is delivered through forwarded internal events

Important rule:

- startup acknowledgement is not a substitute for the forwarded `start` event
- if startup is rejected before acceptance, the worker must not behave as though the request entered the active stream bridge

Failure boundary:

- pre-stream HTTP failure becomes a normalized startup failure result
- post-start failure becomes forwarded terminal `error`

Same-card effective-model rule:

- if `payload.model` is present, the worker must treat it as the card-scoped effective-model snapshot for that request and validate it as an explicit override before stream establishment
- if `payload.model` is omitted, the worker must resolve the effective model through the normal persisted-settings validation path rather than trying to infer card-local UI state that it does not own
- same-card effective-model stability is therefore enforced by the content script: once a card already has an established `activeModel`, same-card detailed requests and same-card retry paths must pass that value in `payload.model`

### 7.6 `explanations.cancel`

Flow:

1. handler locates the active request by `requestId` plus `senderContext`
2. worker aborts the underlying fetch or stream reader if still active
3. worker tears down bridge state on a best-effort basis
4. explicit cancellation signaling is optional; if surfaced, it must use the documented internal envelope and `request_cancelled`

V1 scope note:

- no dedicated public HTTP cancel endpoint is required for v1; best-effort cancellation may rely on aborting the worker-side fetch stream and letting the server observe disconnect or cancellation indirectly

## 8. Local API Behavior Rules

### 8.1 Service Identity Verification

The worker should use one helper to decide whether the fixed port belongs to SnapInsight.

Rules:

- `GET /health` is the primary identity check
- if a response arrives but the expected service identifier is missing or mismatched, treat it as `local_service_conflict`
- apply the same interpretation consistently across health checks, model loading, selected-model validation, and explanation startup

### 8.2 Timeout Ownership

Timeout thresholds remain implementation details, but timeout enforcement belongs to the worker-side local API layer.

Rules:

- health, models, selected-model validation, and explanation-start setup may use worker-owned timeout wrappers
- timeout outcomes should normalize to retryable `request_failed` unless a narrower public contract is later added
- timeout handling should not be duplicated independently inside each handler

### 8.3 Streaming Contract Handling

For `POST /v1/explanations/stream`:

- pre-stream failures remain HTTP failures
- post-start failures remain terminal stream `error` events
- the worker should parse newline-delimited JSON incrementally
- the worker may coalesce very small chunk events only if ordering and terminal-event semantics remain unchanged

Validation expectations:

- the worker should not send invalid empty `text`
- the product flow should already enforce the PRD-level `1-20` limit
- the server may still enforce its defensive validation ceiling

Pre-stream non-success normalization:

- `409` selected-model failures must normalize to `selected_model_unavailable`
- `403` origin rejection must normalize to a non-streaming `request_failed` result because the extension contract does not expose a narrower public origin-error code
- other pre-stream HTTP startup failures not mapped to a narrower public code should normalize to `request_failed`

## 9. Storage Design

Persisted keys:

- `settings.selectedModel`
- `settings.lastKnownModels`
- `settings.lastModelRefreshAt`

Persistence rules:

- `settings.selectedModel` is persisted only after successful live validation
- `settings.lastKnownModels` is refreshed only from successful live model-list responses
- `settings.lastModelRefreshAt` records the last successful live refresh time

Non-persistent data:

- selected text
- explanation output
- request ids
- sender context
- page-local geometry
- per-request error state

### 9.1 Privacy and Logging Guidance

The worker and its local API helpers should carry forward the approved privacy and logging rules from `docs/specs/api-spec.md`.

Rules:

- selected text and generated explanation output must not be persisted in worker-owned storage
- normal operational logs must not include selected text or generated explanation content
- normalized error results may include stable public messages, but must not include raw payload contents unnecessarily
- temporary debug logging, if enabled during development, should be opt-in and disabled by default

## 10. Error Mapping Strategy

The worker should centralize error mapping so handlers are consistent.

Recommended mapping table for normalized error outcomes:

| Source condition | Worker-facing result |
| --- | --- |
| fetch cannot connect | `service_unavailable` |
| fixed port answers with wrong identity | `local_service_conflict` |
| persisted or requested model is unavailable | `selected_model_unavailable` |
| timeout or retryable unexpected failure | `request_failed` |
| explicit surfaced cancellation | `request_cancelled` |

Additional rules:

- `no_models_available` is not a normalized failure result for `models.list`; it is a successful catalog state and should remain `ok: true` with `data.state = "no_models_available"`
- the same public code may still be surfaced as a blocked explanation-start outcome when the worker determines that no selectable model exists for the attempted interaction
- `invalid_request` is primarily a contract or implementation bug signal, not a normal UI-state outcome
- raw stack traces and raw upstream transport details must not cross the extension contract boundary

## 11. Default Implementation Decisions

Unless a later document changes the direction, prefer the following defaults:

- one handler entry file per internal message type
- one shared error-mapping helper for worker-facing results
- one storage helper layer for all `chrome.storage.local` access
- one active-stream registry keyed by `requestId` plus `senderContext`
- one explanation-start path that owns both effective-model resolution and startup failure normalization

## 12. Implementation Order Inside This Area

Recommended order:

1. create shared worker-facing contracts if they do not already exist
2. scaffold worker bootstrap and handler registration
3. implement storage helpers
4. implement health client and handler
5. implement model-list client and handler
6. implement `settings.getSelectedModel`
7. implement `settings.setSelectedModel`
8. implement explanation-start setup path
9. implement bridge registry and stream forwarder
10. implement cancellation path

This order keeps the simpler deterministic flows in place before streaming complexity is added.

## 13. Verification Guidance

Minimum focused checks for this implementation area:

- `health.check` returns a healthy result only when the fixed port identity matches SnapInsight
- `models.list` distinguishes ready, no-models, wrong-service, and retryable failure cases
- `settings.getSelectedModel` returns persisted selection or `null`
- `settings.setSelectedModel` never persists an unavailable model
- successful `models.list` refreshes stale-cache diagnostics
- stale-cache diagnostics never authorize selected-model persistence
- `explanations.start` does not require a separately successful `settings.getSelectedModel` call beforehand
- explanation startup failure mapping is deterministic
- post-start bridge or stream failures do not masquerade as startup HTTP failures
- timeout behavior is owned by the worker and maps to retryable `request_failed`

## 14. Out-of-Scope Decisions Deferred to Later Implementation Designs

The following topics should be covered in separate implementation-level documents:

- content-script selection detection and card-state implementation
- options-page component structure and view composition
- server-side explanation orchestration and prompt construction details

## 15. Change Record

- Initial implementation-level design for the worker, settings, and local API area.
- Clarified the shared validated model-selection path for options and in-page blocked flows, tightened startup-acceptance semantics, and recorded default worker implementation decisions.
- Clarified that `models.list` must preserve the success-state shape for `no_models_available`, and made same-card effective-model reuse explicit for detail and retry request startup.
- Promoted the document to `In Review` after the contract-alignment pass found no remaining substantive conflicts with the approved design and spec documents.
- Made the omitted-model startup rule executable without hidden worker knowledge of card-local state and pinned worker normalization for pre-stream non-success HTTP statuses including `403` origin rejection.
- Marked the document as ready for project-owner approval review after the formal review and follow-up re-review found no remaining substantive findings.
- Added explicit worker-side privacy and logging guidance so implementation-level instructions now carry forward the approved non-persistence and no-sensitive-default-logging rules.
- Marked the document `Approved` after project-owner sign-off confirmed it as the execution baseline for implementation.
