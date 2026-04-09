# RFC-003: Python Service and Ollama Integration

## Document Status

- Status: Accepted
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/discovery/technical-architecture-questions.md`
  - `docs/rfcs/RFC-001-extension-architecture.md`
  - `docs/rfcs/RFC-002-local-communication-and-security.md`

## Context

SnapInsight 的解释能力由本地 Python 服务调用本机 Ollama 提供。根据 PRD，第一版必须满足：

- 扩展只能访问本地 Python 服务，不能直接访问外网或直接对接复杂模型契约
- 支持获取本机可用模型列表
- 用户首次使用时必须显式选择模型
- 短解释和详细解释都需要流式显示
- 用户切换选区或关闭卡片时，需要尽量取消旧请求

因此需要明确 Python 服务本身的职责、对扩展暴露的接口形态、以及它与 Ollama 的集成方式。

## Decision Drivers

- 需要稳定、清晰的本地 API 契约
- 需要适配流式响应
- 需要把 Ollama 细节封装在服务端，避免扩展直接依赖上游变化
- 需要让错误语义足够清晰，便于前端展示友好提示
- 需要保持 v1 的实现和运维复杂度可控

## Options

### Option A: 扩展直接调用 Ollama，本地 Python 服务只做薄代理

Description:
- 模型列表和解释请求尽量直接对接 Ollama，Python 服务只做最少包装。

Pros:
- 额外服务逻辑少

Cons:
- 扩展将直接依赖 Ollama 契约
- 难以统一产品级错误语义
- 难以加入 PRD 所需的模式控制、提示词模板和输出规整

### Option B: Python 服务作为完整适配层，对扩展暴露稳定产品 API

Description:
- 扩展只调用 SnapInsight 本地 API。
- Python 服务负责模型发现、提示词组织、调用 Ollama、流式转发和错误映射。

Pros:
- 扩展与 Ollama 解耦
- 更适合定义稳定的 v1 API 契约
- 更便于控制提示词模板、模式和错误语义

Cons:
- 服务端实现工作量更高

### Option C: Python 服务一次性返回短解释和详细解释

Description:
- 前端只发一次请求，服务端同时生成短解释和详细解释并返回。

Pros:
- 前端交互路径简单

Cons:
- 不符合 PRD 中“先短解释，点击后再请求详细解释”的交互要求
- 会增加不必要的生成成本和等待时间

## Tradeoffs

Option A 对实现初期看似轻量，但会把 Ollama 的接口细节、错误差异和未来变化直接暴露给扩展层，不利于产品化演进。Option C 与 PRD 的交互规则冲突，也会浪费生成资源。

Option B 让 Python 服务成为清晰的产品适配层：扩展只关心“模型列表”和“解释请求”，而不关心 Ollama 的具体端点与返回细节。这更符合当前项目的本地中间层定位。

## Recommendation

Adopt Option B.

具体推荐结构：

- 使用 `FastAPI` 作为本地服务框架。
- v1 服务由用户手动启动，不引入托盘进程或自动拉起机制。
- 扩展只调用 SnapInsight 本地服务，不直接调用 Ollama。
- 服务对扩展提供稳定 API，至少包括：
  - `GET /health`
  - `GET /v1/models`
  - `POST /v1/explanations/stream`
- `POST /v1/explanations/stream` 使用统一请求结构，通过 `mode` 字段区分 `short` 与 `detailed`。
- 服务内部调用 Ollama 生成接口，并把流式结果转为稳定的 SnapInsight 事件流输出。
- 如果流尚未建立就发现请求无效、来源非法或模型不可用，应使用明确的 HTTP 错误状态返回。
- 如果流已经建立，则后续失败必须通过终止型流事件表达，而不是切换为新的 HTTP 状态。
- PRD 中的 `1-20` 选区规则继续作为产品约束由扩展侧执行；服务端可以保留更宽松的防御性文本上限，但这不代表产品支持更长输入。
- `1-20` 的产品边界必须采用明确的混合计数规则，而不能留给各实现自行解释。
- 混合脚本计数规则应采用段级定义并附带示例，覆盖英文连字符词、数字词和中英混合短串。

## Decision

The v1 Python service and Ollama integration model for SnapInsight is:

1. Use FastAPI as the local service framework.
2. Treat the Python service as the only adapter between the extension and Ollama.
3. Expose a model-list endpoint, health endpoint, and a shared streaming explanation endpoint.
4. Use a single explanation request shape with a `mode` field for `short` and `detailed`.
5. Support streaming for both explanation modes.
6. Use best-effort cancellation when the client disconnects or switches requests.
7. Use HTTP error responses only before a stream is established; once streaming starts, terminate failures with a structured stream `error` event.
8. Keep the product selection limit in the extension layer and treat any larger service-side text ceiling as defensive validation only.
9. Define the product selection limit with an explicit mixed-language counting rule so UI validation remains consistent across implementations.
10. Document example-based edge cases for mixed-script counting rather than relying on generic prose alone.

This decision is accepted for v1.

## API Direction

### Health

- `GET /health`
- Purpose: allow the extension to detect whether the local service is running and reachable

### Models

- `GET /v1/models`
- Purpose: return the currently available Ollama models in a UI-friendly format
- Behavior:
  - query Ollama through the Python service
  - if no models are available, return a product-level “no available models” result rather than raw upstream details

### Explanations

- `POST /v1/explanations/stream`
- Request should include at least:
  - selected text
  - selected model
  - mode: `short` or `detailed`
  - optional context fields if later needed
- Response should be a streaming HTTP response with stable event semantics for:
  - stream start
  - text chunk
  - stream completed
  - structured error
- HTTP status codes should represent setup-time failures only.
- Once a `200` streaming response has begun, later failures should end with a structured terminal stream error event.
- The exact counting rule for the product-side `1-20` limit should be fixed in the API/design documents rather than inferred from implementation language behavior.
- The counting rule should explicitly cover cases such as hyphenated English tokens and mixed-script segments.

The exact payload schema should be finalized in `docs/specs/api-spec.md`.

## Error Handling Rules

- Do not expose raw Python stack traces or raw Ollama errors to the extension UI.
- Map failures into stable product-facing categories such as:
  - service unavailable
  - no models available
  - selected model unavailable
  - generation failed
  - request cancelled
- Keep user-facing messages friendly and non-technical, while preserving machine-readable error codes for the extension.
- If Ollama is unavailable during model-list retrieval, return an explicit retryable failure rather than pretending the model list is simply empty.
- Mixed-language text length validation at the product layer should be deterministic and documented.
- Unexpected MV3 bridge loss should be handled at the extension contract layer and does not require a separate product-facing model/backend error code.

## Ollama Integration Rules

- The Python service is responsible for querying available models from Ollama.
- The Python service is responsible for building prompts for `short` and `detailed` modes.
- The Python service should keep prompt templates and Ollama-specific request shaping internal.
- Short-lived in-memory caching of the model list is allowed as an implementation optimization, but model availability should not be treated as permanently cached state.

## Operational Consequences

- `docs/design/` should model a dedicated Ollama adapter inside the Python service.
- `docs/specs/api-spec.md` should define the exact request and streaming event schema.
- Future changes such as background daemonization, persistent job queues, or alternative model backends should require a new RFC rather than silently expanding this contract.
- The API spec should explicitly separate product input limits from defensive backend validation limits.
