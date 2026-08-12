# SnapInsight 0.2.0 发布候选

生成日期：2026-08-13

## 上传文件

- 本地路径：`release/snapinsight-0.2.0.zip`
- SHA-256：`046f7f6935c9c2b49e26193625fd8aef954a52cdd4f12eb7aa64734739bee503`
- 文件数：12
- 解压根目录包含 `manifest.json`

上传包仅包含：

- Manifest V3 配置
- Content Script
- 设备状态页
- 安装/工具栏 Service Worker
- 本地图片和打包后的 JavaScript

不包含服务器、Companion App、源码、Source Map、开发 Lab、Offscreen Document 或远程代码。

## 商店截图

- 路径：`docs/product/store-assets/snapinsight-rag-1280x800.png`
- 尺寸：1280×800
- SHA-256：`8b85b2b89eebac7a461dca15308b2c264a259d2ebacce6e4dd91e904ea70e5a2`
- 来源：真实 Chrome 中运行发布候选扩展所得，未使用生成式图片替代产品 UI

## 验证结果

- `npm run check`：通过
- `npm test`：34/34 通过
- `npm run build`：通过
- 短解释、详细解释、取消：真实 Chrome 通过
- 双标签页同时生成：真实 Chrome 通过
- 生成中刷新页面：真实 Chrome 通过
- Manifest：无 `offscreen` 和 `host_permissions`
