# Shared Agent Governance Design Review

- Type: record
- Status: Implemented
- Applicability: current
- Approval: none
- Superseded-By: none

- Review date: 2026-11-17
- Review result: Local migration, Codex rule loading, GitHub Actions and `main` branch protection verified. Cursor behavioral acceptance remains open.
- Review type: Author self-review; not independent approval
- Related Documents:
  - [RFC-008](../rfcs/RFC-008-shared-agent-project-governance.md)
  - [Project progress](project-progress.md)

## Scope and evidence

审核 RFC-008 的工作区版本（本次审核新增 Review Record 之前，共 199 行）；仓库 HEAD 为 `2674a9b`，该 RFC 尚未提交，因此 HEAD 不是被审设计的版本标识。下述定位使用章节名，并附审核前的行号，避免把未来移动后的行号当成原证据。

对照材料为现有三份 `.cursor/rules/*.mdc`、docs/README.md、现行 CI 配置和项目进度。此次是设计与可实施性检查，没有启动 Codex/Cursor 新会话验收，也未验证远端分支保护。本记录不宣称独立评审或项目负责人批准。

## Outcome

前两轮审核形成 G-01 至 G-04。随后项目负责人批准了重写后的 RFC-008 并授权迁移。以下各条保留发现和原建议，实施结果见本文件末尾。

| 发现 | 当前回应 | 状态 |
| --- | --- | --- |
| G-01 | RFC §6 与 spec §4 区分规范和记录，约束批准范围 | 本地复核通过 |
| G-02 | spec §2–9 明确检查契约和快照 | 本地用例通过，远端 CI 待验证 |
| G-03 | RFC §9 固定 commit/path | 本地迁移和入站引用验证通过 |
| G-04 | RFC §3–5 分层及固定版本采用 | 非 Chrome 用例通过，真实第二项目待定 |

配套交付：[检查契约](../specs/project-governance-spec.md)、[实施计划](shared-agent-governance-implementation-plan.md)。本次为作者修订回应，不作为独立复审或负责人批准。

## Findings

### G-01 — [P1] 已批准文档的实质性修订没有重新绑定批准范围

- Status: Verified in local implementation review
- Location: RFC-008 §7，审核前第 102–108 行；关联 §5 第 75–77 行。

方案要求“新批准或状态迁移”引用审批证据，但没有规定已标为 Approved/Accepted 的文档在正文实质变化后如何处理。如果代理修改一份 Approved/current 的契约，保留原状态和旧审批引用，该文档仍会被导航视为现行依据，也没有触发方案规定的“状态迁移”。这会让旧批准被错误地用于新内容，重现本项目当前存在的“状态仍批准、内容已变更”的问题。

§5 已有先决策和不代批的原则，问题是缺少修订场景下的操作规则，而不是缺少禁止代批的口号。

修正建议：

- 区分编辑性修改、已授权范围内的调整、改变范围/架构/契约的实质修订。
- 实质修订必须引用覆盖本次变更的已有明确授权，或进入待审状态；旧审批不自动授权新正文。
- 待审期间保留最后批准基线的可追溯版本/引用，并将新提案与当前依据区分。无需让所有拼写修改都重新审批。
- 定义 Status 与 Applicability 的有效组合，并区分“当前任务记录”和“当前获批实施依据”：例如 Draft 的进度记录可以反映当前工作，但 Draft 的契约不能因此成为获批契约。
- 由评审核对批准范围，结构检查只核对记录完整性，不假装自动识别语义变化或审批真实性。

验收反例：修改 Approved/current 契约的行为要求，仅保留旧审批记录；评审必须识别其批准不覆盖新内容。相反，纯排版修订不得被强制要求新的负责人审批。

### G-02 — [P2] 检查器缺少可复现的输入与格式契约

- Status: Local checker verified
- Location: RFC-008 §7 第 111 行，§9.1 第 137–146 行。

方案将元数据、替代关系、现行索引和本地链接列为阻断项，却没有定义“正式文档”的路径集合、元数据的唯一格式、替代字段、索引分区的识别格式，以及“当前变更中准备提交的文档”的 Git 文件集合。当前仓库已有 `- Status:`、反引号路径、相对 Markdown 链接等多种表达；不能让实现者靠猜测决定哪些条目属于检查对象。

