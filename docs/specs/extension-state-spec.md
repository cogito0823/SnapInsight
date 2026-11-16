# SnapInsight extension state and contracts

- Type: normative
- Status: Approved
- Applicability: current
- Approval: [Documented scope](../plans/baseline-approvals.md#shipped-product)
- Superseded-By: none

## Selection and card state

Selection handling normalizes surrounding whitespace and supported punctuation. Each CJK character counts as one unit. A Latin or digit run with allowed connectors counts as one unit in a segment without CJK. In a mixed segment each Latin letter or digit counts individually. Valid selections have 1–20 units. The selection reader can take an ordinary page range or a nonempty span from supported text-like inputs and `textarea` when the browser exposes selection offsets.

The card moves between `hidden`, `triggerVisible` and `open`. The trigger follows the current valid selection. Opening revalidates the selection and captures a snapshot and anchor. Short and detailed requests have independent states (`idle`, `starting`, `streaming`, `completed`, `error`, `cancelled`), text buffers and identifiers. Page lifecycle, replacement and close cancel affected work. Events from stale requests or page instances cannot update the active card.

## In-process events

`extension/src/shared/contracts/events.ts` defines the envelope `explanations.event` with `requestId`, `senderContext` and the stream event. The local Prompt API client delivers the events to the Content Script handler in-process. The shape is not a worker transport. A start acceptance or failure is returned by the client. `start` identifies the mode and model, `chunk` carries text in `delta`, `complete` signals successful termination and `error` carries the normalized failure. Cancellation clears and aborts work without accepting delayed output.

The error contract has `code`, `message` and `retryable`. The current code set is declared in `extension/src/shared/errors/error-codes.ts`. API absence, download eligibility, downloading and unsupported devices are distinct readiness outcomes. Timeout paths distinguish readiness, acquisition, first token and stalled streaming. Model preparation uses a user action on the status page. Retryability is determined by the active error mapping.

## Extension messages and persistence

| Message | Fields and destination |
| --- | --- |
| `snapinsight/open-device-status` | Type only. Content requests the Service Worker to open the options page. |
| `prompt-keeper.lifecycle` | Content to worker. Payload `action` is `touch`, `visibility` or `remove`. Payload includes a nonempty `pageInstanceId` and boolean `hidden`. The worker derives tab/frame identity from the sender. |
| `prompt-keeper.evict` | Worker to the relevant tab/frame. Payload includes `pageInstanceId` and `reason: lru_limit`. Content discards the matching keeper. |

The worker stores keeper registry metadata in `chrome.storage.session` under `promptKeeperRegistry`. The extension has no local HTTP API, streaming NDJSON endpoint or persisted selected model setting. The older contract is available as [historical API specification](api-spec.md). Session ownership and performance defaults are in the [session design](../design/implementation-design/prompt-session-latency-implementation-design.md).
