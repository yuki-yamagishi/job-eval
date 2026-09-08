# 実装計画書 (Implementation Plan)

> [!NOTE]
> 本ファイルは最新の進行中フェーズの計画書を保持します。
> 過去のフェーズ（Phase 4〜33, Issue #40, #42, #44, #45, #46, #47, #50等）は docs/issues/ および docs/archive/phases/ に個別に保全されています。

## 現在進行中: Issue #56 (サブエージェント非同期待機中における Stop Hook デッドロック防止とコンテキスト別判定の実装)
詳細は [docs/issues/ISSUE-056_stop_hook_deadlock_prevention/plan.md](./issues/ISSUE-056_stop_hook_deadlock_prevention/plan.md) を参照。

### 実装計画サマリー
1. **状態管理マシンの拡張 (`scripts/harness/loopState.js`)**: リポジトリルート絶対パス解決、`canStop({ hasActiveSubagents, isSubagent })` 引数対応、`activeSubagents` 状態遷移対応。
2. **Stop Hook ハンドラー改修 (`scripts/harness/hooks/stopHook.js`)**: `detectSubagentContext` および `detectActiveSubagents` によるコンテキスト別 Stop 判定。
3. **単体テスト拡充**: `tests/harness/loopState.test.ts` および `tests/harness/hooks.test.ts` に全シナリオのテストを追加。
4. **検証**: Vitest 単体テストおよび `npm.cmd run check` によるワンショット品質ゲートパス。
