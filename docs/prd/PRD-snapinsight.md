# PRD: SnapInsight

- Type: normative
- Status: Approved
- Applicability: current
- Approval: [Documented scope](../plans/baseline-approvals.md#shipped-product)
- Superseded-By: none

## 用户与目标

SnapInsight 帮助桌面 Chrome 用户在阅读网页时理解词语和短语。选中文字后，悬停 `SI` 可在原页获得简短解释，并可继续查看详细解释。模型由 Chrome 管理并在设备端运行。扩展无需账号，也不发送选中文字到后端或第三方 API。

## 现行范围与验收

| 行为 | 验收条件 |
| --- | --- |
| 选区触发 | 可注入的页面上，选择 1–20 个有效单位后出现 `SI`。悬停入口打开卡片并开始简短解释。可读取普通网页和浏览器提供选区的受支持文本输入控件。 |
| 短解释和详细解释 | 按流展示内容。已有短解释内容后可请求详细解释，保留短解释。 |
| 交互控制 | 支持复制、可用时重试、取消、Escape 或点击外部关闭。新选区和页面销毁后，旧输出不能覆盖新卡片。 |
| 设备准备 | 状态页显示准备状态。首次下载由用户主动触发。Chrome 已在下载时，状态页自动检查就绪状态，并提供实时进度。卡片需要模型设置时提供打开状态页的入口，其他可重试错误提供重试。 |
| 语言 | 界面有英语及简体中文，解释跟随 Chrome 界面语言。特定语言输出取决于 Chrome Prompt API 和设备。 |
| 隐私 | 扩展只处理用户明确选中的文本及其锚点。文本、提示词和结果不持久化、不发送到外部 API。复制仅响应用户操作。 |

目标运行环境是 Chrome 138 或更高版本及支持内置 AI 的桌面设备。模型首次下载需要网络和存储空间。受限页面、未启用文件访问的本地文件、非顶层 iframe、密码输入和不支持的富文本编辑区不属于现行支持范围。产品范围不含历史收藏、账号同步、远程推理或独立本地服务。

## 关联文档

- [扩展架构](../design/extension-architecture.md)
- [状态与内部契约](../specs/extension-state-spec.md)
- [兼容性](../product/compatibility.md)
- [商店发布清单](../product/chrome-web-store-checklist.md)

## Change Record

- 2026-11-17 将需求基线与已交付的 Prompt API 实现、模型准备和双语支持对齐。原 Ollama 版本为 `2674a9b630dca079b07dab266451ae7d3afd97f7:docs/prd/PRD-snapinsight.md`，其历史变更记录仍可按固定版本查看。
