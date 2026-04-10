# SnapInsight Content Script Interaction Implementation Design

## Document Status

- Status: Approved
- Project-Owner Sign-Off: Completed
- Related Documents:
  - `docs/design/extension-and-local-service-design.md`
  - `docs/design/repository-and-code-structure.md`
  - `docs/specs/extension-state-spec.md`
  - `docs/specs/api-spec.md`
  - `docs/plans/implementation-plan.md`

## 1. Purpose

This document provides implementation-level design guidance for the content script interaction layer in SnapInsight v1.

It explains how the in-page interaction should be implemented in code, including:

- selection detection and validation
- trigger and card visibility behavior
- accepted interaction snapshot handling
- page-local request state transitions
- content-script communication with the service worker

This document does not redefine the approved behavior. It translates the existing design and state contracts into implementation structure.

## 2. Scope

In scope:

- content-script bootstrap and lifecycle wiring
- selection detection for ordinary page text and `input` or `textarea`
- selection validation and counting
- viewport anchor computation
- Shadow DOM root and in-page UI mounting
- page-local interaction state container
- short and detailed explanation request lifecycle handling on the content side
- click-away, close, replacement, and document-instance reset behavior

Out of scope:

- service worker local HTTP behavior
- options-page implementation
- server-side prompt orchestration
- cross-document persistence

## 3. Design Goals

- Keep page-local interaction state explicit and easy to reset correctly.
- Freeze one accepted card snapshot per open interaction.
- Avoid coupling DOM state directly to worker message outcomes.
- Keep trigger, card, and request-state behavior deterministic across replacement and reload cases.
- Preserve detail gating, deduplication, and same-card reuse rules.

## 4. Suggested File Layout

Recommended initial file layout:

```text
extension/
  src/
    content/
      index.ts
      bootstrap/start-content-app.ts
      bootstrap/page-instance.ts
      selection/read-selection.ts
      selection/selection-source.ts
      selection/count-selection-units.ts
      selection/validate-selection.ts
      selection/selection-events.ts
      anchor/compute-anchor.ts
      anchor/textarea-anchor.ts
      anchor/normalize-rect.ts
      state/card-state.ts
      state/request-state.ts
      state/reducer.ts
      state/actions.ts
      messaging/worker-client.ts
      messaging/stream-events.ts
      ui/shadow-root.ts
      ui/render-app.ts
      ui/trigger.ts
      ui/card.ts
      ui/blocked-state.ts
      ui/detail-section.ts
      ui/click-away.ts
```

These paths are recommendations. The important part is to preserve the split between selection, anchor, state, messaging, and UI responsibilities.

## 5. Ownership Boundaries

### 5.1 Content Script Responsibilities

The content script owns:

- observing and interpreting page-local selection behavior
- enforcing the product-level `1-20` input rule before normal explanation attempts
- computing trigger and card anchor geometry
- rendering trigger, card, loading, blocked, and error UI inside Shadow DOM
- generating and maintaining page-local state
- generating a fresh `pageInstanceId` for each document instance
- deciding when to start, retry, replace, or abandon page-local requests
- forwarding structured requests to the worker using the shared contracts

### 5.2 Content Script Non-Responsibilities

The content script must not own:

- direct localhost requests
- persistent settings writes
- model validation against live model catalog
- wrong-service identity checks
- transport-level timeout enforcement

### 5.3 State Boundary Rule

The content script owns the runtime-local interaction state container.

The shared layer may define reusable serializable request types, but must not own:

- reducer logic
- page-local transition helpers
- DOM-bound visibility state

## 6. Content Submodule Design

### 6.1 Bootstrap Layer

`content/index.ts` and bootstrap files should:

- create a fresh `pageInstanceId`
- initialize page-local state
- mount the Shadow DOM root lazily or eagerly depending on the chosen implementation
- register selection, hover, click-away, and worker-event listeners

The bootstrap layer should not contain:

- selection counting rules inline
- state-transition branching scattered across listeners
- direct UI business logic beyond startup wiring

### 6.2 Selection Layer

The selection layer should isolate:

- reading current selection text
- distinguishing ordinary text selection from `input` or `textarea` selection
- trimming and punctuation stripping for counting
- enforcing the `1-20` rule
- deciding whether the current selection is in scope for trigger behavior

