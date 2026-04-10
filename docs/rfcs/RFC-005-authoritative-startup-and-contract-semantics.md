# RFC-005: Authoritative Startup and Contract Semantics

## Document Status

- Status: Accepted
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/discovery/extension-local-service-approval-blockers.md`
  - `docs/rfcs/RFC-001-extension-architecture.md`
  - `docs/rfcs/RFC-003-python-service-and-ollama-integration.md`
  - `docs/design/extension-and-local-service-design.md`
  - `docs/specs/api-spec.md`

## Context

The current extension design moved toward one important simplification:

- treat explanation startup as the authoritative path for in-page explanation attempts, instead of splitting the real startup decision across a separate selected-model preflight read and a later stream-start request

However, the current review pass exposed a remaining contract problem:

- `explanations.start` is now described as the authoritative startup path, but its request shape still assumes a non-empty selected model is already resolved before the request can be issued

This creates an inconsistency for first-use or model-selection-blocked situations, because the in-page flow needs one coherent startup boundary while the current contract still assumes the model has already been chosen externally.

It also leaves the design document with two competing primary-flow descriptions: an older direct start sequence and a newer authoritative startup sequence.

For this RFC, “authoritative startup path” means the content script should be allowed to ask the service worker to start the explanation flow even when the worker may still need to decide whether a usable selected model currently exists.

## Decision Drivers

- Keep the in-page startup path conceptually simple
- Preserve deterministic error and blocked-state handling
- Support first-use and model-selection-blocked flows without split contract authority
- Keep the extension internal contract explicit enough for implementation
- Avoid duplicating or racing startup decisions across separate preflight and start operations

## Options

### Option A: Keep model pre-resolution as a required separate gate

Description:

- `explanations.start` continues to require an already resolved non-empty `model`.
- The UI must complete model selection through a separate required preflight flow before explanation startup can be attempted.

Pros:

- Minimal change to the existing request shape
- Keeps explanation-start input strict

Cons:

- Splits startup authority across more than one contract step
- Adds latency and race opportunities between preflight read and startup
- Makes first-use hover-triggered startup less coherent

### Option B: Keep one authoritative startup path and allow it to express model-selection-blocked outcomes

Description:

- `explanations.start` remains the single authoritative startup path for in-page explanation attempts.
- The contract is adjusted so startup can deterministically return a blocked/setup failure when no valid selected model currently exists, instead of assuming the model was already fully resolved elsewhere.
- In this model, the startup request may omit `model` to mean “use the current persisted selected model if one is valid”.

Pros:

- Keeps one authoritative startup boundary
- Better supports first-use and invalid-model flows
- Reduces inconsistency between the design narrative and the contract semantics

Cons:

- Requires explicit contract refinement for request shape and startup-failure meaning
- Needs a careful update to the design and API spec so the new semantics are not ambiguous

### Option C: Keep both preflight and startup as normative contract steps

Description:

- The extension explicitly treats “selected model resolution” and “explanation startup” as two separately normative contract phases for every in-page explanation attempt.

Pros:

- Makes the two-step nature explicit

Cons:

- More ceremony in the hottest interaction path
- Harder to treat one path as authoritative
- Increases drift risk between design, state rules, and internal message contracts

## Tradeoffs

Option A keeps the current request strict, but it forces the design to rely on a separate authoritative gate before startup can even be attempted. Option C makes that split explicit, but at the cost of a more cumbersome and drift-prone runtime model.

Option B is the best fit for the current direction. The project has already moved toward “startup is the authoritative gate”; this RFC makes the contract match that intent and gives first-use or invalid-model situations a clear place in the startup semantics.

## Recommendation

Adopt Option B.

Recommended direction:

- Treat `explanations.start` as the single authoritative startup path for in-page explanation attempts.
- Refine the extension-internal startup contract so it can deterministically represent model-selection-blocked startup outcomes.
- Make `payload.model` optional in the extension-internal `explanations.start` contract:
  - if `model` is provided, treat it as an explicit model override and validate it
  - if `model` is omitted, resolve the effective model from persisted extension state inside the startup path
- When no usable selected model exists at startup time, fail `explanations.start` with the existing stable error family `selected_model_unavailable` rather than introducing a second authoritative preflight requirement.
- Rewrite the design document so it has one canonical primary explanation-start flow aligned with that authoritative startup model.
- Keep cached or previously loaded selected-model state as a UI hint only, not as the separate authoritative gate that decides whether startup may be attempted.

## Decision

The v1 extension startup contract for SnapInsight should:

1. Treat `explanations.start` as the single authoritative startup boundary for in-page explanation attempts.
2. Allow the extension-internal `explanations.start` request to omit `payload.model`, meaning “resolve the effective model from current persisted extension state”.
3. If `payload.model` is provided, validate it as an explicit model override before startup continues.
4. If no usable selected model exists at startup time, return a deterministic startup failure in the existing stable error family `selected_model_unavailable`.
5. Keep selected-model reads as convenience or rendering support contracts, not as the required normative gate before every hover-triggered explanation attempt.
6. Use one canonical startup flow in the design document that matches the chosen authoritative contract semantics.

This decision is accepted for v1.

## API Direction

- The extension-internal `explanations.start` contract should accept:
  - `model` omitted: resolve from persisted selected model
  - `model` present: treat as explicit override and validate it
- The extension-internal `explanations.start` failure mapping should use `selected_model_unavailable` when no usable selected model exists, whether because the stored model is stale or because no model has been selected yet.
- The extension-internal selected-model read contract should remain available for settings rendering and blocked-state hints.
- The localhost HTTP API does not need to become responsible for UI-level first-use orchestration; this decision is about the extension-internal boundary between content script and service worker.

## Consequences

- `docs/design/extension-and-local-service-design.md` should remove or rewrite any duplicate primary-flow sequence that still reflects the older split-gate model.
- `docs/specs/api-spec.md` should define one self-consistent startup contract, including optional-model request semantics and how model-selection-blocked startup is expressed.
- `docs/specs/extension-state-spec.md` should align request-start transitions with the updated startup contract semantics, including startup attempts that begin before a usable model has been confirmed.
- `RFC-003` remains valid at the Python-service boundary; the clarification happens in the extension-internal contract layer.

## Residual Risk

- If the project later chooses to move more first-use orchestration into a different UI surface, the startup contract may need another focused review.
