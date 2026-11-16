# SnapInsight 隐私说明

更新日期：2026-11-17

## 数据处理

SnapInsight 仅处理用户主动选中的文字，包括普通网页文字和受支持文本框中明确选中的片段。扩展不收集未选中的表单内容、相邻段落、页面标题或浏览历史。

选中文字会由当前网页中的 SnapInsight Content Script 直接传递给 Chrome Prompt API，并由 Chrome 管理的设备端模型生成解释。SnapInsight 不运营接收这些文字的后端服务，也不把这些文字发送给第三方模型 API。

## 数据保存与共享

- SnapInsight 不保存选中文字或生成结果。
- SnapInsight 不出售、共享或用于广告分析任何用户数据。
- SnapInsight 不使用遥测、分析 SDK 或远程代码。
- SnapInsight 在 `chrome.storage.session` 保存 keeper 协调元数据：标签页/Frame
  的运行时编号、随机页面实例编号、可见性和最近使用顺序。该状态随浏览器会话
  结束而清除，不包含 URL、页面标题、选中文字、prompt 或生成结果。
- 设备状态页在 `chrome.storage.local` 保存模型准备开始时间，用于重新打开页面后继续显示已用时。进入下载或准备状态且没有有效旧值时写入。状态页转为就绪、可下载、不支持或错误时将值设为 `null`。关闭页面或重启浏览器不会自动清除此值。
- Chrome 为准备设备端模型而进行的下载由 Chrome 自身负责，受 Chrome 相关条款约束。

## Chrome Web Store Limited Use

SnapInsight 对用户主动选中文字的使用仅限于提供扩展中清楚展示的解释功能。SnapInsight 对相关信息的使用遵守 Chrome Web Store User Data Policy，包括 Limited Use 要求。SnapInsight 不会将这些信息出售或传输给第三方，不会将其用于与扩展单一用途无关的目的，也不会将其用于信用评估或贷款。

SnapInsight's use of information is limited to providing the explanation feature clearly presented to the user. The use of information complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. SnapInsight does not sell or transfer this information to third parties, use it for purposes unrelated to the extension's single purpose, or use it for creditworthiness or lending purposes.

## 权限用途

- Content Script 的 `<all_urls>` 匹配：用于在普通网页中读取用户明确创建的文字选区并显示解释卡片。扩展不申请 `host_permissions`，也不向网站或外部服务器发起内容请求。
- `storage` 用于协调最多 5 个页面 keeper，并在本机延续设备状态页的模型准备计时。两处存储均不包含网页内容或浏览历史。
- 扩展不申请 `offscreen` 或其他推理权限。解释会话位于当前 Content Script 页面实例内。设备状态页用于准备模型的临时会话用完即销毁，不处理选中文字。

## 用户控制

用户可以关闭解释卡片来取消活动生成，可以在 Chrome 扩展管理页禁用或卸载 SnapInsight。卸载后不会留下 SnapInsight 账户或云端数据。