Recommended helpers:

- `readSelection()`
- `countSelectionUnits(text)`
- `validateSelection(text)`
- `bindSelectionEvents()`

Implementation notes:

- keep counting logic pure and testable
- separate reading raw DOM selection from validating normalized selection text
- invalid selections should suppress trigger and prevent normal explanation startup

### 6.3 Anchor Layer

The anchor layer should:

- compute viewport-relative geometry for trigger and card placement
- normalize DOMRect-like results into the documented serializable rect shape
- support ordinary text ranges
- support `input` or `textarea` exact-range geometry where available
- fall back to host-element geometry only where that fallback is considered stable

Rules:

- if no stable anchor can be computed, fail closed by suppressing the trigger
- the anchor stored in state should represent the accepted card snapshot rather than a continually recomputed live probe after the card opens

### 6.4 State Layer

The state layer should own one page-local interaction object with at least:

- `selectedText`
- `selectionAnchorRect`
- `cardPhase`
- `detailExpanded`
- `activeModel`
- `senderContext`
- `shortRequestState`
- `detailRequestState`

Recommended state API:

- `createInitialState(pageInstanceId)`
- `acceptSelectionSnapshot(selectionText, anchorRect)`
- `showTrigger()`
- `openCardFromSnapshot()`
- `resetCardInteraction()`
- `startShortRequest(requestId)`
- `startDetailRequest(requestId)`
- `applyForwardedStartEvent(...)`
- `applyChunkEvent(...)`
- `applyCompleteEvent(...)`
- `applyErrorEvent(...)`
- `applyCancellationEvent(...)`

Implementation notes:

- prefer explicit state transitions over ad hoc object mutation from UI callbacks
- request-state helpers should be reusable across short and detail areas where the contract is the same

### 6.5 Messaging Layer

The messaging layer should wrap shared worker messages for the content script.

Recommended responsibilities:

- send `explanations.start`
- send cancellation requests
- optionally read worker-backed convenience data only where the contract allows it
- subscribe to forwarded worker events for active requests

The messaging layer should not:

- redefine message shapes locally
- inspect or parse local HTTP protocol details
- maintain UI state itself

### 6.6 UI Layer

The UI layer should render:

- trigger
- card shell
- short explanation area
- detail explanation area
- blocked setup states
- retry affordances
- close button and click-away behavior

UI responsibilities:

- map state to visible output
- emit user intent events back to the state or messaging layer
- keep detail rendering independent from short-content rendering

UI non-responsibilities:

- selection counting
- storage access
- HTTP or worker error mapping logic

## 7. Core Interaction Model

### 7.1 Accepted Interaction Snapshot

The accepted interaction snapshot is created when the user successfully opens the card from a valid selection.

The snapshot should freeze:

- normalized selected text
- normalized anchor rect
- current `senderContext`
- effective model only after successful explanation startup establishes one

Rules:

- loss of native browser selection highlight alone must not destroy the snapshot
- new valid selection replaces the old snapshot
- click-away or explicit close clears the snapshot
- reload or same-tab navigation creates a new document instance and clears the old snapshot

### 7.2 Trigger Behavior

Trigger behavior should be derived from the current valid live selection before card acceptance.

Recommended behavior:

- hidden when there is no valid in-scope selection
- visible when a valid in-scope selection exists and the card is not already open for a different accepted snapshot
- positioned near the computed anchor rect

Optional implementation detail:

- a short hover-intent threshold is allowed before explanation startup begins, as long as the interaction still feels like hover-triggered behavior

### 7.3 Card Opening

When the user triggers the explanation interaction:

1. validate that a current valid selection still exists
2. capture the accepted text snapshot
3. capture the accepted anchor rect snapshot
4. set `cardPhase = open`
5. initialize short-request startup using the accepted snapshot

Important rule:

- the content script should not depend on continuous re-reading of the DOM selection after the card snapshot is accepted

## 8. Request Lifecycle on the Content Side

### 8.1 Short Explanation Start

When the content script starts a short explanation:

1. ensure there is an accepted card snapshot
2. generate a new `requestId`
3. send `explanations.start` with the accepted selection snapshot and sender context
4. only if the startup request is accepted, move `shortRequestState` to `starting`
5. keep `activeModel` possibly `null` at this point until authoritative startup resolves or fails

