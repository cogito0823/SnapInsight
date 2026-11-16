# RFC-010: Prompt performance event fields

- Type: normative
- Status: Accepted
- Applicability: current
- Approval: [Approval record](../plans/baseline-approvals.md#prompt-performance-fields)
- Superseded-By: none

## Difference and evidence

[RFC-007 before this amendment](https://github.com/cogito0823/SnapInsight/blob/58697de2141dbf8c6610750f8cb401d67e3b2706/docs/rfcs/RFC-007-prompt-session-lifecycle-and-latency.md) limited timing events to phase, duration, path and mode. The [session implementation design](../design/implementation-design/prompt-session-latency-implementation-design.md) and the [shipped event type at `58697de`](https://github.com/cogito0823/SnapInsight/blob/58697de2141dbf8c6610750f8cb401d67e3b2706/extension/src/content/prompt-api/prompt-performance.ts) also include outcome and optional prewarm, readiness cache and coarse idle-age fields. The default sink emits to the local console only when the developer enables the debug flag.

## Options and decision

| Option | Tradeoff |
| --- | --- |
| Adopt the design's exact field list in RFC-007 | Preserves shipped diagnostics for timeout, warm-up and cache behavior. The additional fields describe processing state and timing. |
| Enforce the narrower list from RFC-007 in code and design | Reduces the information in debug events and loses the extra diagnostic dimensions. Requires a separate implementation change. |

On 2026-11-17 the project owner approved adopting the design's field list in [RFC-007](RFC-007-prompt-session-lifecycle-and-latency.md). The decision preserves the exclusions for text, prompts, output, URLs and identities and the local console scope.