尤其是本地读取工作树还是暂存区没有明确：部分暂存时可能检查到尚未准备提交的修复，而实际暂存版本仍不合法；CI 则只看到提交快照，造成同一命令本地通过、提交后失败。新文件与已删除文件的处理也需要明确定义。

修正建议：

- 在实施前补一个最小检查规范：正式文档路径范围、字段语法、替代引用格式、索引格式及合法示例。不必新增复杂清单数据库。
- 明确默认检查工作树还是 index，以及新文件、删除、重命名、部分暂存的语义。工作树预检与提交快照验收要清楚区分，不能声称二者天然一致。
- 给出可执行的正反例：合法索引、缺字段、替代循环、指向已删除文件、合法历史记录、代码块示例、部分暂存、新增文档。
- 明确解析不了的结构是阻断还是提示，防止格式一变检查就静默漏过。

验收标准：不同实现者按同一规范，对相同 Git 快照和样例得出同样的文件集合、通过/失败结果及诊断；本地工作树结果不被误报为提交快照已验证。

### G-03 — [P2] 删除旧规则后，设计自身的依据链接会断裂

- Status: Local migration verified
- Location: RFC-008 §6 第 96 行；Related Documents 第 7–8 行。

迁移要求删除旧 `.mdc`，但只明确更新 docs/README.md 的旧规则链接。RFC-008 自身仍通过相对链接引用将被删除的 assistant-agreement.mdc 和 implementation-workflow.mdc。实施完成后，作为现行决定依据的 RFC 会存在断链，违反 §9.1 的现行文档链接检查；迁移映射的原始规则也不再能从记录中直接查到。

“Git 历史保留原文”是正确的，但需要提供可定位的版本引用，不能继续用指向当前工作树的路径代表历史证据。

修正建议：迁移删除前，检查全部入站引用；当前指导链接更新到共享规范，历史依据改为旧规则最后有效版本的不可变提交链接或明确的 commit + path 记录。不要把所有旧链接简单换成新规范而丢失迁移比较依据。

验收反例：在临时工作树完成旧规则删除，RFC 及现行索引没有悬空本地链接，且审核者仍能按固定版本查看迁移前规则。

## Non-findings and boundaries

- 不要求重复维护两份完整规则；根级共用入口的选择合理。
- 不要求对所有源码变更强制修改 PRD，方案已有按任务规模执行的边界。
- 不把模型自报、链接检查或状态字段当成语义一致和真实审批证明，方案已明确这一限制。
- 远端权限、实际工具版本及独立评审可用性属于实施验收事项；本次未验证，不视为已完成。

## Second review: reusable rules and project-specific documents

- Date: 2026-11-17
- Scope: RFC-008 §5–6 的规则归属、跨项目复用与版本边界。
- Result: Changes requested；新增 G-04。G-01、G-02、G-03 未因本次分层复核而关闭。
- Review type: Author self-review；以下为修订建议，不是已批准的新规则。

### G-04 — [P2] 共享于工具与共享于项目的边界没有分开

- Status: Portability fixture verified; production adoption pending
- Location: RFC-008 §5 文件布局和职责说明、§6 迁移映射。

原方案的 contributing 同时承载可复用的文档分类/生命周期、项目执行流程和 Python 环境要求；AGENTS.md 核心条目又直接包含扩展的验证要求。这解决了 Codex/Cursor 共用的问题，却没有解决下一项目如何复用规则的问题。照搬整份文件会把 SnapInsight 的目录、命令、架构限制和发布流程带到其他项目；多处手工删改后，共同规范容易发生不可见的漂移。

建议修订为下述四类职责。分类用于确定信息归属，不意味着自动产生四层覆盖优先级，也不要求每次任务把所有项目文档读入上下文。

