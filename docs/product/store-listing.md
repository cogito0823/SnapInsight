# Chrome Web Store 商店资料

## 基本信息

- 名称：SnapInsight — On-device AI Explanations
- 分类：生产力工具
- 语言：中文（简体）
- 版本：0.3.2 <!-- x-release-please-version -->

## 简短描述

划词悬停即可用 Chrome 设备端 AI 获得简短或详细解释，选中文字不上传服务器。

## 详细描述

SnapInsight 是一个轻量的网页阅读助手。阅读网页时选中不理解的词语或概念，悬停在 SI 标记上，即可获得由 Chrome 设备端 AI 生成的解释。

主要功能：

- 划词后悬停 SI，自动生成简短解释
- 按需查看包含定义、背景、场景和示例的详细解释
- 支持流式显示、复制、重新生成和随时取消
- 直接在当前网页显示，无需切换侧边栏或独立应用
- 使用 Chrome Prompt API 和设备端模型，不依赖 SnapInsight 后端

隐私设计：

- 只处理用户主动选中的文字
- 不读取相邻段落、页面标题、浏览历史或表单内容
- 不保存选中文字和生成结果
- 不使用遥测、广告 SDK 或远程代码
- 不把选中文字发送给 SnapInsight 或第三方模型服务器

使用要求：

- Chrome 138 或更高版本
- 设备必须满足 Chrome 设备端模型的硬件和存储要求
- 首次使用需要在扩展的设备状态页点击“准备本地模型”
- 中文生成能力取决于 Chrome 当前设备端模型实现，尚不属于 Chrome 的正式语言保证

## 单一用途声明

SnapInsight 的唯一用途是在普通网页中读取用户明确选中的少量文字，并使用 Chrome 设备端 Prompt API 在当前页面显示简短或详细解释。

## 权限说明

### Content Script `<all_urls>`

扩展需要在普通网页中检测用户创建的文字选区、显示 SI 触发器和解释卡片。它只读取用户主动选中的文字和选区坐标，不读取完整页面内容，不申请 `host_permissions`，也不向网站或外部服务器发送内容。

### `storage`

仅使用 `chrome.storage.session` 保存最多 5 个页面 keeper 的 LRU 协调元数据，
使 Manifest V3 Service Worker 休眠恢复后仍能限制空闲会话数量。数据仅包含
tab/frame 运行时编号、随机页面实例编号、可见性和最近使用顺序，不包含 URL、
标题、选中文字、prompt 或生成内容，并随浏览器会话结束而清除。

### 远程代码

不使用远程代码。所有扩展 JavaScript 均打包在上传文件中；模型能力由 Chrome Prompt API 提供。

## 隐私实践表建议

- 网站内容：勾选“是”，仅限用户主动选中的文字；即使只在本机处理，Chrome Web Store 也要求披露
- 数据用途：扩展核心功能
- 处理方式：只在当前设备的扩展上下文中临时处理，不保存、不上传、不传输给开发者或第三方
- 身份验证信息：否
- 个人身份信息：否
- 健康、财务、位置、通信内容：否
- 分析、广告或个性化营销：否
- 数据出售或提供给第三方：否

## 链接

- 支持页面：https://github.com/cogito0823/SnapInsight/issues
- 项目主页：https://github.com/cogito0823/SnapInsight
- 隐私政策：https://github.com/cogito0823/SnapInsight/blob/main/docs/product/privacy-policy.md

## 截图

- 主截图（极简阅读测试页，完整选词 + 简短解释 + 详细解释）：`docs/product/store-assets/snapinsight-detail-1280x800.png`
