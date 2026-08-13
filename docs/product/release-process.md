# SnapInsight 开发与发布流程

## 版本标识的职责

### `v` 前缀规则

`0.2.8` 是产品版本号，`v0.2.8` 是指向该产品版本的 Git tag。统一遵循：

| 场景 | 格式 | 示例 |
| --- | --- | --- |
| Manifest、package、lockfile | 不带 `v` | `0.2.8` |
| `CHANGELOG.md` 标题 | 不带 `v` | `## [0.2.8] - 2026-08-13` |
| GitHub Release 标题 | 不带 `v` | `SnapInsight 0.2.8` |
| 正式 ZIP 文件名 | 不带 `v` | `snapinsight-0.2.8.zip` |
| 发布分支 | 不带 `v` | `release/0.2.8` |
| Git tag | 带 `v` | `v0.2.8` |

`v` 只表示“这是一个 Git 版本引用”，不属于产品版本号本身。Changelog
正文和标题不使用 `v`，但 Changelog 底部链接可以指向带 `v` 的 Git tag。

### 构建类型

SnapInsight 使用三种互不冲突的标识：

| 类型 | 标识方式 | 是否正式发布 |
| --- | --- | --- |
| 本地开发构建 | Manifest 基础版本 + Git commit SHA | 否 |
| CI 验证构建 | `snapinsight-extension-<commit-sha>` Artifact | 否 |
| 正式版本 | 产品版本 `0.2.8` + Git tag `v0.2.8` | 是 |

本地开发和普通 CI 不修改 Manifest 版本号。即使多个本地构建显示相同的
Manifest 版本，也通过 commit SHA 和 CI Run 区分。只有发布 PR 才将版本号
更新到下一个正式版本。

不要为本地构建使用 `0.2.8.1` 等额外版本段，也不要为本地验证创建正式
Git tag 或 GitHub Release。这样可以避免本地测试版本参与 Chrome 的版本排序，
也不会占用未来正式版本号。

### 本地验证构建的具体标识

本地验证构建没有独立的正式版本号。假设源码 Manifest 当前是 `0.2.7`，
commit 是 `fb9edce`：

- Chrome 扩展页显示的版本仍是 `0.2.7`；
- 本地构建身份写作 `0.2.7-dev.fb9edce`；
- 如果需要手工打包共享，文件名使用
  `snapinsight-0.2.7-dev.fb9edce.zip`；
- 不创建 `v0.2.7-dev.fb9edce` tag，也不创建 GitHub Release。

这里的 `0.2.7-dev.fb9edce` 只是开发沟通和文件命名使用的“构建标识”，
不会写入 Chrome Manifest。Chrome Manifest 的 `version` 保持纯数字格式。

发布 PR 已把 Manifest 更新为 `0.2.8`、但尚未创建正式 tag 时，验证构建可
写作 `0.2.8-rc.<commit-sha>`，例如 `0.2.8-rc.a1b2c3d`。它仍只是 CI
Artifact 或文件名，不是正式产品版本；正式版本只在 `v0.2.8` tag 推送并且
Release Workflow 成功后成立。

## 1. 日常开发

1. 从最新 `main` 创建功能分支。
2. 完成功能及对应测试。
3. 本地运行：

   ```bash
   cd extension
   npm ci
   npm run check
   npm test
   npm run build
   ```

4. 创建 Pull Request。
5. PR CI 通过并完成评审后合入 `main`。
6. `main` CI 再次验证合并后的准确提交。

需要共享本地验证版本时，使用 CI Run 生成的 Artifact，并同时提供 commit
SHA。Artifact 不是 Chrome Web Store 上传包，也不会创建 GitHub Release。

## 2. 准备正式版本

为目标版本创建独立发布 PR，例如 `release/0.2.8`：

1. 更新 `extension/package.json`。
2. 更新 `extension/package-lock.json`。
3. 更新 `extension/public/manifest.json`。
4. 更新 `docs/product/store-listing.md`。
5. 将 `CHANGELOG.md` 中已完成的 `Unreleased` 内容整理到
   `## [0.2.8] - YYYY-MM-DD`。
6. 更新 `Unreleased` 和版本比较链接。
7. 等待 Release PR CI 通过后合入 `main`。
8. 等待 `main` CI 通过。

`docs/product/release-candidate-*` 是旧版本的历史发布记录。自 0.2.8 起，
不再新增该类文件；面向用户的人工发布说明统一维护在 `CHANGELOG.md`。

## 3. 创建正式版本

只有目标提交的 `main` CI 通过后才创建 tag：

```bash
git switch main
git pull --ff-only origin main
git tag -a v0.2.8 -m "SnapInsight 0.2.8"
git push origin v0.2.8
```

正式发布后不得移动或覆盖 tag。任何修复都使用新的补丁版本，例如
`0.2.9`。

## 4. 自动发布

推送 tag 后，Release Workflow 会从该不可变 tag：

1. 校验 tag、Manifest、package 和 lockfile 版本一致。
2. 执行干净安装、类型检查、测试和生产构建。
3. 生成 `snapinsight-<version>.zip`。
4. 生成 SHA-256 文件。
5. 从 `CHANGELOG.md` 提取当前版本说明。
6. 附加自动验证结果和 SHA-256。
7. 创建 GitHub Release 并上传两个附件。

如果 `CHANGELOG.md` 中缺少当前 tag 对应的版本条目，发布会失败，不会生成
内容不完整的正式 Release。

## 5. 发布后验证

1. 从 GitHub Release 下载 ZIP 和 SHA-256 文件。
2. 核对摘要。
3. 以“加载已解压的扩展程序”方式完成冒烟测试。
4. 将同一 ZIP 上传到 Chrome Web Store。
5. 记录商店审核和发布状态。
