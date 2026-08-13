# SnapInsight — Chrome 设备端 AI 解释

[English](README.md) | [简体中文](README.zh-CN.md)

SnapInsight 是一个 Chrome 扩展：选中网页中的短文本，将鼠标悬停到选区旁的 `SI` 按钮上，即可通过 Chrome 设备端 Prompt API 获得分层解释。

解释在 Chrome 管理的本地模型中生成。SnapInsight 不需要桌面 App、Python 服务或 Ollama，也不把选中文字发送到 SnapInsight 后端。

![SnapInsight 页面内解释卡片](docs/assets/readme-in-page-card-example.png)

## 使用体验

- 选中 1–20 个中文字符或英文单词
- 悬停选区附近的 `SI`，自动生成简短解释
- 点击“查看更多”生成详细解释
- 支持复制、重新生成、关闭和生成中取消
- `Esc` 可关闭卡片

当前版本仅把用户明确选中的文字交给设备端模型，不采集页面标题、相邻段落或其他页面上下文。

## 运行要求与限制

- Chrome 138 或更高版本
- 满足 Chrome 内置 AI 的设备、存储空间和地区要求
- 首次使用需要联网，由 Chrome 下载设备端模型

Chrome Prompt API 的设备覆盖和语言支持会随浏览器版本变化。中文已在真实 Chrome 中验证可用，但仍不属于 SnapInsight 能独立保证的浏览器能力。

扩展只在允许 Content Script 注入的普通网页中工作，不支持 `chrome://` 页面、Chrome Web Store 页面等浏览器受限页面。`file://` 页面还需要用户在扩展管理页单独允许访问文件网址。

## 开发与安装

```bash
cd extension
npm ci
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

## 权限与隐私边界

- Content Script 只读取用户选中的文字和选区坐标
- 不采集页面上下文
- 不访问 SnapInsight 服务器或第三方模型 API
- 不保存选中文字或生成结果，不使用遥测、广告 SDK 或远程代码
- 模型下载和运行由 Chrome 管理

为了让用户在任意普通网页选词后无需先点击工具栏按钮即可看到 `SI` 入口，Manifest 使用 `content_scripts.matches: ["<all_urls>"]`。Chrome Web Store 会将其视为“所有网站”的访问范围。该范围仅用于检测用户主动创建的文字选区、获取选区坐标并渲染解释卡片；扩展不读取相邻段落、页面标题、表单内容或浏览历史。

Manifest 没有额外声明 `host_permissions`，也没有申请 `tabs`、`history`、`webRequest`、`offscreen` 等权限。

详见[兼容性基线](docs/product/compatibility.md)、[隐私说明](docs/product/privacy-policy.md)和[发布清单](docs/product/chrome-web-store-checklist.md)。

## 验证

```bash
cd extension
npm run check
npm test
npm run build
```

真实 Chrome 手工回归需覆盖：首次模型下载、短解释、详细解释、复制、重试、生成中关闭、多标签页、页面刷新以及不支持设备的提示。
