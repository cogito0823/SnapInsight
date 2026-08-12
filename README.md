# SnapInsight

SnapInsight 是一个 Chrome 扩展：选中网页中的短文本，将鼠标悬停到选区旁的 `SI` 按钮上，即可通过 Chrome 设备端 Prompt API 获得分层解释。

解释在 Chrome 管理的本地模型中生成。SnapInsight 不需要桌面 App、Python 服务或 Ollama，也不把选中文字发送到 SnapInsight 后端。

![SnapInsight in-page card example](docs/assets/readme-in-page-card-example.png)

## 使用体验

- 选中 1–20 个中文字符或英文单词
- 悬停选区附近的 `SI`，自动生成简短解释
- 点击“查看更多”生成详细解释
- 支持复制、重新生成、关闭和生成中取消
- `Esc` 可关闭卡片

当前版本仅把用户明确选中的文字交给设备端模型，不采集页面标题、相邻段落或其他页面上下文。

## 运行要求

- Chrome 138 或更高版本
- 满足 Chrome 内置 AI 的设备、存储空间和地区要求
- 首次使用需要联网，由 Chrome 下载设备端模型

Chrome Prompt API 的设备覆盖和语言支持会随浏览器版本变化。中文已在真实 Chrome 中验证可用，但仍不属于 SnapInsight 能独立保证的浏览器能力。

## 开发与安装

```bash
cd extension
npm install
npm run check
npm test
npm run build
```

然后：

1. 打开 `chrome://extensions`
2. 启用“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择 `extension/dist`
5. 首次安装会自动打开设备状态页；点击“准备本地模型”

如果已加载过旧构建，先点击扩展卡片上的“重新加载”，再刷新测试网页。

## 架构

```text
网页 Content Script / Shadow DOM 卡片
        ↕
Chrome Prompt API / 设备端模型

Manifest V3 Service Worker
        └── 首次安装与工具栏入口
```

Prompt API 直接运行在 Content Script 的扩展隔离世界中。选词、生成、流式渲染和取消都保持在当前页面实例内；Service Worker 不参与推理，只负责首次安装和工具栏入口。

## 隐私边界

- Content Script 只读取用户选中的文字和选区坐标
- 不采集页面上下文
- Manifest 不声明网站 `host_permissions`
- 不访问 SnapInsight 服务器或第三方模型 API
- 模型下载和运行由 Chrome 管理

详见 [兼容性基线](docs/product/compatibility.md)、[隐私说明](docs/product/privacy-policy.md) 和 [发布清单](docs/product/chrome-web-store-checklist.md)。

## 验证

```bash
cd extension
npm run check
npm test
npm run build
```

真实 Chrome 手工回归需覆盖：首次模型下载、短解释、详细解释、复制、重试、生成中关闭、多标签页、页面刷新以及不支持设备的提示。
