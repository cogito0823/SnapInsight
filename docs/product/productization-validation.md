# SnapInsight 0.2.0 产品化验证

验证日期：2026-08-13

## 实现结果

- 默认且唯一的推理路径为 Chrome Prompt API。
- 已移除扩展内 Ollama、localhost API、模型选择和持久化设置代码。
- 已移除仓库中的 Python FastAPI 服务和 macOS Companion App 源码；旧实现保留在 `codex/prompt-api-spike` 分支历史中。
- 首次安装自动打开设备状态页，支持 availability 检查、用户点击准备、下载进度和具体错误提示。
- 保留“选词后悬停 SI 自动生成”交互。
- 保留“只发送选中文字”，不采集页面上下文。
- 卡片增加复制、键盘焦点、Esc 关闭、重试和详细解释操作。
- Prompt API 直接运行在 Content Script 的扩展隔离世界；流式事件在当前页面实例内进入现有状态机。
- 已删除 Offscreen Document、`offscreen` 权限和 Service Worker 推理消息中转。
- Manifest 不包含 `host_permissions`，版本为 0.2.0，并包含正式尺寸图标。

## 自动验证

- `npm run check`：通过
- `npm test`：34 项通过，0 项失败
- `npm run build`：通过，无构建警告
- Manifest/package 审计：通过
- 生产包旧依赖扫描：未发现 `11435`、Ollama、实验 Lab 或构建开关

自动测试覆盖：

- 首次准备和下载进度
- Prompt API 缺失、设备不支持、模型未准备
- Content Script 内 `start`、`chunk`、`complete`、`error` 事件顺序
- Prompt 会话取消与销毁
- 选词状态、快速替换和页面实例变化
- 短/详细解释独立状态、流式内容、错误与重试
- 复制和重新生成控件的渲染

## 真实 Chrome 回归

- 设备状态：`设备端模型已就绪`
- 普通 HTTP 页面选词后仅出现一个 `SI`
- 悬停自动生成：通过
- 首批中文流式内容：约 500 ms 内可见
- 简短解释完成：通过
- 详细解释流式生成：通过
- 复制按钮：可操作，无页面或扩展错误
- 生成中关闭：卡片立即消失，取消链路无错误
- 两个普通网页标签页同时生成：通过，两个页面实例均独立完成
- 生成中刷新页面：通过，卡片与页面会话被清理
- SnapInsight 控制台错误：0
- 观察到一个无关扩展错误：`gcjikeldobhnaglcoaejmdlmbienoocg/content.js`

## 尚需外部确认

- 商店截图、公开隐私政策 URL 和实际提审必须在发布账号中完成。
- 更多物理设备的首次下载、多标签页和低资源压力回归应在发布候选阶段继续执行。
