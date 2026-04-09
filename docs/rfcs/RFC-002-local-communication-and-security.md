# RFC-002: Local Communication and Security

## Document Status

- Status: Accepted
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/discovery/technical-architecture-questions.md`
  - `docs/rfcs/RFC-001-extension-architecture.md`
  - `docs/rfcs/RFC-003-python-service-and-ollama-integration.md`

## Context

SnapInsight 的产品前提是：用户选中的文本只能发送到本机服务，不允许发送到外网。与此同时，扩展还需要满足：

- 从 Chrome 扩展安全地访问本地 Python 服务
- 支持模型列表读取、简短解释、详细解释和健康检查
- 支持流式响应和最佳努力取消
- 在 v1 阶段保持足够简单，便于开发、调试和文档化

因此需要明确本地通信方式、端口策略、服务暴露范围和安全边界。

## Decision Drivers

- 必须满足“只发往本机”的隐私要求
- 必须和 FastAPI 服务实现兼容
- 必须适合流式响应
- v1 不应引入过高的安装和打包复杂度
- 安全策略应尽量集中、可审计

## Options

### Option A: Content script 直接调用 localhost HTTP

Description:
- 内容脚本直接向本地 Python 服务发起 HTTP 请求。

Pros:
- 实现简单
- 少一层消息转发

Cons:
- 本地访问散落在页面执行路径中
- 难以集中管理错误映射、取消和策略
- 安全边界与页面内逻辑耦合过深

### Option B: Service worker 代理 localhost HTTP

Description:
- content script 只向扩展内部发送消息。
- service worker 作为唯一网络入口，向 `127.0.0.1` 上的本地服务发起 HTTP 请求。

Pros:
- 与 MV3 分层一致
- 便于统一管理超时、取消、错误映射和设置读取
- 网络边界集中，更利于审计和演进
- 与 FastAPI 和流式响应兼容良好

Cons:
- 需要定义扩展内部消息协议
- 实现略复杂于直接调用

### Option C: Chrome Native Messaging

Description:
- 扩展通过 Native Messaging 与本机进程通信，再由本机进程调用 Ollama。

Pros:
- 浏览器与本地进程之间的边界更强
- 不需要暴露本地 HTTP 端口

Cons:
- 安装、注册和打包成本高
- 开发调试复杂
- 对 v1 来说明显超出必要复杂度

## Tradeoffs

Native Messaging 在理论隔离性上更强，但对当前阶段的 SnapInsight 来说，复杂度远高于收益。直接从 content script 请求 localhost 虽然快，但把网络访问分散到了最贴近页面的层，后续很难保证一致的安全与错误策略。

通过 service worker 代理 localhost HTTP，能够保留 FastAPI 的开发友好性，同时把网络策略集中在扩展内部一个位置，是 v1 的最佳平衡点。

## Recommendation

Adopt Option B.

具体推荐规则：

- 扩展与本地服务通过 HTTP 通信。
- 所有本地服务请求统一由 extension `service worker` 发起。
- 本地 Python 服务只监听 `127.0.0.1`，不监听其他网络接口。
- v1 使用固定端口 `11435`。
- 本地服务应校验 `Origin`，只接受受信任的 `chrome-extension://<extension-id>` 来源。
- 为开发和发布分别维护允许的 extension origin 列表。
- 除必要的健康检查、模型列表和解释接口外，不暴露额外管理接口。
- `GET /health` 用于判断 SnapInsight 本地服务是否可达，并可附带依赖状态字段如 `ollamaReachable`。
- `GET /v1/models` 用于判断模型目录是否可用；如果 Ollama 可达但没有模型，返回成功响应中的产品状态；如果 Ollama 不可达，返回明确的 HTTP 失败。
- 扩展必须验证健康检查中的稳定服务标识；如果固定端口上响应的不是 SnapInsight 服务，应按本地服务冲突处理并拒绝继续访问。
- 固定端口上的“错误服务响应”应映射为独立公共错误码 `local_service_conflict`，而不是复用 `service_unavailable` 或 `request_failed`。
- 只要任一扩展入口发现固定端口上的身份校验失败，都必须统一映射为 `local_service_conflict`，包括健康检查、模型列表和解释流启动。

## Decision

The v1 local communication and security model for SnapInsight is:

1. Use localhost HTTP between the extension and the Python service.
2. Route all local-service traffic through the extension service worker.
3. Bind the Python service only to `127.0.0.1:11435`.
4. Validate allowed extension origins at the Python service boundary.
5. Do not use Native Messaging in v1.

This decision is accepted for v1.

## Security Rules

- Selected text must not be sent to any non-local endpoint.
- The Python service must reject requests from unexpected origins.
- Normal operation logs must not persist raw selected text or model output.
- CORS should be configured narrowly for the approved extension origins.
- If the service is unreachable, the extension should fail closed with a user-facing local error state rather than retrying against any alternative endpoint.
- Service liveness and dependency readiness must not be conflated into a single ambiguous response shape.
- Port occupancy by a non-SnapInsight local process must be treated as a security-relevant failure, not as a valid reachable service.
- Wrong-service responses on the fixed port must remain distinguishable from “nothing is listening” and from ordinary upstream model failures.
- The v1 service-identity check reduces accidental misrouting but does not fully authenticate the local process behind the fixed port.

## Operational Consequences

- The extension needs a small internal message contract between content script and service worker.
- The Python service should expose a health endpoint so the extension can distinguish “service unavailable” from “model unavailable”.
- Fixed port `11435` becomes part of the v1 implementation contract and should be reflected in design and API specs.
- If a future release needs installer-managed bootstrap or stronger host integration, that should be proposed in a new RFC rather than changing this contract implicitly.
- `GET /v1/models` should return `200` with a product state when no models are installed, but return `503` with a stable public error body when Ollama itself is unavailable.
- The API spec should require the client to verify the health response service identity before trusting the fixed localhost port.
- The API spec should also define the public error semantics for `local_service_conflict`.
- The API spec should make the `local_service_conflict` mapping consistent across all extension entry points.

## Residual Risk

- In v1, a malicious local process could still impersonate SnapInsight by binding to the expected port and mimicking the documented service identity.
- The current design mitigates accidental port conflicts and common wrong-service cases, but it is not a strong local-process authentication scheme.
- If stronger protection becomes necessary, the project should evaluate an authenticated handshake or a different host-integration mechanism in a future RFC.
