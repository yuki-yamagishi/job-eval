# 実装計画書 (Implementation Plan)

> [!NOTE]
> 本ファイルは最新の進行中フェーズの計画書を保持します。
> 過去のフェーズ（Phase 4〜33, Issue #40, #42, #44, #45, #46, #47, #48, #50, #56等）は docs/issues/ および docs/archive/phases/ に個別に保全されています。

## 現在進行中: Issue #49 (AGENTS.md / SKILL.md 規約改編・二重管理解消と自己修復ループ E2E 検証)
詳細は [docs/issues/ISSUE-049_governance_harness_integration/plan.md](./issues/ISSUE-049_governance_harness_integration/plan.md) を参照。

### 実装計画サマリー
1. **`AGENTS.md` の改訂**: ループエンジニアリング完了定義（DoD: 全指摘解消・LGTM到達まで作業終了禁止）の明文化と、最新ハーネスツール群の標準規約化。
2. **`job-eval-harness/SKILL.md` の再構成**: 重複文章の廃止、実践 Runbook（開発・検証・レビュー・解決報告コマンド集）への特化。
3. **チェッカーの更新 (`scripts/checkers/agentSkillChecker.js`)**: 新規約・Runbook 構造に対応した検証項目の同期。
4. **自己修復ループの E2E 結合検証 (`tests/harness/e2eLoop.test.ts`)**: PR作成から解決報告、LGTM到達、正常終了までの一連サイクルの完全結合テスト。
