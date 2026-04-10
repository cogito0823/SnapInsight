# Extension and Local Service Approval Blockers

## Document Status

- Status: Implemented
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/design/extension-and-local-service-design.md`
  - `docs/specs/api-spec.md`
  - `docs/specs/extension-state-spec.md`
  - `docs/rfcs/RFC-001-extension-architecture.md`
  - `docs/rfcs/RFC-003-python-service-and-ollama-integration.md`
  - `docs/rfcs/RFC-004-in-page-interaction-lifecycle.md`
  - `docs/rfcs/RFC-005-authoritative-startup-and-contract-semantics.md`
  - `docs/discovery/extension-local-service-design-review-questions.md`

## Purpose

This discovery document records the issues that previously blocked the extension/local-service design and specs from moving cleanly from `In Review` toward `Approved`.

The goal was to isolate the remaining decision-level ambiguities, compare options, and identify which ones should be promoted into RFCs before the final design/spec wording was updated again.

## 1. Review Summary

Original approval blockers:

- the startup contract does not yet cleanly explain how hover-triggered explanation startup works when no model has been selected yet
- the design document still contains two inconsistent versions of the primary explanation-start flow
- the rules for whether detailed explanation may start after a partially streamed short explanation ends in `error` are not yet explicit

Resolution outcome:

- these blockers were no longer simple wording drift
- they affected runtime behavior, internal contract semantics, and the meaning of the user-visible interaction flow
- they were promoted into RFC decisions and are now resolved by accepted `RFC-004` and `RFC-005`
- the resulting decisions have been propagated back into the approved design and spec documents

## 2. Decision Questions

### 2.1 How should the in-page authoritative startup path behave when no selected model exists yet?

Options:

- keep `explanations.start` requiring a non-empty `model`, and require the UI to resolve model selection before the request can be issued
- allow `explanations.start` to be called without an already resolved model, and let startup return a model-selection-blocked result as part of the same authoritative path
- keep a separate preflight contract as the required first step for in-page startup whenever model availability is unknown

Preliminary recommendation:

- keep one authoritative startup path for in-page explanation attempts
- allow that path to express model-selection-blocked startup outcomes explicitly, instead of forcing the UI to complete a separate required preflight read first
- avoid making the hover-triggered interaction depend on two separate authoritative gates

Reasoning:

- the current documents already moved toward treating `explanations.start` as the authoritative startup boundary
- if `model` remains strictly required at request construction time, first-use blocked setup becomes awkward or impossible to express through the same startup path
- a single startup authority is easier to reason about than a split preflight-plus-start contract, but it needs an input and failure model that supports first-use reality

### 2.2 Which primary-flow description should be normative in the design document?

Options:

- keep the older sequence in `4.1` as normative and treat the newer `6.1` flow as explanatory
- keep the newer `6.1` authoritative-startup flow as normative and rewrite `4.1` to match it
- collapse the two flows into one single canonical primary-flow description and remove the duplicate sequence entirely

Preliminary recommendation:

- keep only one normative explanation-start flow in the design document
- base that normative flow on the newer authoritative-startup semantics rather than the older direct-start sequence
- either rewrite or remove the older duplicate sequence so implementers do not have to choose between two conflicting readings

Reasoning:

- a design document in `In Review` should not leave two conflicting runtime stories in place
- the more recent direction is already reflected in the updated discovery work and in portions of the specs
- duplicate flow descriptions are acceptable only when they are aligned, not when they describe materially different gates and responsibilities

### 2.3 After a short explanation has streamed partial content and then ends in `error`, should detailed explanation still be allowed?

Options:

- forbid detailed explanation once the short request is in `error`, even if partial short content is visible
- allow detailed explanation if the short request had previously reached a confirmed active phase and left visible partial content, even though its terminal phase is now `error`
- make this conditional on the specific short-request error category, allowing detail only for retryable errors

Preliminary recommendation:

- treat "short explanation produced visible partial content before failing" as different from "short explanation never really started"
- allow detailed explanation to proceed when the short request had already entered an active streamed state and the card still contains meaningful visible short content
- keep startup-blocked or pre-stream short-request failures as blocking conditions for detail start

Reasoning:

- the current design already says partial streamed content should be preserved after an in-stream failure
- if meaningful short content remains visible, a blanket ban on detail because the terminal phase is `error` produces a UI rule that feels more state-machine-driven than product-driven
- the key distinction is whether the short request ever became a real active explanation for that card, not merely whether its final terminal state is `completed`

## 3. RFC Promotion Recommendation

Promote the blockers above into two RFC tracks:

- one RFC for in-page interaction lifecycle semantics
- one RFC for authoritative startup and internal contract semantics

Suggested split:

- interaction-lifecycle RFC:
  - detail-start eligibility after partial short-stream failure
  - any related card-visible state semantics needed to keep the user interaction coherent
- startup-contract RFC:
  - authoritative startup path behavior when no selected model exists yet
  - the canonical explanation-start flow that the design document should treat as normative

## 4. Preliminary Next Steps

- `docs/rfcs/RFC-004-in-page-interaction-lifecycle.md` has been accepted
- `docs/rfcs/RFC-005-authoritative-startup-and-contract-semantics.md` has been accepted
- `docs/design/extension-and-local-service-design.md`, `docs/specs/api-spec.md`, and `docs/specs/extension-state-spec.md` have been updated to reflect the accepted decisions and are now `Approved`
- this discovery document no longer contains active blockers and remains only as traceability for the escalation path

## 5. Change Record

- Created a dedicated discovery document to capture the remaining approval blockers before the next RFC-and-document consolidation pass.
- Updated the document after creating RFC drafts so the blockers now point to explicit decision documents rather than remaining only as discovery questions.
- Marked the blockers as resolved after accepting `RFC-004` and `RFC-005` and propagating the decisions into the approved design and spec documents.
