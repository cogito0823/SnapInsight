# Prompt API 兼容性基线

核对日期：2026-08-13

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

Chrome 当前正式列出的 Prompt API 文本语言是英语、日语、西班牙语、德语和法语。SnapInsight 的中文能力来自真实 Chrome 验证，但尚未属于 Chrome 的正式语言保证。因此会：

- 不传入会使中文被立即拒绝的 `expectedInputs` / `expectedOutputs` 声明
- 捕获 `NotSupportedError` 并显示“语言暂不支持”
- 在产品和商店说明中明确中文属于实验性能力

## 扩展执行上下文

真实 Chrome 已确认 Prompt API 在 Content Script 的扩展隔离世界中可见并能完成 `availability()`、`create()` 和 `prompt()`。扩展因此直接在当前页面实例中持有生成会话，不使用 Offscreen Document，也不依赖 Service Worker 转发流式事件。

模型文件和底层模型运行时仍由 Chrome/Profile 管理，不跟随扩展 Service Worker。SnapInsight 只在发生有效选区交互后按需创建页面级 keeper/template 会话，并在 Chrome 支持时为每次解释调用 `clone()` 保持上下文隔离。完成首次真实请求后，keeper 在当前文档可见期间保持存活，以遵循 Chrome 保留一个空会话来维持模型就绪的性能建议；文档隐藏后保留 5 分钟，导航、刷新或页面卸载时立即回收。仅预热但从未使用的会话仍在 15 秒后回收。

不支持 `clone()` 时，keeper 不承载任何用户请求；每次解释都另行创建并销毁独立请求会话。这样会多占用一个空会话，但同时保持模型就绪和请求上下文隔离。每个标签页文档拥有自己的 keeper，底层模型运行时仍由 Chrome 管理，Session 不能放入 Service Worker 或跨刷新复用。

Chrome 重启或模型运行时空闲卸载后，第一次解释可能包含从磁盘加载模型的冷启动耗时，但这不等于重新下载。只有 `LanguageModel.availability()` 返回 `downloadable` 或 `downloading` 时，产品才将其视为下载阶段。

## 官方参考

- https://developer.chrome.com/docs/ai/prompt-api
- https://developer.chrome.com/docs/ai/session-management
