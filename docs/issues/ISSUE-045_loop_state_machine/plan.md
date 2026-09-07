# Issue #45: 実装計画書 (Implementation Plan)

## 1. 変更ファイル一覧
- `scripts/harness/loopState.js`: [NEW] ループ状態管理マシン（読み書き・状態遷移・停止可否判定）
- `tests/harness/loopState.test.ts`: [NEW] 状態遷移の全網羅単体テスト (Vitest)
- `.gitignore`: `.agents/state/` を除外対象に追加
- `docs/pre_phase_verification.md`: Issue #45 へのポインタ更新
- `docs/implementation_plan.md`: Issue #45 へのポインタ更新
- `docs/walkthrough.md`: Issue #45 へのポインタ更新

## 2. 実装手順
1. `.gitignore` に `.agents/state/` を追加し、ローカル状態ファイルが Git 管理外となるように設定する。
2. `scripts/harness/loopState.js` を作成し、状態データ構造と遷移メソッド（`setPrCreated`, `setReviewRequested`, `setReviewResult`, `resolveIssues`, `reset`, `canStop`）を実装する。
3. `tests/harness/loopState.test.ts` を作成し、各状態遷移・未解決指摘の追跡・`canStop()` の判定ロジックをテストする。
4. `npm.cmd run check:fast` を実行し、型検査とテストが 100% 合格することを確認する。
5. `node scripts/docCheck.js` でドキュメント整合性を確認する。

## 3. 検証手順
- `vitest run tests/harness/loopState.test.ts` で全ケース PASS 確認。
- `npm.cmd run check:fast` で 100% 合格確認。
