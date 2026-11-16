# Project Governance Specification

- Type: normative
- Status: Approved
- Applicability: current
- Approval: [Approval record](../plans/baseline-approvals.md#governance-migration)
- Superseded-By: none

- Related Documents:
  - [RFC-008](../rfcs/RFC-008-shared-agent-project-governance.md)
  - [实施与验收计划](../plans/shared-agent-governance-implementation-plan.md)

## 1. 适用范围

本规范定义治理检查器和本地采用记录。实施与验证状态见实施计划和复核记录。

运行依赖：Node 24+、Git；只使用标准库，不动态执行配置中的命令。输入编码 UTF-8；所有机器配置为严格 JSON，无注释。未知 schemaVersion、未知字段、重复键或无效类型报配置错误，不静默采用默认新语义。

## 2. 项目配置

固定路径 docs/governance/project.json，schemaVersion = 1。顶层必需字段如下，additional properties 禁止：

```json
{
  "schemaVersion": 1,
  "entry": "AGENTS.md",
  "guide": "docs/contributing.md",
  "index": "docs/README.md",
  "formalRoots": ["docs/prd", "docs/rfcs", "docs/design", "docs/specs", "docs/plans"],
  "formalFiles": [],
  "referenceRoots": ["docs/product"],
  "referenceFiles": ["README.md", "README.zh-CN.md"],
  "cursorBridge": false
}
```

- entry、guide、index 为仓库相对文件路径，首版入口必须为根 AGENTS.md；guide/index 可适配。
- formalRoots：递归纳入其中全部 `.md` 正式文档。formalFiles 用于根目录以外的单个正式文件。路径必须存在，集合去重；不支持 glob，不允许将整个仓库当 formalRoot。
- referenceRoots/referenceFiles：只做链接检查，不强制正式状态元数据；用于产品说明、README 等。
- 规范文件与检查器由 upstream.json 纳入受管范围，不重复纳入 formalRoots，避免给复制自上游的规则伪造本项目审批。
- guide/index 始终检查链接；guide 须有 `## Verification` 与 `## Exceptions`，无例外写 None。语义由评审，不解析命令然后自动执行。
- formalRoots/formalFiles 的每个文件必须出现于索引，防止靠漏列隐藏草案。历史正式文档同样纳入，材料不能靠改成 record 规避评审。
- 配置改变扫描范围属于规则变更，PR 必须解释减少范围的理由，不用新增 exclusion 机制吞掉错误。
- referenceRoots 中的图片、HTML、ZIP 不解析为文档；允许成为链接目标。通用规范不要求每个项目使用全部类别。

路径使用 POSIX 分隔符；拒绝绝对路径、`..`、反斜杠、空段、仓库外目标和作为治理输入的软链接。文档中的相对链接可含 `..`，但规范化后不得越过仓库根。

## 3. 来源与受管文件

固定路径 docs/governance/upstream.json，schemaVersion = 1。必需字段：schemaVersion、mode、source、files。mode 为 local 或 upstream。

```json
{
  "schemaVersion": 1,
  "mode": "local",
  "source": null,
  "files": [
    {
      "sourcePath": "rules/documentation.md",
      "targetPath": "docs/governance/documentation.md",
      "sha256": "<64 lowercase hex characters>"
    },
    {
      "sourcePath": "rules/workflow.md",
      "targetPath": "docs/governance/workflow.md",
      "sha256": "<64 lowercase hex characters>"
    },
    {
      "sourcePath": "checks/check.mjs",
      "targetPath": "scripts/governance/check.mjs",
      "sha256": "<64 lowercase hex characters>"
    }
  ]
}
```

示例 sha256 是占位说明，不是可通过校验的数据。实施时计算原始文件字节的真实摘要；不自动改行尾再校验。

- local 的 source 必须为 null；sourcePath 是未来提取到共享包的布局，不代表上游已存在。
- upstream 的 source 必须为对象 `{ "repository": "https://…", "revision": "<full Git object ID>", "release": null }`。revision 为完整 40 或 64 位小写十六进制 Git object ID；release 为字符串或 null，仅展示用途。不得保存凭据。
- sourcePath/targetPath 必须唯一，必需的三个 targetPath 如示例。附加受管文件只允许 docs/governance 下的规范 Markdown 或 scripts/governance 下的 `.mjs`；不能包含入口、配置、来源记录、项目适配或 CI。
- 规范与检查器的目录中出现清单未登记的 Markdown/脚本报错；更新清单需按规则变更评审。
- 来源记录不自包含其摘要。JSON manifest、入口模板及项目适配的变化由差异评审核验，不建立递归自校验。
- 校验只读本地摘要；不联网验证 repository/revision。首次采用和升级单独核实固定来源的内容，记录在 PR。digest 不是签名。
- 规范与检查器作为同一采用单元升级。schemaVersion 不支持时报错，禁止退化为跳过检查。

## 4. 正式文档元数据

统一在文件 H1 后、首个 H2 前写独立列表行。键仅在这一元数据区域识别，忽略后文历史记录里的同名文本。大小写严格，重复键报错。允许 Related Documents 标题和普通链接列表，不把它们当状态字段。

```text
- Type: normative
- Status: In Review
- Applicability: proposed
- Approval: none
- Superseded-By: none
```

必需键：Type、Status、Applicability、Approval、Superseded-By。

- Type：normative / record。
- Applicability：current / proposed / historical。
- Approval：none 或一个标准 Markdown 本地/HTTPS 链接，指向确认记录。需要授权的文档不能用无来源的“Approved by owner”代替证据。
- Superseded-By：none 或一个指向仓库内正式文档的 Markdown 链接；首版不支持一份文档多个替代目标，必要时先建立汇总替代决定。
- H1 以 `RFC-` 开头的正式文档为 decision，其余 normative 为 reference；record 不可使用 RFC 文件名或标题。英文文件名及通用 kebab-case 约定由 documentation 说明，RFC/PRD 允许大写前缀。

### 4.1 合法组合

| 类型 | Applicability | 允许 Status | Approval |
| --- | --- | --- | --- |
| decision | proposed | Draft, In Review | none 或已有范围证据；未批准仍不作为现行依据 |
| decision | current | Accepted | 必须有证据链接 |
| decision | historical | Draft, In Review, Accepted, Rejected, Superseded | 可为 none；历史不自动获得现行授权 |
| reference | proposed | Draft, In Discussion, In Review | none 或已有范围证据 |
| reference | current | Approved, Implemented | 必须有证据链接 |
| reference | historical | Draft, In Discussion, In Review, Approved, Implemented, Superseded | 可为 none |
| record | current, historical | Draft, In Review, Approved, Implemented | Approved 必须有证据，其余可为 none |

其他组合拒绝。record 没有 proposed：它记录工作或审查事实，不声明拟议实施契约。治理设计 RFC、实施设计和实施计划属于 normative；进度、审核报告、历史验证结果属于 record。contributing 属项目流程适配，由项目采用评审确认，按 guide 规则处理，不伪装成上游规范。

仅 Superseded 状态要求 Superseded-By 非 none，其他状态必须为 none。替代目标必须存在且为 current normative；替代图不允许自环或循环。若替代目标以后再被替代，更新入站替代引用至最终现行依据，并在变更记录中保留演进链。记录旧尝试失败可用 historical Draft，不强迫虚构一个替代文档。

### 4.2 审批证据与修订

本地批准记录是正式 record，可包含多个明确标题的确认条目。每条至少写确认人、日期、来源（消息/PR/可核验摘录）、范围和修订标识；不要求公开私有聊天全文。检查器只验证 Approval 链接可解析，本地条目字段及真实性由评审。

重大修改使用单独 proposed amendment/RFC，在未批准前不覆盖 current 正文。已获授权后更新当前文件并让 Approval 指向覆盖这次变更的记录；保持旧批准和正文的固定 commit/path 作为历史依据。编辑性修改可沿用批准，但 PR 应解释不改变语义。日期更晚不自动替代旧授权。

PR 检查以评审项提示所有 current normative 正文变化，要求区分编辑性或实质性并核对批准范围；首版不自动判断语义或阻止所有已批准文件的文字修改。

## 5. 索引契约

index 中用四对唯一标记界定正式文档导航，每个区块只允许空行和 `- [标题](相对路径)`。路径相对 index，不能带锚点。区块外可自由写说明和资源导航。

```markdown
<!-- governance:current:start -->
- [产品需求](prd/PRD-snapinsight.md)
<!-- governance:current:end -->
<!-- governance:proposed:start -->
<!-- governance:proposed:end -->
<!-- governance:records:start -->
<!-- governance:records:end -->
<!-- governance:historical:start -->
<!-- governance:historical:end -->
```

- current 仅 current normative；proposed 仅 proposed normative。
- records 仅 current record；historical 为所有 historical 正式文档。
- 每个正式文档恰好出现一次；重复、缺漏、外部链接、区块嵌套和非法行报错。
- 状态只从文件元数据读取，索引不再存第二套 Status。
- 项目配置和正式文档的实际相对路径可变；本例不要求其他项目使用 SnapInsight 文件名。

## 6. 读取哪个 Git 快照

检查入口为 `node scripts/governance/check.mjs --mode <worktree|index|commit> [--ref <commit>]`。

| 模式 | 文件集合与内容 | 用途 |
| --- | --- | --- |
| worktree（默认） | `git ls-files --cached --others --exclude-standard -z` 的候选集合；读取磁盘现存内容，已删除文件不纳入 | 开发预检；未忽略的新文档也被检查 |
| index | `git ls-files --stage -z` 中 stage 0 的路径与 blob；非 0 stage 报未解决冲突 | 验证准备提交的完整快照，包含新增/删除/重命名结果 |
| commit | 将 ref 解析为 commit object，再读取其 tree/blob；不混入磁盘内容 | CI 和固定提交复验 |

- ref 只在 commit 模式有效，默认 HEAD；无法解析直接报错，不自动 fetch。Git 参数作为 argv 传递，ref 拒绝以 `-` 开头，不拼 shell 字符串。
- 所有配置、来源、文档内容、链接目标存在性均基于同一个模式的虚拟文件树。目录由树中路径推导，不用磁盘补足 index/commit 缺失目标。
- 候选集合筛到正式/参考文档、入口、规则、配置与相关本地链接目标；不会扫描未配置的任意用户素材内容。图片可作为目标确认存在，不对二进制做文档解析。
- 对全部候选路径识别额外 AGENTS.md/AGENTS.override.md、`.cursor/rules/*.mdc`，首版只允许根 AGENTS.md 及启用时的固定桥接文件。忽略 node_modules、.git、dist、build、release 目录组件；不能把正式目录配置到这些排除路径。
- 部分暂存时 worktree 通过不代表 index 通过；报告明确标记 worktree 为 mutable preview。index 报完整 tree ID，commit 报 commit/tree ID。index tree 可用 `git write-tree` 生成，仅写 Git 对象库，不更改 index/文件；无法写对象库则报告快照无法标识，不伪称精确验证。
- “只读”指不改项目内容、index 或规则；允许上述无内容副作用的 tree object 写入。commit 模式不需要写 Git。
- 被测试的入口脚本必须与快照版本一致：commit 模式从实际 checkout 的提交运行，脚本摘要与被测 tree 不同则报错；index 模式若工作树检查器与 index 不同，要求先使用隔离 checkout 运行匹配版本。不得用新检查器声称旧快照的原有门禁已通过。
- 并发变化：读取文件后固定内容为本次输入；worktree 报预检，不保证之后磁盘不变；index 前后 tree 身份变化则报重试。CI 固定提交避免混合快照。

## 7. 链接与 Markdown 解析边界

首版实现可诊断的有限解析器，不承诺完整 CommonMark。必须处理 fenced code blocks（反引号或波浪线）、inline code、HTML comments；代码示例不当链接检查。

- 支持普通内联 Markdown 链接/图片、引用式 `[text][id]` 和其定义、HTTPS 链接，以及仅锚点链接。
- 本地目标支持相对路径与百分号编码；路径规范化后不可越界，软链接目标拒绝。链接至目录根据虚拟树存在性判断。
- 反引号包裹路径视为说明，不自动当有效导航；正式索引和 Approval 必须用规定链接语法。
- 外部 URL 不联网检查，固定 commit 的历史链接可以存在；必须在正文明确其历史用途。
- 链接若带锚点，首版只验证显式 HTML `<a id="…"></a>` 标记；隐式 Markdown 标题 slug 不猜测，报告需加显式锚点或去掉 fragment。跨文档 H1/H2 普通文件链接无需 fragment。
- Markdown reference 未定义、重复定义，或发现无法解析的本地链接结构报明确错误；原始 HTML href/src 链接在正式/参考 Markdown 中首版不支持，提示改为 Markdown，不静默漏检。
- 所有纳入正式集合的历史文档也检查本地链接；已不存在的历史源改成固定 Git 引用或明确 commit/path 文本。历史命令和旧测试数字不因检查而改写。
- 成对括号、转义与 code/comment 边界用固定正反例约束实现；解析器无法可靠支持的语法应给出诊断，不用一个全文件正则假装完整支持。

## 8. 入口和兼容桥接

AGENTS.md 必须包含指向两个本地通用规范、guide、index 的链接，并直接包含“先读取适用规范、不得代批、真实验证、同步记录”的启动要求；自动检查保证链接和条款 ID 存在，文字含义由评审。

首版固定入口要求引用 DOC-APPROVAL、DOC-CURRENT、FLOW-START、FLOW-VERIFY、FLOW-CLOSE 五个条款 ID。对应通用正文包含同名显式锚点；这不是额外一套规则内容。

cursorBridge=false 时不得有 `.mdc`。true 时仅允许 `.cursor/rules/project-entry.mdc`，精确模板为：

```text
---
description: Read the shared repository instructions
alwaysApply: true
---

Read and follow the repository-root AGENTS.md before project work.
```

检查允许 LF/CRLF 差异但不允许新增业务规则。只有实际工具加载验收失败且需要支持该版本时才启用；不能用桥接代替检验。

## 9. 检查结果和执行顺序

1. 建立模式和快照，解析最小配置；缺入口或非法 schema 立即报告。
2. 检查来源清单/摘要与额外规则入口。
3. 解析正式文档元数据、索引、替代关系。
4. 检查本地链接及 Approval/guide 的结构要求。
5. 输出按路径、行号、规则 ID 排序的确定性诊断和通过计数。

退出码：0 全部通过；1 治理内容违反规则；2 配置/快照/工具输入错误而无法完成检查。禁止验证模式自动修复。诊断至少包括规则 ID、路径、可用时的行号、原因、建议动作；报告模式与 commit/tree ID 或 mutable preview。

规则分组：CFG（配置）、SRC（来源）、ENTRY（入口）、DOC（元数据/索引）、LINK（引用）。不要把真实设备验证、审核已完成或模型确实阅读规则纳入自动通过计数。

## 10. 必测契约样例

| 输入 | 期望 |
| --- | --- |
| 合法小型非 Chrome 项目 | 通过，不需要 npm 应用或 product 目录 |
| Draft/current normative | DOC 失败；Draft/current record 可以通过 |
| Approved/current 无 Approval | DOC 失败 |
| 相同状态但正文实质改变、沿用旧批准 | 结构检查可能通过，语义评审必须识别；不能宣传自动拦截 |
| Superseded 无目标或替代环 | DOC 失败 |
| current 索引引用 proposed / 正式文档漏列 | DOC 失败 |
| 新文档只在工作树，尚未 add | worktree 纳入；index/commit 不纳入 |
| 只暂存旧错误、磁盘已修好 | worktree 可过；index 必须失败 |
| 删除/重命名目标但未更新链接 | 对应快照 LINK 失败 |
| 正文代码块内旧路径 | 不按链接处理 |
| 未登记覆盖规则 / 额外受管脚本 | ENTRY / SRC 失败 |
| 改受管规则但未改摘要 | SRC 失败；同时修改摘要仍须差异评审 |
| 未知 schemaVersion / 模糊解析语法 | 明确报错，不静默跳过 |
| 远端上游产生新提交 | 已采用项目结果保持不变 |
| 索引内容在检查过程中变化 | index 模式拒绝混合快照，要求重试 |

## Change Record

- 2026-11-17：建立配套契约，响应 G-01/G-02/G-04；仅设计，尚未实现检查器。
- 2026-11-17：按批准方案实现检查器，运行状态见实施计划和复核记录。
