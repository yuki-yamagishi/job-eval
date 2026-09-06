# Issue #50: 実装計画書 (Implementation Plan)

## 1. 変更ファイル一覧
- `scripts/checkers/issueDocChecker.js`: 進行中 Issue 判定の動的化（ポインタファイル参照）およびバックログ許容
- `docs/issues/ISSUE-049_governance_harness_integration/`: 不要なダミー 3 ファイル（`pre_verification.md`, `plan.md`, `walkthrough.md`）の削除
- `docs/pre_phase_verification.md`: Issue #50 へのポインタ更新
- `docs/implementation_plan.md`: Issue #50 へのポインタ更新
- `docs/walkthrough.md`: Issue #50 へのポインタ更新

## 2. 実装手順
1. `docs/issues/ISSUE-049_governance_harness_integration/` から不要なダミー 3 ファイルを削除する。
2. `scripts/checkers/issueDocChecker.js` を改修し、`docs/implementation_plan.md` から現在進行中 Issue フォルダを動的に抽出して、バックログフォルダ（進行中より後）は `issue.md` のみで合格とするロジックを実装する。
3. `npm.cmd run doc-check` を実行し、Issue #50 が進行中として 4 ファイル検査され、#45〜#49 のバックログが `issue.md` のみで合格することを確認する。

## 3. 検証手順
- `node scripts/docCheck.js` の全件 PASS 確認。
- `npm.cmd run check` の全品質ゲート PASS 確認。
