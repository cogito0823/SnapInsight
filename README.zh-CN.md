# SnapInsight

**在 Chrome 中为选中文字提供私密的设备端解释。**

[English](README.md) | [简体中文](README.zh-CN.md)

SnapInsight 是一个基于 Chrome 内置 Prompt API 的轻量扩展。选中单词或短语，悬停在选区旁的 `SI` 入口，即可获得简短或详细解释，无需离开当前网页。

模型由 Chrome 管理并在设备端运行。SnapInsight 没有后端、不需要账号，也不会把选中文字发送给 SnapInsight 或第三方模型 API。

![SnapInsight 直接在网页中解释选中文字](docs/assets/readme-in-page-card-example.png)

## 功能特性

- 解释用户明确选中的网页文字
- 提供简短解释和详细解释
- 支持流式输出、复制、重试、取消和键盘操作
- 使用 Shadow DOM，避免界面样式干扰原网页
- 通过 Chrome 内置 Prompt API 在设备端推理
- 无账号、桌面 App、本地服务、遥测或远程代码

## 运行要求

- Chrome 138 或更高版本
- Chrome 内置 AI 支持的桌面设备
- 足够存放设备端模型的可用空间
- 首次下载模型时可以访问互联网

Prompt API 是否可用取决于 Chrome 版本、设备、地区和语言。中文输出已通过真实环境验证，但语言支持仍由 Chrome 决定。

SnapInsight 仅在 Chrome 允许注入 Content Script 的普通网页中工作，不支持 `chrome://` 页面、Chrome Web Store 等受限页面。若要在本地 `file://` 页面使用，需要在 Chrome 扩展设置中手动允许访问文件网址。

## 从源码安装

```bash
git clone https://github.com/cogito0823/SnapInsight.git
cd SnapInsight/extension
npm ci
npm run build
```

然后加载扩展：

1. 打开 `chrome://extensions`。
2. 启用“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择 `extension/dist`。
5. 在设备状态页点击“准备本地模型”。

Chrome 完成模型准备后，打开普通网页，选中 1–20 个中文字符或英文单词，将鼠标悬停在 `SI` 入口即可使用。

## 开发

```bash
cd extension
npm ci
npm run check
npm test
npm run build
```

使用 `npm run dev` 可持续监听构建。重新构建后，需要在 `chrome://extensions` 中重新加载扩展，并刷新测试网页。

如需在本地诊断延迟，请在 Chrome DevTools 中选择扩展的 Content Script
上下文，并设置 `globalThis.__snapinsightPromptPerformanceDebug__ = true`。
控制台事件仅包含阶段、耗时、热路径或降级路径、缓存/预热状态、模式和结果，
不会包含选中文字、prompt、输出、页面 URL 或页面身份。

本地和 CI 验证构建保持当前 Manifest 版本不变，通过 Git commit SHA 区分。
Release Please 根据 Conventional Commits 自动维护版本与 Changelog PR；合并
该 PR 后自动创建版本 tag、经过验证的 ZIP、校验和与 GitHub Release。
完整约定参见[开发与发布流程](docs/product/release-process.md)和
[版本变更记录](CHANGELOG.md)。

## 架构

```text
网页
  └── Content Script
        ├── 选区检测
        ├── Shadow DOM 解释卡片
        └── 页面级 Prompt API 会话池
              ├── 相互隔离的请求会话
              └── Chrome 管理的设备端模型

Manifest V3 Service Worker
  └── 安装流程与工具栏入口
```

推理直接运行在 Content Script 的扩展隔离世界中。有效选区可以预热页面级模板会话；模板完成首次真实请求后，会在当前文档可见期间保持存活，让 Chrome 的模型运行时尽量维持就绪。文档隐藏后有 5 分钟宽限期，导航或页面销毁时立即释放。每次解释在 Chrome 支持时使用相互隔离的克隆会话；不支持克隆时，keeper 保持不变，并为请求另建独立会话。Service Worker 不转发模型请求。

## 隐私与权限

SnapInsight 只处理用户明确选中的文字及其屏幕坐标，不读取相邻段落、页面标题、表单内容或浏览历史，也不会持久化选中文字和生成结果。

Manifest 使用 `content_scripts.matches: ["<all_urls>"]`，让用户选词后无需先点击工具栏按钮即可看到 `SI` 入口。该访问范围仅用于检测选区和渲染页面内界面。扩展不申请 `tabs`、`history`、`webRequest` 或 `offscreen` 权限。

详细信息参见[隐私说明](docs/product/privacy-policy.md)和[兼容性说明](docs/product/compatibility.md)。

## 仓库结构

```text
extension/   Chrome 扩展源码与测试
docs/        产品、设计、验证与发布文档
release/     本地发布产物（不纳入 Git）
```

## 参与贡献

欢迎提交 Issue 和 Pull Request。提交修改前，请确保：

1. 保持扩展用途单一，并遵守设备端隐私边界。
2. 为行为变化添加或更新测试。
3. 在 `extension/` 中运行 `npm run check`、`npm test` 和 `npm run build`。
4. 在 Pull Request 中说明权限、隐私或兼容性影响。

请通过 [GitHub Issues](https://github.com/cogito0823/SnapInsight/issues) 报告问题或提出功能建议。

## 许可证

SnapInsight 使用 [MIT License](LICENSE) 开源。
