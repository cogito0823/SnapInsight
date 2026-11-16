# Approval and baseline evidence

- Type: record
- Status: Implemented
- Applicability: current
- Approval: none
- Superseded-By: none

<a id="governance-migration"></a>
## Governance migration

- Confirmed by the project owner on 2026-11-17 in this project chat.
- Source excerpt: “方案通过，请按照方案重构文档，完成后并进行多轮复核”.
- Approved scope: the rewritten RFC-008, its checker and reuse specification, rollout plan, and migration of repository documentation and rules. The approval applies to the design presented immediately before this instruction. Product behavior changes are outside this migration.
- Revision: the reviewed RFC, spec and plan in the workspace based on `2674a9b630dca079b07dab266451ae7d3afd97f7`. The owner message identifies the immediately preceding proposal in this chat.

<a id="shipped-product"></a>
## Shipped product reference

- Confirmed scope: the owner authorized documenting the existing Prompt API baseline in the 2026-11-17 governance migration. The PRD, architecture, and state reference document observable 0.3.4 behavior within that scope.
- Revision evidence: `2674a9b630dca079b07dab266451ae7d3afd97f7`, `README.zh-CN.md`, `extension/src/`, and [0.2.0 productization validation](../product/productization-validation.md).
- Historical approval of the original Prompt API migration is unverified. Treat changes to product scope or behavior as separate decisions.

<a id="session-lifecycle"></a>
## Session lifecycle evidence

- Source: the Accepted change record in `2674a9b630dca079b07dab266451ae7d3afd97f7:docs/rfcs/RFC-007-prompt-session-lifecycle-and-latency.md` and the Approved design at that revision.
- Scope: page-scoped keeper, isolated request sessions, bounded coordination, cancellation and timing. The existing RFC records authorized implementation on 2026-08-13. The original approval message and identity are unverified. The 2026-11-17 owner authorization covers preserving this shipped baseline in the document migration.
