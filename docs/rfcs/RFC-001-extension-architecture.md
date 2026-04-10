# RFC-001: Extension Architecture

## Document Status

- Status: Accepted
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/discovery/technical-architecture-questions.md`
  - `docs/rfcs/RFC-002-local-communication-and-security.md`
  - `docs/rfcs/RFC-003-python-service-and-ollama-integration.md`

## Context

SnapInsight 的核心交互发生在网页正文附近：用户选中短文本后，需要立即看到悬浮图标，并在悬浮后显示可持续存在的解释卡片。第一版还需要支持：

- 普通网页与 `input` / `textarea` 选中文本
- 卡片内短解释与详细解释的流式展示
- 首次使用时的模型选择
- 关闭旧请求并切换到新选区

因此需要明确 Chrome 扩展在 MV3 下的模块边界，避免把页面交互、跨页面共享状态、以及与本地服务通信混在一起。

## Decision Drivers

- 页面内交互延迟要低
- UI 需要贴近用户选区
- 需要尽量降低与任意网页 CSS/DOM 的冲突
- 需要为后续设置页与共享配置预留结构
- 需要和本地通信、安全、流式请求方案保持一致

## Options

### Option A: Content script 同时负责页面交互、UI 和本地服务请求

Description:
- 在 content script 中完成选区检测、悬浮图标、卡片渲染、模型列表读取和解释请求。

Pros:
- 实现路径最短
- 页面内状态切换最直接

Cons:
- 本地服务访问逻辑分散在页面上下文
- 后续如果增加 options page 或其他扩展页面，需要重复通信与存储逻辑
- 安全策略、超时、取消、错误映射难以集中管理

### Option B: Content script 负责页面交互和 UI，service worker 负责共享状态与本地请求代理

Description:
- content script 负责选区监听、图标位置计算、卡片渲染与页面内交互状态。
- service worker 负责调用本地 Python 服务、读取和写入持久化设置、统一错误映射与请求控制。

Pros:
- 贴合 MV3 的职责分层
- 页面交互和网络边界清晰
- 后续更容易增加 options page 与额外扩展表面
- 便于集中处理请求超时、取消和配置读取

Cons:
- 消息传递链路比 Option A 更长
- 实现复杂度略高

### Option C: Service worker 主导大部分逻辑，content script 只作为薄视图层

Description:
- 尽量把状态机、请求编排和交互判断都放到 service worker，content script 只负责转发 DOM 事件和渲染结果。

Pros:
- 理论上共享逻辑最集中

Cons:
- 页面选区和几何信息天然属于页面上下文，不适合过度上移
- hover/card 状态需要大量来回消息，复杂度高
- 调试难度更大

## Tradeoffs

Option A 适合快速原型，但一旦引入模型选择、错误映射、请求取消和后续设置页面，就会把页面交互和跨页面能力耦合在一起。

Option C 虽然看起来更集中，但它把强依赖 DOM 和选区几何的交互逻辑硬性上移，反而会放大消息同步负担。

Option B 在复杂度和可维护性之间更平衡：把“贴页面的交互”留在 content script，把“跨页面共享能力”放在 service worker，既符合 MV3 的自然边界，也方便与后续通信 RFC 对齐。

## Recommendation

Adopt Option B.

具体推荐结构：

- 使用 Chrome Extension Manifest V3。
- `content script` 负责：
  - 监听文本选中变化
  - 判断选区是否满足长度与支持边界
  - 计算悬浮图标和卡片位置
  - 管理图标 hover、卡片显示/关闭、详情展开等页面内状态
  - 渲染短解释、详细解释、加载态与错误态
- `service worker` 负责：
  - 作为扩展访问本地 Python 服务的唯一代理
  - 读取与写入模型选择等持久化设置
  - 统一处理请求超时、取消和错误映射
  - 对外暴露统一的扩展内部消息接口
- 活跃解释请求必须通过长生命周期的页面到 worker 桥接机制保持联通；如果桥接丢失或 worker 生命周期中断，当前请求应以可重试失败收敛，而不是隐式悬空。
- 扩展内部流式请求与取消路由必须使用 `requestId` 加发送方上下文，而不是仅依赖 `requestId`。
- 发送方上下文至少包括 `tabId`、`frameId` 和每个文档实例唯一的 `pageInstanceId`。
- worker 到 content script 的流式回传必须使用明确的内部事件 envelope，而不是依赖未约定的“原样转发”。
- 如果取消结果被显式跨扩展边界传播，必须使用统一的终止 outcome，而不是临时自定义消息。
- worker 到 content script 的内部流事件 contract 应显式包含 `start` 事件，而不仅仅是 `chunk`、`complete` 与失败事件。
- `options page` 负责：
  - 提供稳定的模型配置与基础设置入口
- 页面内 UI 使用 `Shadow DOM` 容器挂载，减少样式冲突。

## Decision

The v1 extension architecture for SnapInsight is:

1. Use a Manifest V3 extension.
2. Keep all selection-aware UI logic in the content script.
3. Use the service worker as the shared state and localhost request broker.
4. Provide a dedicated options page for persistent configuration.
5. Render in-page UI inside a Shadow DOM root.
6. Route streaming interactions using both request identity and sender context.
7. Treat MV3 worker/bridge loss during an active stream as an explicit retryable failure path.
8. Include a per-document `pageInstanceId` in sender context so reloads and same-tab navigations cannot receive stale stream events.
9. Define an explicit worker-to-content-script stream event contract for chunks, completion, terminal errors, and bridge-loss failures.
10. Reuse a single explicit cancellation outcome when cancellation is surfaced across the extension boundary.
11. Forward the stream `start` event explicitly through the same internal event envelope used for later stream events.

This decision is accepted for v1 and should be treated as the baseline for technical design.

## Consequences

- Design documents should not move page interaction orchestration out of the content script.
- Localhost communication details should be specified in `RFC-002`.
- Python service contract and streaming model should be specified in `RFC-003`.
- Future implementation should preserve a clean separation between page-state logic and local-service access.
- Future implementation must account for MV3 worker lifetime instead of assuming a permanently resident background process.
- Unexpected bridge loss should be normalized into a retryable extension-level failure rather than a silent hang or implicit cancellation.
- The extension spec should define internal stream-delivery message shapes as strictly as the localhost API shapes.
- The extension spec should also define how explicit cancellation outcomes are represented when they are emitted.
- The design/state model should separate short-explanation and detailed-explanation stream state rather than relying on one global request slot.
