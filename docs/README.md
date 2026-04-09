# Documentation Structure

This directory stores project documents for `SnapInsight`.

The documentation is organized by purpose so that exploratory discussions, decision records, and implementation guidance do not get mixed together.

## Directory Layout

```text
docs/
  README.md
  discovery/
  rfcs/
  prd/
  design/
  specs/
  plans/
```

## Directory Responsibilities

### `discovery/`

Used for exploratory discussion materials.

Typical contents:
- requirement clarification questions
- open issues
- background notes
- scope drafts
- rough discussion records

Rules:
- content here may be incomplete, tentative, or even conflicting
- `discovery` documents are not final implementation references
- once a topic requires explicit option comparison or a decision, it should be promoted into `rfcs/`
- discovery documents should be split by major topic

### `rfcs/`

Used for proposal and decision documents.

Typical contents:
- architecture options
- technical tradeoff analysis
- integration strategy comparisons
- formal recommendations and final decisions

Rules:
- each RFC should focus on one decision topic
- RFCs should compare options, tradeoffs, risks, and recommendation
- RFCs should include a status such as `Draft`, `In Review`, `Accepted`, `Rejected`, or `Superseded`
- accepted RFCs serve as formal decision references

### `prd/`

Used for formal product requirements documents.

Typical contents:
- finalized product goals
- scope and non-goals
- user flows
- acceptance-oriented functional requirements

Rules:
- PRD documents should reflect agreed requirements
- PRD should not be used to host unresolved technical option debates

### `design/`

Used for implementation design documents.

Typical contents:
- extension interaction design
- Python service design
- module-level technical design

Rules:
- documents here describe how an accepted direction will be implemented
- design documents should follow accepted RFCs and the PRD

### `specs/`

Used for specification documents.

Typical contents:
- API fields
- request and response payloads
- schemas
- validation rules
- data contracts

Rules:
- interface fields and protocol details should live here instead of being mixed into broader design documents
- spec documents should follow accepted PRD, RFC, and design decisions
- the default API specification file for this project can be `docs/specs/api-spec.md`

### `plans/`

Used for execution planning documents.

Typical contents:
- implementation plans
- milestone breakdowns
- risk assessment
- rollout and testing plans

Rules:
- planning documents should assume major product and technical decisions are already made

## Collaboration Rules

The team will use document-first discussion.

Rules:
- discussions with the assistant should happen through referenced files such as `@docs/discovery/requirements-scope-questions.md`
- exploratory conversations and requirement clarification go into `discovery/`
- option comparison and decision-making go into `rfcs/`
- final implementation guidance belongs in `prd/`, `design/`, `specs/`, and `plans/`
- when there is any conflict, later accepted decisions override earlier discovery notes

See also:
- `.cursor/rules/assistant-agreement.mdc`

## Naming Conventions

Rules:
- use English file names only
- use `kebab-case` for general document files
- keep `RFC` and `PRD` uppercase when they are part of a file name

Examples:
- `docs/discovery/requirements-scope-questions.md`
- `docs/rfcs/RFC-001-architecture-options.md`
- `docs/prd/PRD-snapinsight.md`
- `docs/specs/api-spec.md`

## Current Usage

Current baseline discovery document:
- `docs/discovery/requirements-scope-questions.md`

Working agreement document:
- `.cursor/rules/assistant-agreement.mdc`