| 职责 | 推荐位置（拟新增，非现存文件） | 应包含 | 不应包含 |
| --- | --- | --- | --- |
| 工具加载入口 | 根 AGENTS.md | 明确的必读路由、不得代批/伪报验证等少量执行要求 | 完整文档规范、项目当前版本和进度 |
| 可复用治理规范 | docs/governance/documentation.md、docs/governance/workflow.md | 文档类别、命名、状态/批准规则、任务分级、变更与交付证据要求 | SnapInsight 文件名、npm 命令、Prompt API 架构 |
| 项目适配 | docs/contributing.md | 本项目采用哪些规范、按任务读取哪些文档、验证命令、条件性 Python 约束、已授权的例外 | 通用规范的全文副本、产品需求的重复描述 |
| 项目事实与证据 | docs/README.md 及现有 PRD/RFC/design/specs/plans/product | 本项目具体需求、决定、设计、规范、现行索引和进度 | 另一套通用流程或批准规则 |

最小规模先用上述两份通用规范即可；不要为每条规则创建文件。检查器格式契约可归 documentation 的附节，实际项目路径范围和验证命令属于适配层。

### docs 目录结构应如何拆分

- **通用规范**定义 discovery、RFC、PRD、design、specs、plans 的职责和何时需要它们。例如“接口契约归 specs，探索记录不能作为正式决策”。类别按项目需要启用，不要求每个项目都有全部目录或空文件。
- **项目适配**声明 SnapInsight 采用的类别和附加类别，例如 product 用于兼容性、隐私与商店发布材料；也明确 assets 是资源目录，不是需要审批的正式文档集合。
- **项目索引**在 docs/README.md 列出实际存在的现行文档和历史入口。它引用通用目录规范，不再次完整复制其分类和状态规则。
- “PRD 文件叫 PRD-snapinsight.md”“从哪里读取当前进度”是本项目绑定，不应进入通用规范。
- 当前 .cursor 规则中的项目 .venv 要求先作为项目适配保留；今后确有跨项目 Python 需求时，再抽成可选语言规范，不让所有项目依赖 Python。

### 核心要求、详细规范与例外的关系

通用规范是规则正文的维护位置。AGENTS.md 保留简短的执行要求和明确阅读指令，例如“开始前读取通用规范及项目适配；完成时报告真实验证结果”。这些是让规则被实际使用的入口要求，不维护另一套详细状态枚举或命令列表。需要反复出现的关键条款可用稳定规则标识引用；入口措辞与正文一致性由规则变更评审核对。

项目适配填入通用规范允许的选择项，而不是默认享有任意覆盖权。若项目需要偏离通用规范，记录被影响条款、理由、范围和已有授权证据；不靠“离目录更近”或“最后读到”推断规则已被覆盖。未解决的冲突不能自动选择较宽松的一条。个人偏好也不能充当可审计的团队规范来源。

### 逻辑抽取与物理存储

推荐**逻辑上分开、物理上随项目保存**：通用规范作为仓库内可版本控制的普通文件，与项目代码、适配文档和检查器一起形成可重现的基线。clone 后即可阅读和检查，不需要联网拉取规则，也不依赖某人的全局目录、绝对路径或外部软链接。

当前只有一个项目的证据，不必立即建设独立规范仓库、包管理器或规则生成系统。先验证本地分层。出现第二个真实使用项目后，可以将通用规范抽取成模板/规范仓库；各项目提交一份选定版本的副本，并记录来源与不可变 revision。项目通过显式升级变更采用新版本，不运行时追随远端 latest。

复用副本在物理上有多份，但同一项目只能有一份当前生效规范；上游来源用于更新，不是运行时第二套权威。升级时比较本地采用版本、上游新版本及项目适配，检查规则与检查器的兼容性。共享正文的改进优先回到上游，项目差异放适配层。未引入上游前无需伪造版本信息。

### 分层验收用例

1. 仅复制通用规范到一个非 Chrome 项目：正文不要求 extension 目录、Chrome Prompt API、商店发布或 npm 命令。
2. 新 clone 的 SnapInsight 在无个人配置、无需外部规则服务的条件下，可以读取全部必要规范；两工具的实际加载仍按原方案分别验收。
3. 修改测试命令只修改项目适配；修改通用状态规则只修改通用规范及受影响检查器/样例，不修改一组重复正文。
4. docs/README.md 列出的实际路径与适配层阅读路由一致，但不复制文档状态定义或维护第二份进度。
5. 如果未来引入上游，上游发布新规则不会静默改变已有项目；升级由可审查的仓库变更完成。
6. 任何项目例外可以追溯至具体条款和授权；未声明差异不会因文件位置自动获得优先级。

