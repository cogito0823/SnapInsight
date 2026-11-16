# SnapInsight extension architecture

- Type: normative
- Status: Approved
- Applicability: current
- Approval: [Documented scope](../plans/baseline-approvals.md#shipped-product)
- Superseded-By: none

## Runtime ownership

| Area | Ownership |
| --- | --- |
| `extension/src/content/` | Selection, anchor and Shadow DOM card. Owns each document's short and detailed requests, streaming output, cancellations and Prompt API sessions. |
| `extension/src/options/` | Device status and user-activated model preparation. The first installation and toolbar can open the device status page. |
| `extension/src/worker/` | Installation, toolbar, opening status and extension-wide keeper metadata. Uses `chrome.storage.session` to restore the keeper registry across worker suspension. |
| `extension/src/prompt-api/` | Shared types and access to Chrome `LanguageModel`, readiness handling and prompt definitions. |
| `extension/src/shared/` | Serializable contracts, request and error types and localization. |

Content Script runs inference in the isolated world. Chrome owns the model download and runtime. The worker coordinates at most five registered page keepers using least recently used ordering with hidden entries preferred for eviction. It can send targeted eviction messages and removes closed tabs from its registry. Eviction limits registered keepers. Requests have separately cleaned up sessions. The extension uses no HTTP inference endpoint, Ollama adapter, desktop companion or offscreen model host.

## Data and packaging

Selection snapshots and generated output live in the document. The worker receives lifecycle and routing metadata. The session registry stores tab ID, frame ID, page instance, hidden state and last use time. Text, prompt, result, URL and title stay out of the registry. Local timing diagnostics use coarse timing and phase attributes.

The device status page owns the model preparation timer. It uses `chrome.storage.local` to restore elapsed time when the page reopens. The [state and storage contract](../specs/extension-state-spec.md) describes when the timestamp is written and cleared.

`extension/public/manifest.json` defines the Chrome MV3 entry points, `storage` permission and top-level content injection. Build `extension/dist/` with both Vite targets. Only the extension build output belongs in the release ZIP.

## Related references

- [Product requirements](../prd/PRD-snapinsight.md)
- [Current contracts](../specs/extension-state-spec.md)
- [Session decision](../rfcs/RFC-007-prompt-session-lifecycle-and-latency.md)
- [Session implementation design](implementation-design/prompt-session-latency-implementation-design.md)
- [Privacy policy](../product/privacy-policy.md)
