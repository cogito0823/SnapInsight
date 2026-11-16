# Chrome Web Store 发布清单

2026-11-17 核对：最新正式 GitHub 版本为 [0.3.4](https://github.com/cogito0823/SnapInsight/releases/tag/v0.3.4)，`v0.3.4` 指向 `2674a9b630dca079b07dab266451ae7d3afd97f7`（[Release PR #11](https://github.com/cogito0823/SnapInsight/pull/11)）。[Chrome Web Store 公开页](https://chromewebstore.google.com/detail/dkeelcflcgogpnopobhenccemofbhbli) 显示可安装 0.3.4，更新于 2026-08-23。后台提交与审核记录未核实。

## 构建与包内容

- [x] 默认构建仅包含 Chrome Prompt API 路径
- [x] 无远程代码、`eval` 或外部脚本
- [x] 无固定 localhost 权限、后端或桌面 App 依赖
- [x] Manifest 最低版本为 Chrome 138
- [x] 0.3.4 的 Manifest、package、lockfile、商店资料及其他版本文件一致，后续版本重新核对
- [x] 添加 16、32、48、128 px 正式图标并在 Manifest 声明
- [x] 生成可上传的 zip，并人工检查包内只含 `dist` 产物
- [x] 下载并核对 0.3.4 的正式 ZIP 和校验文件。SHA-256 为 `a49cb0adbcad8a34d44f026eacd6d243511cfc72a5373838806e643c848da8a0`，包完整，Manifest 为 0.3.4

## 商店资料

- [x] 准备 1280×800 或 640×400 截图
- [x] 准备简短描述、详细描述和支持链接
- [x] 发布可公开访问的隐私政策 URL
- [ ] 同步线上商店文案和权限披露，并将线上旧分支的隐私政策链接更新到包含本次修订的现行版本
- [x] 明确说明中文能力依赖 Chrome 当前实现
- [x] 避免宣称所有 Chrome 设备均支持内置模型

## 权限与审核说明

- [x] 为 `<all_urls>` Content Script 解释：只响应用户选词并渲染 Shadow DOM 卡片
- [x] `storage` 用途见[商店权限说明](store-listing.md)。会话存储协调最多 5 个页面 keeper，本地存储保存设备状态页的模型准备开始时间。两处存储均不包含网页内容或浏览历史
- [x] Manifest 无 `offscreen` 权限；Prompt API 直接运行在 Content Script 的扩展隔离世界
- [x] 扩展不发起内容网络请求，不使用遥测，不持久化选中文字或生成结果。首次模型下载由 Chrome 管理

## 手工兼容性矩阵

- [x] Chrome Stable，支持设备，已下载模型
- [ ] Chrome Stable，支持设备，首次下载
- [ ] Chrome 版本过低或 Prompt API 不存在
- [ ] 设备不支持
- [ ] 模型正在下载、下载失败、磁盘空间不足
- [ ] 实机核对下载中重新打开状态页延续计时，以及就绪或失败后清理计时
- [x] 中文短解释、详细解释
- [x] 多标签页同时生成
- [ ] 超过 5 个已使用页面时优先驱逐最久未使用的隐藏 keeper
- [ ] 标签页长期隐藏后返回，未被 LRU 驱逐时保持热路径
- [x] 快速重复选词和取消
- [x] 页面刷新时清理生成会话和卡片
- [ ] 前进后退、标签页关闭
- [ ] 验证 iframe 内选词不触发扩展，当前 Manifest 只注入顶层页面
- [x] 键盘焦点、Esc 关闭、复制、重试（自动覆盖；真实 Chrome 已验证复制控件）
- [ ] `chrome://` 页面和 Chrome Web Store 页面不注入时的正常表现

## 发布阻断条件

- 首次准备模型没有明确的用户激活入口
- 支持设备上真实回归无法完成短解释、详细解释或取消
- Manifest 出现未解释的权限或构建包包含开发/旧后端文件
