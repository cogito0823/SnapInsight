# Chrome Web Store 发布清单

## 构建与包内容

- [x] 默认构建仅包含 Chrome Prompt API 路径
- [x] 无远程代码、`eval` 或外部脚本
- [x] 无固定 localhost 权限、后端或桌面 App 依赖
- [x] Manifest 最低版本为 Chrome 138
- [ ] Release Please PR 中 Manifest、package、lockfile、商店资料和候选版本一致
- [x] 添加 16、32、48、128 px 正式图标并在 Manifest 声明
- [x] 生成可上传的 zip，并人工检查包内只含 `dist` 产物
- [ ] 从自动创建的 GitHub Release 下载 ZIP 并核对 SHA-256

## 商店资料

- [x] 准备 1280×800 或 640×400 截图
- [x] 准备简短描述、详细描述和支持链接
- [x] 发布可公开访问的隐私政策 URL
- [x] 明确说明中文能力依赖 Chrome 当前实现
- [x] 避免宣称所有 Chrome 设备均支持内置模型

## 权限与审核说明

- [x] 为 `<all_urls>` Content Script 解释：只响应用户选词并渲染 Shadow DOM 卡片
- [x] Manifest 无 `offscreen` 权限；Prompt API 直接运行在 Content Script 的扩展隔离世界
- [x] 确认无网络请求、遥测和用户数据持久化

## 手工兼容性矩阵

- [x] Chrome Stable，支持设备，已下载模型
- [ ] Chrome Stable，支持设备，首次下载
- [ ] Chrome 版本过低或 Prompt API 不存在
- [ ] 设备不支持
- [ ] 模型正在下载、下载失败、磁盘空间不足
- [x] 中文短解释、详细解释
- [x] 多标签页同时生成
- [x] 快速重复选词和取消
- [x] 页面刷新时清理生成会话和卡片
- [ ] 前进后退、标签页关闭
- [ ] iframe 内选词
- [x] 键盘焦点、Esc 关闭、复制、重试（自动覆盖；真实 Chrome 已验证复制控件）
- [ ] `chrome://` 页面和 Chrome Web Store 页面不注入时的正常表现

## 发布阻断条件

- 首次准备模型没有明确的用户激活入口
- 支持设备上真实回归无法完成短解释、详细解释或取消
- Manifest 出现未解释的权限或构建包包含开发/旧后端文件
