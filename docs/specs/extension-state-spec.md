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

The card offers **Open device status** for `prompt_api_unavailable`, `model_download_required`, `model_downloading` and `device_unsupported`. It hides retry for these codes regardless of the `retryable` flag. Other failures show retry only when `retryable` is true. An explicit cancel can surface `request_cancelled` through the `error` phase. Card teardown discards the interaction and its pending output.

## Device status

The page begins at `checking`. Availability maps `available` to `ready`, `downloadable` and `downloading` to their namesake phases, and API absence or `unavailable` to `unsupported`. A user action starts `preparing` from `downloadable`, `downloading` or `error`. When reattaching from `downloading`, the percentage describes remaining work. Unknown progress and the installation stage use an indeterminate indicator. A failed explicit readiness check or preparation enters `error`. While downloading or preparing, the visible page polls readiness every three seconds and resumes polling when shown again.

## Extension messages and persistence

| Message | Fields and destination |
| --- | --- |
| `snapinsight/open-device-status` | Type only. Content requests the Service Worker to open an active tab at the options page. The worker responds asynchronously with `{ ok: boolean }`. |
| `prompt-keeper.lifecycle` | Content to worker. Payload `action` is `touch`, `visibility` or `remove`. Payload includes a nonempty `pageInstanceId` and boolean `hidden`. The worker requires a sender tab ID, defaults a missing frame ID to `0`, and responds asynchronously with `{ ok: boolean }` to handled messages. |
| `prompt-keeper.evict` | Worker to the relevant tab/frame. Payload includes `pageInstanceId` and `reason: lru_limit`. Content discards the matching keeper. |

The worker stores keeper registry metadata in `chrome.storage.session` under `promptKeeperRegistry`. The extension has no local HTTP API, streaming NDJSON endpoint or persisted selected model setting. The older contract is available as [historical API specification](api-spec.md). Session ownership and performance defaults are in the [session design](../design/implementation-design/prompt-session-latency-implementation-design.md).

The device status page uses `chrome.storage.local` key `modelPreparationStartedAt` for elapsed time display. On startup it accepts a finite number in epoch milliseconds or treats the value as absent. In `downloading` or `preparing`, it writes `Date.now()` if there is no start value. A transition to `ready`, `downloadable`, `unsupported` or `error` resets the in-memory timer and writes `null` to the key. Polling that temporarily reports `downloadable` during active preparation or download leaves the active state intact. Closing the page or restarting Chrome does not clear the key. The timer measures time since the page began or first observed preparation, with any stored start value reused. It is not Chrome's own download start time.
