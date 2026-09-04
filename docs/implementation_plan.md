# 実装計画書 (Implementation Plan)

> [!NOTE]
> 本ファイルは最新の進行中フェーズの実装計画書を保持します。
> 過去のフェーズ（Phase 4〜33）は docs/issues/ および docs/archive/phases/ に個別に細かく切り分けて保全されています。

## 現在進行中: Issue #40 (開発ハーネス刷新 & 責務分割)
詳細は [docs/issues/ISSUE-040_harness_refactoring_and_responsibility_separation/plan.md](./issues/ISSUE-040_harness_refactoring_and_responsibility_separation/plan.md) を参照。

### 変更ファイル一覧
- scripts/checkers/adrChecker.js (新規)
- scripts/checkers/agentSkillChecker.js (新規)
- scripts/checkers/issueDocChecker.js (新規)
- scripts/docCheck.js (改修)
- .agents/subagents/fleet-reviewer/subagent.json (新規)
- .agents/subagents/fleet-reviewer/SYSTEM_PROMPT.md (新規)
- .githooks/pre-push (改修)
- docs/adr/0014-harness-refactoring-and-responsibility-separation.md (新規)
- docs/adr/README.md (更新)
- .agents/skills/job-eval-harness/SKILL.md (更新)
- AGENTS.md (更新)

### 検証手順
- 
pm.cmd run doc-check
- 
pm.cmd run test:run
- 
pm.cmd run check
