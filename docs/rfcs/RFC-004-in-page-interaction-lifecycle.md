# RFC-004: In-Page Interaction Lifecycle

## Document Status

- Status: Accepted
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/discovery/extension-local-service-approval-blockers.md`
  - `docs/rfcs/RFC-001-extension-architecture.md`
  - `docs/design/extension-and-local-service-design.md`
  - `docs/specs/extension-state-spec.md`

## Context

SnapInsight v1 already accepts the core extension architecture: the content script owns in-page interaction, the service worker brokers startup and streaming, and short and detailed explanations are modeled as separate request lifecycles.

After moving the design and specs to `In Review`, one remaining interaction question is still significant enough to require a formal decision:

- if the short explanation has already streamed visible partial content and then ends in `error`, should the user still be allowed to start the detailed explanation for the same card

This question affects user-visible interaction semantics, state-machine rules in the content script, and the consistency between the PRD-level interaction and the formal extension state model.

For this RFC, the key distinction is whether the short explanation ever produced visible streamed content for the current card, not just what terminal phase name it ended with.

## Decision Drivers

- Keep the in-page interaction behavior understandable to users
- Keep the state machine deterministic enough for implementation
- Preserve the PRD rule that detailed explanation is requested separately from short explanation
- Avoid wasting valid partial progress when a short explanation already produced visible content
- Avoid expanding the interaction into a more complex concurrency model than v1 needs

## Options

### Option A: Forbid detailed explanation whenever short explanation ends in `error`

Description:

- If the terminal state of the short request is `error`, the detail action is blocked even if partial short content is still visible in the card.

Pros:

- Simple state rule
- Easy to implement from request phases alone

Cons:

- Ignores the product reality that the user may already see meaningful short content
- Makes the terminal request phase more important than the actual visible interaction state
- Can feel arbitrary when the short request streamed useful content before failing

### Option B: Allow detailed explanation if short explanation reached an active streamed state before failing

Description:

- If the short request reached a confirmed active streamed phase and left visible content in the card, the detail action remains allowed even if the terminal short state is `error`.
- If the short request failed before meaningful streaming began, detail remains blocked.

Pros:

- Aligns better with the visible card state the user is actually interacting with
- Preserves value from partial successful streaming
- Keeps the distinction between startup-blocked failure and in-stream failure

Cons:

- Requires a slightly richer rule than checking only the final terminal phase
- Needs the design/spec to distinguish “short request failed before it really started” from “short request failed after partial success”

### Option C: Allow detailed explanation only for selected retryable short-request errors

Description:

- Whether detail can start depends on both partial short content and the error category of the failed short request.

Pros:

- More precise control over edge cases

Cons:

- Adds more policy complexity than v1 likely needs
- Pushes interaction semantics closer to error-code branching than product flow reasoning

## Tradeoffs

Option A is the easiest to implement mechanically, but it creates a user-visible rule that can feel inconsistent with what is already shown in the card. Option C offers more control, but it increases branching and makes the lifecycle harder to reason about.

Option B is the best balance for v1: it preserves the simpler “detail is still a second request for the same card” model while acknowledging that an in-stream short-request failure is not the same thing as a startup-blocked or pre-stream failure.

## Recommendation

Adopt Option B.

Recommended behavior:

- Treat the detail action as allowed only after the short explanation for the same card has already produced visible streamed content.
- Represent that condition using a concrete state predicate: the short request has received at least one streamed chunk and `shortRequestState.textBuffer` is non-empty for the current card.
- Continue to block detail startup when the short explanation never reached a meaningful active streamed state for that card.
- Keep repeated detail triggers deduplicated while a detail request is active.
- Keep detail retry as replacement behavior for the detail request state, not as an additional parallel detail stream.

## Decision

The v1 in-page interaction lifecycle for SnapInsight should:

1. Distinguish startup-blocked or pre-stream short-request failure from in-stream short-request failure after visible content exists.
2. Treat detailed explanation as eligible only when the short request for the same card has already produced visible streamed content, represented by at least one streamed chunk and a non-empty `shortRequestState.textBuffer`.
3. Allow detailed explanation for the same card even if the short request later terminates in `error`, as long as the eligibility rule above is already satisfied.
4. Continue to block detailed explanation when the short request never produced visible streamed content, including startup failure, pre-stream failure, or terminal `error` with an empty short buffer.
5. Keep only one active detailed request per card at a time.
6. Treat repeated detail triggers during an active detail request as deduplicated.

This decision is accepted for v1.

## Consequences

- `docs/design/extension-and-local-service-design.md` should describe detail eligibility using the concrete visible-content rule, not only phase names such as `completed` or `error`.
- `docs/specs/extension-state-spec.md` should define the corresponding state-machine rule explicitly in terms of short-request streamed content and buffer state.
- No change to the accepted extension architecture in `RFC-001` is required.

## Residual Risk

- If the project later wants more error-code-specific branching for detail eligibility, that would likely require revisiting this RFC rather than extending the rule implicitly.
