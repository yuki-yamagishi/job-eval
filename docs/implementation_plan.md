# 実装計画書 (Implementation Plan)

> [!NOTE]
> 本ファイルは最新の進行中フェーズの計画書を保持します。
> 過去のフェーズ（Phase 4〜33, Issue #40, #42, #44, #45, #46, #47, #50, #56, #60, #63等）は docs/issues/ および docs/archive/phases/ に個別に保全されています。

## 現在進行中: Issue #62 (AI駆動開発のための補助資源最適化（トークン圧迫解消・過剰制約緩和・ワークスペース衛生・仕様SSOT一元化）)
詳細は [docs/issues/ISSUE-062_optimize_agent_scaffolding/plan.md](./issues/ISSUE-062_optimize_agent_scaffolding/plan.md) を参照。

### 実装計画サマリー
1. **変更対象**: `AGENTS.md`, `SKILL.md`, `issueDocChecker.js`, `docCheck.js`, `.githooks/pre-commit`, `.gitignore`, `requirement.md`, `architecture_overview.md`, ADR-0017
2. **方針**: `AGENTS.md` の憲章化（2〜3KB目標）、`SKILL.md` への詳細集約、コミット時の `walkthrough.md` 緩和、ゴミファイル削除、仕様 SSOT 一元化。
3. **検証**: `node scripts/docCheck.js --pre-commit` および `npm.cmd run check`（ワンショット総合品質ゲート）全件 PASS。
