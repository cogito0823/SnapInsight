# Documentation governance

<a id="DOC-CURRENT"></a>
## DOC-CURRENT — Sources of truth

Organize documents by purpose. A project enables the categories it needs and maps them to actual paths in its guide and index.

| Category | Purpose |
| --- | --- |
| Discovery | Open questions, scope clarification and evidence. Prefer a question, options, preliminary recommendation and reasoning for each substantive topic. |
| RFC | One decision per document, with context, viable alternatives, tradeoffs, risks, recommendation, status and implications. Gaps in numbering are acceptable. |
| PRD | Agreed goals, users, scope, non-goals, flows, failure behavior and testable acceptance criteria. Record substantive requirement changes. |
| Design | Responsibilities, architecture, constraints, interactions and module behavior derived from approved requirements and decisions. |
| Specifications | Fields, formats, validation, state and interface contracts. Follow the approved PRD and design and the applicable accepted RFCs. |
| Plans | Execution order, milestones, risks, verification and delivery evidence. Base implementation and rollout plans on settled product and technical decisions. Resolve pending decisions before planning the work that depends on them. |

Use English filenames and kebab case, preserving uppercase RFC and PRD prefixes. Keep filenames and major document categories stable through maturity changes. Include related documents when useful. Choose headings and sections that fit the document.

Use Mermaid for diagrams. Add a simple product flow in the PRD or design when the flow is central and could be misunderstood. Use design for interaction state and settled architecture, and the relevant RFC for architecture comparisons. Decide whether a diagram is helpful for each document.

Discovery may contain unresolved items and temporary contradictions. Refine rough notes into focused questions as understanding improves, splitting broad topics into separate files. Freeform notes are appropriate for editorial work or when a question template adds unnecessary friction. Put unresolved decisions in discovery or an RFC and carry settled outcomes into the applicable PRD, design, specification or plan. Keep implementation references usable without reopening the underlying technical debate. Put interface fields, schemas, payloads and protocol details in specifications.

### When to write an RFC

Create an RFC for a new decision whenever any of these conditions applies:

- Viable approaches have meaningful tradeoffs.
- The decision affects architecture, system boundaries or long-term maintainability.
- The decision affects multiple modules or document types.
- The decision changes interfaces, integration contracts or operational behavior.
- Reversing it would be expensive or disruptive.
- The decision needs an explicit recommendation and approval.

Local low-risk and editorial changes, implementation already directed by an accepted document, and topics without meaningful alternatives usually need no new RFC. If a new decision without alternatives independently meets a trigger above, use the RFC to record that decision and its rationale.

The index distinguishes current normative documents, proposals, current records and historical documents. A current record can describe ongoing work. Approved requirements, an accepted RFC and applicable design or contracts guide implementation. A later accepted decision governs over an earlier discovery note within the same scope. A proposal can inform review. A historical source captures the decisions and test evidence of its own period. Replace historical links to removed working files with fixed commit and path references.

<a id="DOC-APPROVAL"></a>
## DOC-APPROVAL — Status, revision and authority

Follow the project’s adopted metadata and index format. Place lightweight metadata near the top of formal documents. Use status to communicate maturity and applicability to show which baseline the document serves. Use version or revision identifiers where they help trace the evidence. Drafts may be incomplete. At review, check each document against its category responsibilities above. Reviewers recommend dispositions. The project owner authorizes the scope and the record names the person, date, source, scope and revision.

Start formal documents as `Draft`. Refine the open questions in discovery, compare options in an RFC where required, and reflect the settled decisions in the formal document. Mark it `In Review` when ready for structured review. Resolve issues that materially affect implementation before approval. Record RFC decisions as `Accepted` or `Rejected`. Use `Approved` for approved requirements, designs, specifications and plans, and `Implemented` where the implementation is verified and the project’s status format permits it. If a new material issue arises after approval, open it in discovery or an RFC and handle the affected scope with the revision rules below.

| Document | Review for approval |
| --- | --- |
| PRD | Clear goals, target users, core use cases, MVP scope and non-goals. Describe main interactions, failures, fallbacks and testable acceptance criteria. Resolve major technical choices or track them explicitly in an RFC. |
| RFC | Scoped decision, alternatives, tradeoffs, risks, recommendation and explicit decision status. |
| Design | Conformance to the approved requirements and applicable accepted decisions. Define component responsibilities, flows, state transitions, assumptions and constraints. |
| Specification | Stable supporting requirements and design. Define fields, schemas, request and response behavior, validation and relevant edge cases. |

Keep a PRD change record for changes to scope, behavior, acceptance criteria or constraints. Purely editorial edits need no detailed entry unless they materially clarify meaning.

An editorial revision may retain existing approval. A substantive revision requires authorization that covers the changes. Keep pending amendments separate from the current approved text. On adoption, update the current text, approval reference and change record together. Mark fully displaced decisions or contracts as superseded and link the current replacement. If only part of a decision changes, state the affected scope and retain the applicable parts. Record gaps in historical approval evidence as unverified.
