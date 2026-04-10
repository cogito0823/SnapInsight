# Extension and Local Service Design Review Questions

## Document Status

- Status: Implemented
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/design/extension-and-local-service-design.md`
  - `docs/design/repository-and-code-structure.md`
  - `docs/specs/api-spec.md`
  - `docs/specs/extension-state-spec.md`
  - `docs/discovery/extension-local-service-doc-alignment.md`

## Purpose

This discovery document records a second-pass design review for `docs/design/extension-and-local-service-design.md`.

The goal is to capture implementation-risk questions in the same discovery format used elsewhere in the project: compare viable options, record a preliminary recommendation, and explain the reasoning before any further design or spec updates are made.

## 1. Review Summary

Original review concerns:

- Card lifetime may be too tightly coupled to live browser-selection state.
- Detailed-request start and retry rules are not explicit enough for consistent implementation.
- The model snapshot semantics for one open card are not clearly defined.
- Blocked setup states do not yet have one clearly defined in-card behavior model.

No new architecture-level conflict was found with the accepted RFCs. These were implementation-shaping questions within the current architecture baseline.

Current scope conclusion:

- In the current project direction, these questions should be resolved in `docs/design/extension-and-local-service-design.md` and related specs rather than promoted into a new RFC.
- Hover-triggered explanation is treated as already fixed by the PRD unless the project later explicitly reopens that product interaction choice.
- The current review pass has now been reflected into `docs/design/extension-and-local-service-design.md`, `docs/specs/extension-state-spec.md`, and the relevant internal-contract portions of `docs/specs/api-spec.md`.
- There are no active unresolved discovery blockers left in this document for the current v1 direction.

## 2. Interaction and State Questions

### 2.1 How should card lifetime relate to live browser-selection validity?

Options:

- Keep the card bound to the current live DOM selection at all times
- Freeze a selection snapshot once the card interaction is accepted, then keep the card open until explicit close, click-away, or replacement
- Keep live-selection binding for normal page text but use snapshot behavior only for `input` / `textarea`

Preliminary recommendation:

- Freeze the interaction to a card-scoped selection snapshot once the user has successfully triggered the card.
- Do not close the card merely because the browser's live selection highlight disappears.
- Reset the card only on explicit close, click-away, replacement by a new valid selection, or document-instance change.

Reasoning:

- Real browser selections often collapse during perfectly normal interaction, such as moving from selection to trigger or card.
- The PRD says the card should remain visible after it appears; tying lifetime too directly to live selection would make that behavior fragile.
- A card-scoped snapshot is easier to reason about in state management and more consistent with retry and request-replacement logic.

Resolution status:

- Resolved in design and state spec.
- The accepted card interaction now uses a card-scoped snapshot, and loss of the browser-native selection highlight alone no longer forces a reset.

### 2.2 When should detailed explanation be allowed to start, and how should repeated detail actions behave?

Options:

- Allow detailed explanation only after short explanation fully completes
- Allow detailed explanation as soon as the card exists, even before the short explanation stream is actually established
- Allow detailed explanation only after the short explanation has entered a confirmed active phase for the same card, and explicitly deduplicate repeated detail actions while a detail request is active

Preliminary recommendation:

- Allow detailed explanation only after the short explanation for the current card has actually reached a confirmed active phase such as `streaming` or `completed`, not merely after setup acknowledgement.
- If the user clicks `查看更多` before that point, keep the detail action disabled or pending rather than creating a second speculative stream immediately.
- Treat repeated detail triggers during an active detail request as deduplicated rather than opening parallel detail streams.
- Define retry as a cancel-and-replace or replace-in-place operation for the detail request state, not as an additional concurrent detail stream.
- If the short explanation fails before reaching an active phase, require the user to resolve or retry that affected state before starting detailed explanation.

Reasoning:

- The current design already expects short and detailed areas to coexist, so a full "wait until short completes" rule may feel unnecessarily restrictive.
- The extension contract already distinguishes setup acknowledgement from the forwarded stream `start` event, so "card exists" or "request accepted" is not a precise enough boundary for starting detail reliably.
- Leaving repeated clicks undefined invites duplicate detail streams and inconsistent UX.
- A single explicit rule for detail start, deduplication, and retry will make both content-script state and worker behavior more stable.

Resolution status:

- Resolved in design and state spec.
- Detailed explanation is now gated on the short request reaching a confirmed active phase, and repeated detail actions are defined as deduplicated or replacement behavior rather than parallel streams.

### 2.3 How should one open card relate to global selected-model changes?

Options:

- Always use the latest persisted selected model, even for an already open card
- Freeze one effective model snapshot per open card after explanation startup is established, but allow an explicit model-selection action in the same card to replace that snapshot before the next request
- Freeze the model only per request, allowing short explanation and later detail retry within one card to use different models

Preliminary recommendation:

- Freeze one effective model snapshot for each open card once explanation startup has been successfully established for that card.
- Store that snapshot in page-local state and reuse it for short explanation, detailed explanation, and per-area retry within the same card by default.
- Do not let unrelated global selected-model changes silently alter an already open card.
- If the user explicitly resolves a model-selection-blocked state in the same card, the card may update its effective model snapshot before the next explanation request begins.
- Apply global selected-model changes to newly created card interactions by default.

Reasoning:

- The current design already separates `activeModel` from per-request `model`, which suggests card-level model ownership but does not define its runtime semantics.
- If the options page changes the global model while a card is open, silently switching models mid-card would be confusing.
- A frozen card-scoped model keeps one interaction semantically coherent and avoids mixed-model output in one visible card unless that is explicitly chosen as a product behavior.
- At the same time, the same card must still be able to recover from a missing or invalid model selection through an explicit user action, so the snapshot cannot be treated as immutable in every blocked-setup case.

Resolution status:

- Resolved in design and state spec.
- The card now holds an effective model snapshot by default, while still allowing explicit in-card model-selection recovery before the next request begins.

### 2.4 How should blocked setup states be presented in the in-page interaction?

Options:

- Keep the trigger visible and handle blocked states outside the card
- Always open the card first, then render blocked setup states inside the card
- Use mixed behavior: model-selection-blocked states open an in-card picker, while other setup failures are handled elsewhere

Preliminary recommendation:

- Use the card as the primary blocked-state surface for hover-triggered explanation flows.
- Limit the lightweight in-page picker to cases where explanation is blocked specifically by missing or invalid model selection.
- Render `no_models_available`, `service_unavailable`, and `local_service_conflict` as stable in-card blocked or error states with context-appropriate guidance.

Reasoning:

- The PRD interaction begins from the in-page trigger and card, so diverting some setup outcomes into other surfaces would make the flow harder to predict.
- Different setup failures need different CTAs, but they still belong to one coherent interaction surface.
- Constraining the in-page picker to model-selection-blocked cases keeps the card from turning into a generic settings surface while still supporting first-use setup.

Resolution status:

- Resolved in design.
- The card is now the primary blocked-state surface for hover-triggered flows, and the lightweight in-page picker is constrained to model-selection-blocked cases.

### 2.5 Should the hover-triggered in-page flow always do a separate selected-model read before explanation startup?

Options:

- Always read selected-model state first, then issue a separate explanation-start request
- Use one authoritative explanation-start path for hover-triggered flows, and let it return either accepted startup or a blocked/setup failure
- Keep the separate selected-model read only for first use, but skip it once a model has previously been selected

Preliminary recommendation:

- Avoid making a mandatory separate selected-model read the authoritative gate for every hover-triggered explanation.
- Prefer one authoritative startup path for in-page explanation attempts, with blocked/setup outcomes returned from that same startup flow.
- Use cached or already-loaded selected-model state only as a UI convenience hint, not as the required precondition for issuing the startup request.

Reasoning:

- The current design sequence adds a preflight round trip before the real explanation-start request, which increases latency in the most time-sensitive interaction path.
- A separate preflight read also creates a race where selected-model state can change between "read model state" and "start explanation stream".
- The worker already owns validation and error normalization, so a single authoritative startup path is easier to keep consistent.

Resolution status:

- Resolved in design and API/state spec guidance.
- `explanations.start` is now treated as the authoritative startup path for in-page explanation attempts, while selected-model reads remain convenience-only.

### 2.6 How should the worker-to-content-script bridge handle streamed chunk granularity?

Options:

- Forward every upstream chunk immediately as an internal event
- Buffer or coalesce internal chunk delivery in small batches while preserving order
- Buffer all chunks until completion before rendering

Preliminary recommendation:

- Preserve streaming behavior end to end, but allow small internal batching or coalescing on the worker-to-content-script bridge and/or in the content-script render path.
- Keep ordering guarantees and terminal-event semantics exact, while leaving room to merge very small token chunks into fewer UI updates.

Reasoning:

- The localhost API may emit many small chunks, and naively forwarding each one as its own internal message can increase message churn and UI re-render pressure.
- The user-facing product requirement is progressive rendering, not necessarily one UI update per upstream token.
- Small internal batching can reduce overhead without changing the public API contract or losing the perceived streaming effect.

Resolution status:

- Resolved in design and API/state spec guidance.
- Small internal chunk coalescing is now explicitly allowed as long as ordered progressive rendering and terminal-event semantics remain unchanged.

### 2.7 How should hover-triggered explanation startup avoid accidental expensive requests?

Options:

- Start the explanation request immediately on first hover
- Keep hover as the trigger, but require a short hover-intent delay before starting the request
- Keep hover as the trigger, but defer request start until the pointer remains stable over the trigger or card boundary long enough to indicate intent

Preliminary recommendation:

- Keep hover-triggered explanation to stay aligned with the PRD interaction.
- Add a short hover-intent threshold before starting the actual explanation request, while still allowing the trigger and card to feel responsive.
- Treat the exact threshold as design/spec guidance, not as a new RFC-level interaction decision.

Reasoning:

- Immediate request start on any transient hover may produce unnecessary local-model work and noisy cancellation churn.
- A short intent threshold can reduce accidental requests without materially changing the visible interaction model.
- Because hover is already part of the approved product flow, the relevant question here is how to make hover-triggered startup more robust rather than whether to replace it.

Resolution status:

- Resolved in design/state guidance.
- Hover-triggered explanation remains the product interaction, and a short hover-intent threshold is now treated as a permitted implementation optimization rather than an open product decision.

## 3. Preliminary Next Steps

Current follow-up boundary:

- Keep the current RFC set unchanged for this review pass.
- Treat this discovery note as resolved for the current v1 direction.
- Reopen discovery or RFC work only if the project later changes product interaction triggers, explanation concurrency rules, or model-selection semantics in a way that materially alters behavior.

## 4. Change Record

- Created a dedicated discovery document for second-pass design-review questions and structured it using the project's standard discovery format with options, preliminary recommendations, and reasoning.
- Updated the document after the design/spec follow-up pass so each question records a concrete resolution status and the note no longer carries active v1 blockers.
