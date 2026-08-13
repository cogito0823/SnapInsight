# SnapInsight 开发与发布流程

## 总览

SnapInsight 使用主干开发和 Release Please 自动发布：

```text
功能分支 → 功能 PR → main CI
                       ↓
              Release Please 自动维护 Release PR
                       ↓
                 人工审核并合并
                       ↓
          自动创建 tag、GitHub Release、ZIP 和 SHA-256
```

开发者不再手工创建 `release/<version>` 分支，也不在正常流程中手工修改版本
文件或推送正式 tag。正式发布仍保留一次明确的人工确认：合并 Release Please
创建的 Release PR。

## 版本标识

`0.3.0` 是产品版本号，`v0.3.0` 是指向该版本提交的 Git tag：

| 场景 | 格式 | 示例 |
| --- | --- | --- |
| Manifest、package、lockfile | 不带 `v` | `0.3.0` |
| `CHANGELOG.md` 标题 | 不带 `v` | `## 0.3.0 (2026-08-13)` |
| GitHub Release 标题 | 不带 `v` | `SnapInsight 0.3.0` |
| 正式 ZIP 文件名 | 不带 `v` | `snapinsight-0.3.0.zip` |
| Git tag | 带 `v` | `v0.3.0` |

`v` 只表示 Git 版本引用，不属于产品版本号。

SnapInsight 遵循 Conventional Commits 和 Semantic Versioning：

| 合入 `main` 的提交 | 默认版本变化 |
| --- | --- |
| `fix:` | patch，例如 `0.2.7 → 0.2.8` |
| `feat:` | minor，例如 `0.2.7 → 0.3.0` |
| `feat!:`、`fix!:` 或 `BREAKING CHANGE` | major |
| `docs:`、`test:`、`ci:`、`chore:` | 不单独触发发布 |

如需明确覆盖下一版本，在提交正文中加入 `Release-As: x.y.z`。这只用于经过
评审的例外情况，不应成为日常版本选择方式。

## 构建类型

| 类型 | 标识方式 | 是否正式发布 |
| --- | --- | --- |
| 本地开发构建 | 当前 Manifest 版本 + Git commit SHA | 否 |
| CI 验证构建 | `snapinsight-extension-<commit-sha>` Artifact | 否 |
| Release PR 构建 | Release PR 中的候选版本 + commit SHA | 否 |
| 正式版本 | 产品版本 + 不可变 `v<version>` tag | 是 |

普通功能 PR 和 `main` CI 不修改正式版本号。Release Please 只在自动 Release
PR 中更新版本文件和 Changelog；该 PR 合并后才成立正式版本。

## 仓库配置前提

Release Please 工作流需要仓库管理员完成一次配置：

1. 创建能够访问本仓库的 fine-grained personal access token，或等价的
   GitHub App installation token。
2. 至少授予：
   - Contents: Read and write
   - Pull requests: Read and write
   - Issues: Read and write（用于 Release Please 标签）
3. 将 token 保存为仓库 Actions Secret：`RELEASE_PLEASE_TOKEN`。
4. 在仓库 Actions 设置中允许 GitHub Actions 创建 Pull Request。
5. 为 `main` 保留 CI 必须通过和 PR 审核规则。

不能仅依赖默认 `GITHUB_TOKEN`：由它创建的 Release PR 通常不会再次触发 PR
CI。使用独立 token 可以确保自动 Release PR 走与普通 PR 相同的检查。

## 1. 日常开发

1. 从最新 `main` 创建功能分支。
2. 完成功能、测试和相关文档。
3. 本地运行：

   ```bash
   cd extension
   npm ci
   npm run check
   npm test
   npm run build
   ```

4. 使用 Conventional Commit 风格提交，例如：

   ```text
   feat(extension): keep Prompt API model ready
   fix(extension): clean up sessions returned after cancellation
   docs: clarify model lifecycle
   ```

5. 创建功能 PR，建议使用 squash merge，使进入 `main` 的最终提交准确表达用户
   可见变化和版本影响。
6. PR CI 和评审通过后合入 `main`；`main` CI 再次验证准确合并提交。

功能合并不会立即正式发布，也不会为每个 PR 消耗一个版本。

## 2. 自动 Release PR

每次 `main` 更新后，`.github/workflows/release.yml` 运行 Release Please：

1. 从上一个正式版本 tag 起读取 Conventional Commits。
2. 计算下一版本。
3. 创建或更新同一个 Release PR。
4. 自动更新：
   - `.release-please-manifest.json`
   - `version.txt`
   - `extension/package.json`
   - `extension/package-lock.json` 的两个版本字段
   - `extension/public/manifest.json`
   - `docs/product/store-listing.md` 中标注的版本
   - `CHANGELOG.md`
5. 后续功能继续合入时，自动刷新该 Release PR，而不是创建多个手工发布分支。

Release PR 是候选发布内容，应审核：

- 版本号是否符合变更范围；
- Changelog 是否准确、完整且面向用户；
- Manifest、package 和 lockfile 是否一致；
- CI 是否通过；
- Chrome 真实环境验收是否完成；
- 商店说明或权限披露是否需要同步更新。

如自动生成的发布说明不够准确，应直接修正相关功能 PR 的 squash commit
信息；已合并 PR 也可按照 Release Please 的 `BEGIN_COMMIT_OVERRIDE` 机制修正
解析结果。必要时可以编辑 Release PR，但应避免长期维护手工 `Unreleased`
区块。

## 3. 正式发布

当版本准备好时，人工合并 Release PR。随后同一个 Release 工作流会：

1. 立即创建不可变 `v<version>` tag 和初始草稿 GitHub Release；配置中的
   `force-tag-creation` 避免草稿 Release 延迟创建 tag。
2. 从该 Release 提交校验 Manifest、package、lockfile、`version.txt`、商店
   资料和 Release Please manifest 的版本一致性。
3. 执行干净安装、类型检查、测试和生产构建。
4. 生成 `snapinsight-<version>.zip`。
5. 生成 SHA-256 文件。
6. 从 `CHANGELOG.md` 提取当前版本说明并附加验证结果。
7. 将 ZIP 和校验和上传到 GitHub Release，验证完成后再将草稿发布。

正式 tag 不得移动或覆盖。发现问题时，通过新的 `fix:` PR 生成下一个 patch
版本。

## 4. 发布后验证

1. 从 GitHub Release 下载 ZIP 和 SHA-256 文件。
2. 核对摘要。
3. 以“加载已解压的扩展程序”方式完成 Chrome 冒烟测试。
4. 将同一 ZIP 上传到 Chrome Web Store。
5. 记录商店审核和发布状态。

GitHub Release 自动化不等于 Chrome Web Store 已发布；商店上传与审核仍是
独立的发布后步骤。

## 5. 故障恢复

- Release Please 没有创建 PR：确认 `main` 中存在 `feat:`、`fix:` 或其他可
  发布提交，并检查 `RELEASE_PLEASE_TOKEN` 与 Actions PR 权限。
- Release PR 没有触发 CI：确认工作流使用的是 `RELEASE_PLEASE_TOKEN`，而
  不是默认 `GITHUB_TOKEN`。
- Release PR 合并后打包失败：Release 保持草稿状态；修复工作流后重新运行失败
  job。发布步骤会以 `--clobber` 覆盖同一 Release 的附件，不移动 tag。
- 自动版本不符合预期：在合并 Release PR 前修正 Conventional Commit 解析，
  或使用经过评审的 `Release-As: x.y.z` 覆盖。

`docs/product/release-candidate-*` 仅保留为 0.2.7 及之前的历史记录，不再新增。
