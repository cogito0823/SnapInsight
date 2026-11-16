# Shared Agent Governance Implementation Plan

- Type: normative
- Status: Approved
- Applicability: current
- Approval: [Approval record](baseline-approvals.md#governance-migration)
- Superseded-By: none

- Related Documents:
  - [RFC-008](../rfcs/RFC-008-shared-agent-project-governance.md)
  - [检查与复用契约](../specs/project-governance-spec.md)
  - [审核记录](shared-agent-governance-design-review.md)
  - [项目进度](project-progress.md)

## 1. 执行状态

2026-11-17 已完成本地文档与规则迁移、检查器和 CI 配置。Codex 从根目录和子目录加载规则的只读场景已通过。[PR #12](https://github.com/cogito0823/SnapInsight/pull/12) 的候选治理变更已通过 GitHub Actions。Cursor 暂缓，合并保护和第二项目采用仍待验收。结果详见[多轮复核记录](shared-agent-governance-design-review.md#implementation-review)。

## 2. 阶段与交付

### Phase 0 — 设计闭合

- [x] 重写 RFC，纳入通用/项目分层和固定版本跨项目采用。
- [x] 定义审批修订、检查输入/格式和来源迁移契约。
- [x] 给出实施阶段、反例和工具验收边界。
- [x] 复审设计修订并记录项目负责人的批准范围。

交付：RFC、spec、计划和可追溯评审记录。若用户已有明确授权覆盖后续实施，引用其范围即可，不要求重复确认。

### Phase 1 — 现行文档与原规则盘点

- [x] 保存实际迁移前完整 commit、规则摘要及未提交变更说明。
- [x] 将原三份 .mdc 映射到通用规范或项目适配，记录职责调整。
- [x] 区分已交付 Prompt API 基线、当前文档迁移授权和未核实的历史批准。
- [x] 更新 PRD、架构、运行状态/契约、总计划和清单，明确现行/提案/历史。
- [x] 保留 Batch 0–8、Companion 和旧发布记录的历史事实及证据。
- [x] 扫描旧 .mdc 的入站引用，更新当前入口和历史 commit/path 引用。

验收：现行文档能解释实际主线；不存在 Approved/current 的旧本地服务契约冒充 Prompt API 主线。必要产品决策未确认时，只推进不依赖它们的规范整理。

### Phase 2 — 单项目完整采用

- [x] 建立两个可移植的通用规范文件。
- [x] 建立 AGENTS.md、contributing、project.json，重组 docs/README.md。
- [x] 转换正式文档元数据。批准证据集中在一个记录中，按范围引用。
- [x] 初始化 local 来源清单并固定受管文件摘要。
- [x] 移除重复 .mdc，更新入站引用。

验收：一份生效通用规则、明确项目绑定、无未声明的覆盖入口；新 clone 不依赖个人路径或外部规则网络服务。

### Phase 3 — 检查器与 CI

- [x] 实现单文件标准库检查器。
- [x] 建立隔离 Git 仓库的正反例测试，覆盖部分暂存、删除/重命名、未知格式、摘要漂移和替代关系。
- [x] 加入项目 PR 模板，记录批准范围、文档影响、验证与待验证项。
- [x] 加入面向所有 PR 的 Project governance CI 配置，保留 Extension checks。
- [x] 在独立本地提交验证 commit/index 模式，CI 配置使用实际 checkout。

验收：所有契约样例达到预期；通过与失败用例都验证；检查不会自动改文件或降低要求。正式启用前修复基线问题，不留永久排除清单。

### Phase 4 — 工具实际验收与主线切换

用同一候选提交、同一任务集，在隔离工作树分别启动 Codex/Cursor 新会话。记录工具版本、工作目录、规则来源、行为证据和未测试项，不以“我已阅读”的自报代替结果。

| 场景 | 预期证据 |
| --- | --- |
| 根目录及 extension 子目录启动 | 都定位同一 AGENTS.md、适配和规范 |
| 汇报进度 | 读取现行进度，区分历史记录与本次验证 |
| 已授权的小修复 | 按实际项目命令验证并同步适用记录，不制造新 RFC |
| 尚未授权的架构变化 | 形成提案并保留现行基线，不继承旧批准 |
| 文档冲突 | 指出证据和受影响范围，独立工作继续 |
| 无法执行某项验证 | 明确未执行，不能报告通过 |
| 清空个人配置的受控测试环境 | 本地规范完整可用；不改用户真实全局配置 |

- [x] 验证 Codex 根目录及子目录加载规则，并完成只读进度汇报。
- [x] 在隔离副本验证 Codex 修复文档链接、识别已替代的历史决策、说明未获批架构变更的处理，并区分本地与远端验证。
- [ ] 完成 Cursor 加载验收及两种工具的其余适用行为场景。若实际支持版本需要兼容入口，按固定模板和 project.json 启用并重测。
- [x] 当前/历史索引及旧规则引用通过本地检查。
- [x] 在 GitHub Actions 验收候选 `d3d689b`。Project governance 和 Extension checks 均通过。[CI 运行记录](https://github.com/cogito0823/SnapInsight/actions/runs/43947971819)
- [ ] 实际配置并核验 main required checks 和可用的评审保护；记录管理员绕过和单人评审边界。

无法访问某工具或远端设置时记录“未验证”，完成可独立验证的部分；不得将整体状态写为已实施。

### Phase 5 — 可移植性与第二项目

- [x] 用临时最小非 Chrome 项目验证通用规范和检查器，覆盖目录差异和固定来源记录。
- [ ] 第二个真实项目出现时创建共享来源，将 rules/checks/templates/fixtures 作为完整单元发布到固定 commit。
- [ ] 将 SnapInsight 和第二项目从 local 迁移到 upstream，分别填写项目适配，核验源文件及摘要。
- [ ] 做一次规则升级演练和一次回滚演练，确认项目文件不会被模板覆盖。

真实第二项目采用及升级、回滚演练为 Deferred，待第二项目确定后进行。

## 3. 采用/升级的人工操作协议

首版不要求同步工具。每次操作仍需明确：旧来源 commit、目标 commit、受管 diff、项目适配 diff、检查器兼容性、验证结果、批准范围。

1. 审阅指定来源；只复制受管规则和检查器，不运行来源仓库任意安装脚本。
2. 验证旧本地摘要，出现本地差异先处理，不覆盖。
3. 更新受管文件和来源记录；模板只作为项目文件的合并参考。
4. 迁移 project.json 格式，先验证 worktree，再验证 index/候选 commit。
5. 评审核对通用规则和批准范围，合入后保留来源证据。
6. 回滚时恢复整个采用变更，并再次验证该版本的完整契约。

## 4. 完成定义

单项目完成：Phase 0–4 的适用条件全部满足；工具实际可用性和远端限制单列。跨项目完成：在此基础上，Phase 5 的真实第二项目采用及升级/回滚验证通过。

规则修改影响审批或元数据时须重跑契约测试；入口和工具版本改变时重做加载验收；普通业务修复不重复跑全部工具治理实验。

## Change Record

- 2026-11-17：完整设计重写时建立，实施项全部保留真实未完成状态。
- 2026-11-17：记录本地迁移与验证，保留工具新会话、GitHub 和第二项目待办。