Rules:

- a separate selected-model read is not required before issuing `explanations.start`
- `starting` must not be entered before the worker has accepted the startup request
- startup acknowledgement is not equivalent to the forwarded `start` event
- if the startup request is rejected before acceptance, the targeted request state should remain out of `starting` and move directly to the normalized startup-failure path
- if the current card already has an established `activeModel`, same-card short retry should pass that value as `payload.model` so the request reuses the card-scoped effective model instead of re-resolving from global persisted settings

### 8.2 Receiving Forwarded Events

Forwarded worker events should update the targeted request state by scoped identity.

Rules:

- ignore events that do not match the current `requestId` plus sender context
- `start` moves the request into `streaming`
- when the forwarded `start` event includes the authoritative `model`, the content script should set or refresh the accepted card interaction's `activeModel` from that event rather than from a separate persisted-settings read
- `chunk` appends ordered text to `textBuffer`
- `complete` marks success and preserves the rendered buffer
- `error` marks failure and preserves any partial rendered buffer
- bridge-loss failure must become retryable `request_failed`, not silent disappearance

### 8.3 Detailed Explanation Start

The content script may start a detailed request only if:

- the card is already open
- the request belongs to the same accepted card snapshot
- `shortRequestState.textBuffer` is non-empty

When detail starts:

1. set `detailExpanded = true`
2. if detail is already `starting` or `streaming`, do nothing
3. otherwise create a new detail `requestId`
4. send `explanations.start` with `mode = detailed`
5. only if the startup request is accepted, move `detailRequestState` to `starting`

Rules:

- detail must reuse the same accepted snapshot and effective model as the visible card interaction
- once the card has an established `activeModel`, the content script should pass that model explicitly as `payload.model` for detail start so the worker validates and reuses the same card-scoped effective model
- detail must not mutate `shortRequestState`
- detail retry replaces the prior detail request state rather than creating a parallel request
- detail startup rejection before acceptance must not leave the detail request in `starting`

### 8.4 Retry Model

Retry behavior should be per area.

Rules:

- short retry replaces the short request state
- detail retry replaces the detail request state
- retry should keep the card snapshot unless the interaction has already been reset
- retry should reuse the effective model snapshot where the design requires it
- once `activeModel` is known for the current card, same-card retry should include that value in the `explanations.start` payload rather than depending on a fresh worker lookup from persisted global settings

### 8.5 Startup Dispatch Handling

The implementation may keep a short-lived local dispatch state while waiting for the worker to accept or reject `explanations.start`, but that transient dispatch bookkeeping should not replace the documented request-phase contract.

Rules:

- request phase remains `idle` until startup acceptance
- startup acceptance transitions the targeted request into `starting`
- forwarded `start` transitions the targeted request into `streaming`
- startup rejection before acceptance transitions directly into the normalized startup-failure path rather than a visible `starting` state

## 9. Replacement, Reset, and Cancellation

### 9.1 New Selection Replacement

When the user creates a new valid selection while a different card interaction exists:

1. close or reset the existing card interaction locally
2. send best-effort cancellation for any active short or detail request that belongs to the old snapshot
3. discard stale detail content from the old selection
4. create a new accepted snapshot only when the user opens the new card

### 9.2 Explicit Close and Click-Away

On explicit close or click-away:

- reset `selectedText`
- reset `selectionAnchorRect`
- set `cardPhase = hidden`
- set `detailExpanded = false`
- clear `activeModel`
- replace both request states with fresh idle objects
- send best-effort cancellation for active requests where appropriate

### 9.3 Document-Instance Change

On reload or same-tab navigation:

- generate a new `pageInstanceId`
- reset the full page-local interaction state
- ignore any stale forwarded events from the old document instance

## 10. Selection and Counting Rules

The counting logic should be implemented as a pure utility with direct tests.

Rules:

- trim leading and trailing whitespace
- strip leading and trailing punctuation from the full selection before counting
- split remaining text by whitespace into segments
- count Latin, digits, and connector-punctuation runs such as `-` and `'` as one segment
- count visible CJK characters individually
- for mixed CJK and contiguous Latin or digit runs without spaces, count each CJK character as `1` and the Latin or digit run as `1`

