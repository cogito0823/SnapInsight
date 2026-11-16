# Implementation workflow

<a id="FLOW-START"></a>
## FLOW-START — Start from project documents

Use the project guide, index and relevant current documents. Prefer editing an existing document for substantive discussion. Create a focused document when none fits. A document explicitly referenced by the user, including with `@path`, is the primary surface for that discussion. Use chat for status, document pointers, clarification and confirming the next step.

Record consequential decisions, resolved questions, dependencies, constraints or lasting rules in the project documents. Record material ambiguity found during discussion or implementation as specific questions in the relevant discovery document. Prefer collecting the project owner’s answers there, and read the updated document before pursuing dependent decisions. Move decision-worthy questions into an RFC, record the chosen direction explicitly and reflect accepted outcomes in the applicable implementation references. Resolve conflicts using explicit, applicable approvals and replacement records. Continue work that does not depend on an unresolved decision. Brief exchanges about wording or a small issue can stay in chat when the resulting change is captured where it belongs.

| Work | Expected record |
| --- | --- |
| Read-only question | Evidence relevant to the answer |
| Editorial change | Target document and appropriate structural verification |
| Implementation within approved scope | Progress entry, affected documents and validation |
| Material scope, architecture or contract change | Discovery for unresolved questions, RFC when the documentation rules require one, applicable approval, and updated formal guidance before implementation |
| Release | The project’s release procedure and evidence |

Before starting or resuming implementation, read the current plan, progress, checklist and the applicable product, architecture, design and contract references identified by the project guide. Use the approved product requirements for user behavior, scope and acceptance. Use the architecture and repository design for runtime ownership, module boundaries and file placement. Use the applicable implementation-level design as the primary guide for code structure and execution in its area. Formal project documents are the source of truth for defined workflow, contracts and structure. Prefer the current batch unless the plan justifies a different order. Define progress, deliverables and acceptance evidence before starting a material batch. Update the applicable references before changing runtime ownership, state shape, contract fields or error semantics.

<a id="FLOW-VERIFY"></a>
## FLOW-VERIFY — Verify against the change

Use the project guide to select checks. Verify behavior, affected docs and privacy or operational boundaries as applicable. Keep automated, real-environment and review evidence distinct. Record commands, results, evaluated revision or working snapshot and outstanding checks. The project may require independent or owner review. Use a documented rationale for a finding of no documentation impact.

<a id="FLOW-CLOSE"></a>
## FLOW-CLOSE — Deliver and leave an accurate record

Record implementation start and current status in project progress. Before marking a batch complete, satisfy its applicable checks and document-to-implementation alignment review in the plan and checklist. Update the checklist when the batch is complete. Record outstanding checks and keep incomplete items open. Report what was verified, what remains open, and the scope of any genuine approval. Discuss and review changes to rules or checks explicitly. A passing check is evidence for the checks it actually performed.
