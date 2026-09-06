# Issue #45: ループ状態管理マシン（State Machine）の設計と単体実装

## 1. 開発の背景と課題 (Problem Statement)
- [ADR-0016 (ループエンジニアリング確立に向けた開発ハーネスの 6 段階リファクタリング)](../../adr/0016-loop-engineering-harness-refactoring.md) の Step 2 に位置付けられるタスク。
- エージェントの会話履歴（Context）だけに依存した自己修復ループは、コンテキストサマリーや長大化によって「現在ループのどこにいるのか」を見失い、早期停止を招く根本原因となっていた。
- `Stop` フックや各種スクリプトが決定論的に判定を下すために、ファイルベースでループ進行状態を保持・遷移・判定する状態管理マシン（`scripts/harness/loopState.js`）が必要である。

## 2. 実装要件 (Requirements)
1. **状態モデルの定義**:
   - `IDLE`: ループ非作動（通常開発中）
   - `PR_CREATED`: PR 作成完了（レビュー待ち）
   - `REVIEW_REQUESTED`: Fleet レビュー起動中
   - `NEEDS_FIX`: レビュー完了、未解消指摘（`[must]`, `[should]`）あり
   - `RESOLVED_LGTM`: 全指摘解消・最終判定 LGTM 到達（マージ待ち）
2. **状態管理スクリプトの実装 (`scripts/harness/loopState.js`)**:
   - 状態ファイルの読み書き（`.agents/state/loop_state.json`）
   - 状態遷移メソッド（`setPrCreated(prNumber)`, `setReviewResult(...)`, `resolveIssues(...)`, `reset()`）
   - 現在の終了可否判定メソッド（`canStop()`: `IDLE` または `RESOLVED_LGTM` のみ true）
3. **単体テストの作成 (`tests/harness/loopState.test.ts`)**:
   - 状態遷移の全網羅テスト（Vitest）

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] `loopState.js` の全状態遷移が単体テストで 100% 検証・合格すること。
- [ ] `.agents/state/loop_state.json` が Git 管理外（`.gitignore`）として扱われること。