本轮建议修改 RFC 的分层设计，不直接创建生效规范；是否有实际跨项目采用需求决定后续是否建立上游模板。

## Follow-up

### 完整重设计的交付检查 — 2026-11-17

- 已核对 RFC、spec、实施计划的入口路径、来源模式、检查器路径、审批范围与阶段完成边界；三份文档均保持 In Review。
- 验证 6 份设计/导航文档中的 24 个本地 Markdown 链接，目标均存在；示例代码与内联代码中的假设路径不当成真实文件。
- 两个 JSON 示例通过语法解析；其中摘要占位符仅用于说明，未声称通过拟实现的 schema 或摘要校验。
- `git diff --check` 通过；新增设计文件另行检查了行尾空白。
- `.cursor/rules/` 与记录的迁移基线 `2674a9b630dca079b07dab266451ae7d3afd97f7` 无差异，固定历史引用有本地证据。
- 这些检查不等于独立设计复审，不等于治理检查器、Codex/Cursor 行为或远端门禁已验收。四项发现的状态仍为已回应、待复审或实施验证。

<a id="implementation-review"></a>
## 实施后多轮复核 — 2026-11-17

三轮由实施者执行。分析过的设计与代码变更见本次工作树，负责人授权见[批准记录](baseline-approvals.md#governance-migration)。

### 第一轮：迁移覆盖与可追溯性

- 切换前核对三份 `.mdc` 内容与 `2674a9b630dca079b07dab266451ae7d3afd97f7` 一致，无未提交规则差异。原规则 blob 分别为 `3046726cdd46393d66066d6c64ddf0a8408ee74e`、`46822a93e702ffdbb37480f3c07ba4f17b24a8dd`、`f2850ba25d75510d5f4a26e52d3f19cef2100d9e`，顺序为协作、实施、Python 规则。
- 文档优先、RFC 触发条件、审批、命名、文档生命周期、Mermaid、进度和验证归入通用规范。项目适配保留实施路径、验收命令、发布和条件性 Python 环境。只读问答按批准方案使用轻量路由。
- 当前入口只使用根 AGENTS.md。已扫描旧规则的入站引用，保留 Git 版本出处。29 份正式文档及 50 个 Markdown 检查输入通过结构和链接检查。

### 第二轮：现行文档与实现

- 对照 0.3.4 Manifest、选区检测、状态页、卡片状态、会话池、Worker 消息和 keeper 协调确认现行 PRD、架构、契约。移除历史本地服务和 Companion App 在索引中的现行性。旧正文和验证证据可按 Git 固定版本查看。
- 调整 RFC-007 的上下文时间表述，将五分钟隐藏保留明确为历史中间状态。当前策略为已用 keeper 随文档存续，并参与五个已登记 keeper 的 LRU；未用预热有独立 TTL。
- 扩展类型检查、同一 TSX loader 下的 90 个 Node 测试和生产构建通过。扩展源码无差异。Chrome 设备及商店的待验收项继续列在发布清单中。

### 第三轮：检查器与候选快照

- `node --test scripts/tests/governance.test.mjs` 通过。隔离 Git 仓库覆盖三种模式、部分暂存、新增和重命名、索引与状态、审批引用、替代关系、代码示例、失效链接、额外入口、桥接内容、固定上游记录及本地摘要漂移。测试包含可移植的非 Chrome 项目。
- `node scripts/governance/check.mjs` 工作树检查通过。同一迁移内容在独立 Git 候选仓库中的 index 与 commit 模式通过。CI 配置在实际 checkout 上调用 commit 模式并运行反例测试。
- Codex CLI `0.166.0-alpha.5.1` 在当前沙箱启动新会话时无法初始化 app-server。Cursor `3.30.14` 桌面验收调用超时，`cursor agent` 未安装且网络无法解析安装地址。两工具的新会话行为验收待完成，兼容桥接仍处于关闭状态。
- GitHub Actions 和远端 `main` required checks 待验证。`gh auth status` 在当前环境报告现有凭据无效。真实第二项目尚未选定，待选定后执行固定版本采用、升级及回滚验收。

### 后续验收 — 2026-11-17

| 检查 | 实际结果 |
| --- | --- |
| Chrome 扩展连接 | 通过。Codex 经 Chrome 扩展读取公开 GitHub 仓库，并确认 `main` 的提交。 |
| Codex 根目录新会话 | `0.166.0-alpha.5.1` 在隔离候选 `1758ff445d66a236d44f525045e3df38ddfd894e` 启动只读会话。会话实际读取四份入口文档和现行进度，区分已交付的 `0.3.4`、历史架构和待验证事项，并正确给出检查命令。 |
| Codex `extension/` 新会话 | 初次运行加载了根规则，但先按子目录查找文档。给 `AGENTS.md` 增加 Git 根目录说明后，隔离提交 `cea34c999912ea41c93fd03fd81c05457014420b` 的复测先执行 `git rev-parse --show-toplevel`，再从根目录读取四份文档。 |
| Codex 小修复和决策冲突 | 在 `cea34c9` 的一次性副本中修复了故意写错的协作指南链接，工作树恢复干净。会话依据替代关系选择现行架构，并说明恢复 Python 推理需单独提案和批准。它运行了工作树、提交检查和 10 项治理测试，并区分本地验证与 GitHub 验收。 |
| Cursor 新会话 | 未完成。桌面文件夹选择未能稳定进入隔离候选。临时下载的官方 CLI 能显示帮助。自动审批拒绝实际候选会话，因为运行可能将本地候选内容或元数据传给 Cursor。 |
| GitHub 远端状态 | 公开仓库和 API 均报告 `main` 在 `2674a9b630dca079b07dab266451ae7d3afd97f7`。分支 API 返回 `protected: false`，生效分支规则 API 返回空数组。候选未发布，候选对应的 GitHub Actions 和所需检查仍待验收。 |

本轮用 `--ignore-user-config` 启动 Codex。该选项隔离配置文件，尚未验证完全移除账户级或全局规则后的行为。Cursor 和其余 Phase 4 场景继续依实施计划验收。

<a id="rule-parity-review"></a>
### 新旧规则逐条对照 — 2026-11-17

以 `2674a9b630dca079b07dab266451ae7d3afd97f7` 的三份 `.mdc` 和旧 `docs/README.md` 为基线，对照 RFC-008 已批准的迁移范围。之前的复核确认了规则归属，本轮补查每项义务的措辞、触发条件和执行入口。

| 旧规则范围 | 对照结果及新位置 |
| --- | --- |
| 协作入口和讨论归档 | `@path` 优先、决策留档已保留。补回复用或创建讨论文档、明确记录未决问题、按影响区分聊天与文档、读取用户补充后再推进依赖项。[实施工作流](../governance/workflow.md#FLOW-START) |
| Discovery 与决策流程 | 分类与问题式框架已保留。补上临时矛盾、逐步整理、何时拆题及把已定结论同步到正式文档。项目指南恢复问题版式示例。[文档规范](../governance/documentation.md#DOC-CURRENT) · [项目指南](../contributing.md) |
| RFC 触发条件 | 初次迁移弱化为“where useful”。恢复六类触发条件及局部低风险、纯编辑、已有决定可直接实施的例外。[文档规范](../governance/documentation.md#DOC-CURRENT) |
| 文档生命周期与审核 | 负责人批准、替代关系、版本追溯已保留。补回正式文档的审查流程、四类文档的具体批准标准、批准后的实质疑问处理及 PRD 变更记录范围。[文档规范](../governance/documentation.md#DOC-APPROVAL) |
| 命名、图示和元数据 | 保留稳定文件名、英文命名与 Mermaid。明确图示归属及额外元数据的默认可选性。审批链接和适用性字段采用 RFC-008 已批准的新格式。[文档规范](../governance/documentation.md) · [项目指南](../contributing.md) |
| 实现入口和批次完成 | 补回开始或恢复实施前的计划、进度、清单、PRD、架构和相关设计/契约阅读要求。完成批次前核对适用检查和文档与实现的一致性，更新清单。[项目指南](../contributing.md) · [实施工作流](../governance/workflow.md) |
| Python 环境 | 项目根 `.venv` 与同一 shell 激活要求已保留。明确所有 Python 相关命令均适用，并补齐从子目录启动时的绝对路径及用户显式覆盖的边界。[项目指南](../contributing.md) |

保留 RFC-008 已批准的变化。桌面伴侣应用、本地 HTTP API 和 Ollama 的旧实施阅读路径由现行扩展架构和契约接替。只读问答按范围读取资料。根 `AGENTS.md` 仍是统一入口。用户已要求暂缓 Cursor 测试，GitHub 候选验收仍待独立分支运行。

更新两份通用规则的来源摘要后，治理检查通过，覆盖 29 份正式文档、50 个 Markdown 输入和 3 个摘要受管文件。10 项治理测试及 `git diff --check` 均通过。

单独复查旧 `docs/README.md` 时，补明规格遵循已批准 PRD、设计及适用的已接受 RFC，实施与发布计划以已定决策为基础，同一范围内已接受的新决策优先于旧探索记录。文档索引恢复首版需求问答的入口，并标明其历史用途。

再次逐条对照 `documentation.md` 和 `workflow.md` 后，补回正式评审的 `In Review` 阶段、没有有意义备选方案时通常免写 RFC 的默认规则、元数据位置和核心流程图的建议。流程条款也补明优先在探索文档收集答复，以及 PRD、架构、详细设计分别约束实施的哪些部分。RFC-008 已批准的任务分级及审批证据要求继续适用。

### GitHub Actions 验收 — 2026-11-17

- [草稿 PR #12](https://github.com/cogito0823/SnapInsight/pull/12) 从 `codex/document-governance` 向 `main` 提交治理迁移。
- GitHub Actions 对候选 `d3d689be9918da362d19413405db4e5d19e14145` 的 [CI 运行](https://github.com/cogito0823/SnapInsight/actions/runs/43947971819) 通过。Project governance 通过仓库治理检查及测试。Extension checks 通过依赖安装、类型检查、测试和构建，并上传扩展产物。
- 分支保护和 Cursor 仍按实施计划跟踪。

<a id="post-merge-review"></a>
### 合并后验收补记 — 2026-11-17

- [PR #12](https://github.com/cogito0823/SnapInsight/pull/12) 已合并。PR 末次提交为 `20b562f2712c56b57225304948d7dd59870d8315`，合并提交为 `58697de2141dbf8c6610750f8cb401d67e3b2706`。二者 tree 均为 `4b7fd88124c8065528a22213fb463a7dc8d9746f`。
- 合并提交的 [CI 运行](https://github.com/cogito0823/SnapInsight/actions/runs/43948668627) 中 Project governance 与 Extension checks 均通过。[Release 运行](https://github.com/cogito0823/SnapInsight/actions/runs/43948668545) 的 Release Please 步骤因 `Bad credentials` 失败，打包发布 job 跳过。
- GitHub 分支 API 返回 `protected: false`，生效分支规则 API 返回空数组。required checks 与评审保护仍未生效。
- Cursor 按负责人要求继续暂缓。主线已经切换，双工具验收仍未完成。切换顺序与 RFC-008 §9 的差异及负责人批准的一次例外见 [RFC-009](../rfcs/RFC-009-governance-rollout-before-cursor-acceptance.md)。

<a id="main-branch-protection"></a>
### main 分支保护补记 — 2026-11-17

- 按负责人要求在 GitHub 配置 `main` 分支保护。回读分支 API 得到 `protected: true`，`main` 仍为 `58697de2141dbf8c6610750f8cb401d67e3b2706`。
- [规则设置](https://github.com/cogito0823/SnapInsight/settings/branches)要求通过 PR 合入，分支须与 `main` 同步，且 GitHub Actions 的 Project governance 与 Extension checks 均通过。合并前须解决评审对话。规则对管理员同样生效，禁止强推和删除 `main`。
- 单人维护阶段的强制独立审批人数为零。已通过 GitHub API 核对生效设置。实际 PR 拦截场景留待下一次 PR 验证。
