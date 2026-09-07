# 実装計画書 (Implementation Plan)

> [!NOTE]
> 本ファイルは最新の進行中フェーズの計画書を保持します。
> 過去のフェーズ（Phase 4〜33, Issue #40, #42, #44, #50等）は docs/issues/ および docs/archive/phases/ に個別に保全されています。

## 現在進行中: Issue #45 (ループ状態管理マシン（State Machine）の設計と単体実装)
詳細は [docs/issues/ISSUE-045_loop_state_machine/plan.md](./issues/ISSUE-045_loop_state_machine/plan.md) を参照。

### 実装計画サマリー
1. **変更ファイル**: `scripts/harness/loopState.js` の新設、`tests/harness/loopState.test.ts` の作成、`.gitignore` の更新。
2. **状態モデル**: `IDLE` → `PR_CREATED` → `REVIEW_REQUESTED` → `NEEDS_FIX` → `RESOLVED_LGTM`。
3. **検証**: Vitest による状態遷移全網羅テストおよび `npm run check:fast`。
