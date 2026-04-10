# Post-Batch-8 Next Phase Candidates

## Document Status

- Status: Draft
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/plans/implementation-plan.md`
  - `docs/plans/project-progress.md`

## Purpose

This discovery document organizes candidate directions after `Batch 8` closed.

The goal is to separate:

- near-term implementation work that improves the current v1 baseline
- productization work that makes the current baseline easier to install, evaluate, and share
- v2-level ideas that likely require broader scope clarification before implementation

## 1. What should the next coding batch optimize first?

Options:
- Continue with focused in-page UI polish on the current card experience
- Switch immediately to packaging and release-readiness work for broader use
- Start v2 feature expansion right away

Preliminary recommendation:
- Use the next coding batch for focused v1 polish rather than broad v2 expansion.
- Keep the batch narrow and centered on card readability, information hierarchy, and small interaction refinements.

Reasoning:
- `Batch 8` produced a stable, release-ready baseline, but real usage already exposed a few card-level readability issues.
- These issues are low-risk, user-visible, and now easy to evaluate with manual verification.
- Jumping directly into v2 or broad productization would mix UX polish, distribution, and scope expansion into one batch.

Candidate scope for this batch:
- increase the default card width moderately so common Chinese explanation lines wrap less aggressively
- review whether the header should show the plugin name at all, or instead use a lighter utility-style top bar
- strengthen visual distinction between section labels such as `简短解释` and `详细解释` and the generated body text
- refine spacing, divider weight, and button prominence so the card reads more like a compact reading tool and less like a debug panel
- verify the adjusted layout on both short and long explanations

Out of scope for this batch:
- history
- favorites
- account systems
- cloud models
- complex multi-surface settings expansion

## 2. What does “productization” mean for the current SnapInsight baseline?

Options:
- Treat productization mainly as visual polish
- Treat productization mainly as packaging and onboarding
- Treat productization as a combination of packaging, onboarding, operational clarity, and light UX polish

Preliminary recommendation:
- Treat productization as the work required to let a new user install, configure, understand, and trust the current baseline with minimal hand-holding.

Reasoning:
- The current implementation is already usable for the project owner, but broader use still depends on local setup knowledge.
- The biggest productization gap is not core explanation logic; it is reducing friction around installation, first-run setup, model readiness, and troubleshooting.

Candidate productization tracks:
- installation and startup:
  - decide whether the local Python service remains manual-start in the next milestone or gets a more guided launch path
  - improve `README.md` and any future user-facing setup docs into a concise install-and-run path
- onboarding:
  - first-use guidance for "install Ollama -> pull a supported model -> choose a model -> test on a page"
  - clearer in-product empty and failure states when service or models are missing
- packaging:
  - define what a releasable extension package and service package look like for non-owner usage
  - decide whether packaging needs a separate RFC once installer and distribution choices appear
- operational confidence:
  - simple version display or diagnostics surface for extension and local service compatibility
  - clearer recovery guidance for local-service unavailable, no-models, and stale-model situations

Suggested boundary:
- Keep “productization” for the next milestone at the level of onboarding, packaging, and operational clarity.
- Do not redefine core architecture unless a packaging decision forces it.

## 3. What should count as a real v2 direction?

Options:
- Keep v2 as “more polish on the same product”
- Define v2 as “same interaction model, but meaningfully stronger utility”
- Define v2 as “a larger knowledge-assistant product” with history, saved items, and broader surfaces

Preliminary recommendation:
- Define v2 as a meaningfully stronger utility layer on top of the current interaction, not just another polish pass.
- Treat v2 planning as a separate discovery track before implementation.

Reasoning:
- The PRD explicitly keeps v1 narrow: short selection, same-card explanation, local-only service, no history, no favorites, no cloud models.
- If v2 is not defined clearly, it will blur together many unrelated ideas and weaken batch discipline.

Candidate v2 themes worth exploring:
- explanation quality and control:
  - richer output structure such as examples, synonyms, contrasts, or domain-specific variants
  - per-mode prompt tuning or user-selectable explanation styles
- reading workflow support:
  - lightweight save or pin behavior
  - revisit recent explanations in a constrained local-only way
- input and compatibility expansion:
  - broader text contexts
  - controlled support for more page types where technically feasible
- model and runtime flexibility:
  - clearer support matrix for recommended local models
  - possibly broader adapter support beyond the current local Ollama path, if product direction changes

Candidate v2 themes that should not be started casually:
- account systems
- cloud sync
- large knowledge-base features
- multi-device persistence

## 4. Suggested Sequencing

Recommended order:

1. `Batch 9`: focused card UX polish and readability improvements
2. `Batch 10` candidate: productization baseline for setup, onboarding, and packaging clarity
3. v2 discovery: write a separate discovery document or RFC only after the above two areas are stable

Why this order:
- It protects the newly stabilized baseline.
- It converts immediate user feedback into visible quality improvement quickly.
- It keeps productization separate from bigger scope expansion.

## 5. Working Recommendation

If only one next step should be chosen now:

- choose a narrow `Batch 9` focused on card UX polish
- treat productization as the following milestone
- keep “v2” in discovery until the desired product shape is explicit

## 6. Open Questions

- Should the card remain intentionally compact, or should it move closer to a narrow reading panel width?
- Should the top header become minimal utility chrome instead of showing the `SnapInsight` name?
- How much markdown richness is appropriate before the card starts violating the PRD’s v1 boundary against complex rich text?
- What minimum packaging outcome would make the product feel shareable beyond the project owner: better docs only, a service startup helper, or a real installer path?
- Which v2 theme matters most: better explanations, better reading workflow, or broader compatibility?
