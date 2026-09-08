# 実装計画書 (Implementation Plan)

> [!NOTE]
> 本ファイルは最新の進行中フェーズの計画書を保持します。
> 過去のフェーズ（Phase 4〜33, Issue #40, #42, #44, #50等）は docs/issues/ および docs/archive/phases/ に個別に保全されています。

## 現在進行中: Issue #46 (ライフサイクルフック（hooks.json）による機械的インターセプトの配備)
詳細は [docs/issues/ISSUE-046_lifecycle_hooks/plan.md](./issues/ISSUE-046_lifecycle_hooks/plan.md) を参照。

### 実装計画サマリー
1. **変更ファイル**: `.agents/hooks.json` の新設、`scripts/harness/hooks/`（`stopHook.js`, `preToolHook.js`, `postToolHook.js`）の実装、`tests/harness/hooks.test.ts` の作成。
2. **フック機能**:
   - `Stop`: `loopState.canStop()` が false の場合、停止を拒否して `continue`。
   - `PreToolUse`: 禁止コマンド（勝手なマージ等）を `deny`。
   - `PostToolUse`: `gh pr create` の成功検知で自動的に `PR_CREATED` へ遷移。
3. **検証**: Vitest によるフックハンドラーの stdin/stdout JSON プロトコル全網羅テスト。
