# Prompt API 兼容性基线

文档核对日期：2026-11-17。真实 Chrome 验证见[历史验证记录](../plans/prompt-session-latency-implementation-plan.md)与[商店发布清单](chrome-web-store-checklist.md)。

## 浏览器与系统

- Chrome 扩展中的 Prompt API 从 Chrome 138 开始提供，因此 Manifest 使用 `minimum_chrome_version: 138`。
- 目标平台为桌面 Chrome：Windows 10/11、macOS 13+、Linux，以及 Chromebook Plus。
- Android、iOS 和非 Chromebook Plus 的 ChromeOS 设备不在当前支持范围。

## 官方设备要求

- Chrome Profile 所在磁盘至少 22 GB 可用空间；下载后空间低于 10 GB 时模型可能被 Chrome 移除。
- GPU 路径要求严格大于 4 GB VRAM；CPU 路径要求至少 16 GB RAM 和 4 个 CPU 核心。
- 首次下载需要不限流量或非计量网络，后续设备端推理不需要联网。

产品不自行判断硬件参数，而以 `LanguageModel.availability()` 为最终依据，避免浏览器要求更新后产生错误判断。

## 语言策略

SnapInsight 曾在真实 Chrome 中验证中文生成。实际可用性取决于 Chrome 版本、设备和模型。设备状态页用英语文本输入和输出能力检查并准备模型。页内解释的提示词要求按 Chrome 界面语言输出，并采用以下策略：

- 解释会话创建不声明 `expectedInputs` / `expectedOutputs`
- 捕获 `NotSupportedError` 并显示“语言暂不支持”
- 在产品和商店说明中说明中文生成的实际可用性由 Chrome 决定

## 扩展执行上下文

真实 Chrome 已确认 Prompt API 在 Content Script 的扩展隔离世界中可见并能完成 `availability()`、`create()` 和 `prompt()`。扩展因此直接在当前页面实例中持有生成会话，不使用 Offscreen Document，也不依赖 Service Worker 转发流式事件。

模型文件和底层模型运行时仍由 Chrome/Profile 管理，不跟随扩展 Service Worker。SnapInsight 只在发生有效选区交互后按需创建页面级 keeper/template 会话，并在 Chrome 支持时为每次解释调用 `clone()` 保持上下文隔离。完成首次真实请求后，keeper 跟随当前页面文档存在，即使标签页长期隐藏也不再按固定时间主动回收；导航、刷新或页面卸载时立即回收。仅预热但从未使用的会话仍在 15 秒后回收。

为避免大量标签页无限累计 session，Service Worker 使用 `chrome.storage.session`
协调最多 5 个页面 keeper。登记内容仅包含 Chrome 提供的 tab/frame 运行时编号、
随机页面实例编号、可见性和最近使用顺序。超限时优先释放最久未使用的隐藏
keeper；若所有 keeper 都可见，则释放最久未使用者。被释放页面下次使用时可
按需重建。该上限是 SnapInsight 的资源安全阀，不代表 Chrome 公布了 Session
数量配额。

不支持 `clone()` 时，keeper 不承载任何用户请求；每次解释都另行创建并销毁独立请求会话。这样会多占用一个空会话，但同时保持模型就绪和请求上下文隔离。每个标签页文档拥有自己的 keeper，底层模型运行时仍由 Chrome 管理，Session 不能放入 Service Worker 或跨刷新复用。

Chrome 重启或模型运行时空闲卸载后，第一次解释可能包含从磁盘加载模型的冷启动耗时。产品用 `LanguageModel.availability()` 的 `downloadable` 和 `downloading` 区分下载相关状态。模型需要设置时，解释卡片引导用户打开设备状态页。设备状态页可显示下载、安装和已用时，见[设备状态契约](../specs/extension-state-spec.md)。

## 官方参考

- https://developer.chrome.com/docs/ai/prompt-api
- https://developer.chrome.com/docs/ai/session-management
