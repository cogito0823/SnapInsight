# RFC-009: Governance rollout before Cursor acceptance

- Type: normative
- Status: Accepted
- Applicability: current
- Approval: [Approval record](../plans/baseline-approvals.md#governance-rollout-exception)
- Superseded-By: none

## 差异与证据

[RFC-008](RFC-008-shared-agent-project-governance.md) §9 要求双工具新会话验收后再切换主线。[PR #12](https://github.com/cogito0823/SnapInsight/pull/12) 已于 2026-11-17 合入 `main`，合并提交为 `58697de2141dbf8c6610750f8cb401d67e3b2706`。合并后 [CI](https://github.com/cogito0823/SnapInsight/actions/runs/43948668627) 双任务通过。合并时分支保护尚未生效，随后已[配置并核验](../plans/shared-agent-governance-design-review.md#main-branch-protection)。Cursor 验收按负责人指示暂缓。暂缓指示的范围是 Cursor 测试，合并时尚未单独批准调整主线切换顺序。

## 选项与决定

| 选项 | 取舍 |
| --- | --- |
| 为 SnapInsight 本次迁移批准一次例外 | 保留已合并的规则和 CI。Cursor 行为保障仍未验证，须继续保留验收待办。 |
| 回退本次主线切换，待双工具验收后重做 | 恢复原顺序，但会移除已上线的规则和检查，且须由负责人安排回退与后续重验。 |

2026-11-17，项目负责人批准仅适用于 PR #12 的一次例外，认可本次先合入主线的处置。Cursor 验收继续暂缓，整体治理验收仍开放。后续迁移按 RFC-008 的验收顺序执行。