Representative examples:

- `GPT-4` -> `1`
- `RAG-based agent` -> `2`
- `AI大模型` -> `5`

## 11. UI Composition Guidance

The UI can remain simple, but should preserve separation between trigger, card shell, and area-specific rendering.

Recommended composition:

- `Trigger`
- `Card`
- `ShortExplanationSection`
- `DetailExplanationSection`
- `BlockedSetupSection`

Rules:

- blocked setup states should render inside the same card interaction surface
- `no_models_available`, `service_unavailable`, and `local_service_conflict` should not redirect the user to a different primary surface
- the lightweight in-page model picker is only for missing or invalid model selection cases
- the lightweight in-page model picker must reuse the worker-backed `settings.setSelectedModel` validation and persistence path
- the in-page picker must not write `chrome.storage.local` directly
- the blocked interaction should remain blocked until the validated model-selection write succeeds
- detailed explanation failure should affect only the detail area, not erase already visible short content

## 12. Failure Handling Rules

The content script should distinguish:

- setup failure before streaming
- terminal stream failure after some content may already be visible
- explicit surfaced cancellation
- silent replacement by a newer selection

Rules:

- startup failure updates the targeted request state to `error`
- terminal `error` after chunks preserves partial `textBuffer`
- explicit cancellation may move state to `cancelled`
- silent user-driven replacement may skip visible cancellation rendering and move straight to replacement/reset behavior

## 13. Default Implementation Decisions

Unless a later document changes the direction, prefer the following defaults:

- keep counting and selection validation as pure utilities with direct tests
- keep one page-local state container for the active interaction rather than multiple loosely coupled local stores
- keep worker-message wrappers in the messaging layer rather than calling runtime APIs directly from UI components
- keep blocked setup rendering inside the card surface instead of creating a separate transient surface
- keep short and detail rendering components separate even when they share request-state helper logic

## 14. Implementation Order Inside This Area

Recommended order:

1. create page-instance bootstrap
2. implement pure selection counting and validation helpers
3. implement raw selection readers for text and `input` or `textarea`
4. implement anchor computation
5. implement the page-local state container and transition helpers
6. implement Shadow DOM root and minimal trigger rendering
7. implement card shell rendering
8. wire short explanation start and forwarded-event handling
9. implement blocked setup states and retry actions
10. implement detailed explanation gating and retry behavior
11. implement click-away, close, replacement, and reload protections

This order keeps the state model stable before the full UI behavior becomes complex.

## 15. Verification Guidance

Minimum focused checks for this implementation area:

- valid selections show the trigger and invalid selections do not
- ordinary page text and `input` or `textarea` are both supported within v1 scope
- card opening freezes the accepted interaction snapshot
- loss of native highlight alone does not close or reset the card
- new valid selection replaces the old interaction cleanly
- page reload creates a new `pageInstanceId`
- short explanation state transitions follow the documented lifecycle
- detailed explanation remains blocked until visible short content exists
- repeated detail triggers do not create parallel detail requests
- detail failure does not erase already visible short content
- stale forwarded events are ignored after reset, replacement, or document-instance change

## 16. Out-of-Scope Decisions Deferred to Later Implementation Designs

The following topics should be covered elsewhere:

- worker-side local API and settings implementation
- server-side streaming orchestration and prompt construction
- options-page component structure

## 17. Change Record

- Initial implementation-level design for the content-script interaction area.
- Corrected request-state transition timing to align with startup acceptance semantics, clarified the in-page picker's required worker-backed persistence path, and recorded default content-script implementation decisions.
- Made same-card effective-model reuse explicit by requiring detail and retry flows to pass the established card-scoped `activeModel` as the `explanations.start` model override.
- Promoted the document to `In Review` after the contract-alignment pass found no remaining substantive conflicts with the approved design and spec documents.
- Clarified that the accepted card interaction should set or refresh `activeModel` from the forwarded `start` event so same-card detail and retry flows reuse the authoritative model actually used by the stream.
- Marked the document as ready for project-owner approval review after the formal review and follow-up re-review found no remaining substantive findings.
- Marked the document `Approved` after project-owner sign-off confirmed it as the execution baseline for content-script implementation.
