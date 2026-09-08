# Issue #47 実装計画書 (Implementation Plan)

## 1. 概要
- Fleet レビュアーの Conventional Comments 体系に称賛を表す `[good]`（対応不要）を新設。
- Windows PowerShell 環境でエスケープ事故を起こさない安全な PR コメント投稿ツール (`scripts/harness/postPrComment.js`) を実装。
- レビュー本文から指摘事項と総合判定を抽出し、`[good]` を除外して `loopState.js` と連携するパーサー (`scripts/harness/parseReviewResult.js`) を実装。
- 単体テストの網羅 (`tests/harness/parseReviewResult.test.ts`, `tests/harness/postPrComment.test.ts`)。

## 2. 変更・新規作成ファイル一覧
1. `docs/issues/ISSUE-047_fleet_review_tooling/pre_verification.md` [作成済]
2. `docs/issues/ISSUE-047_fleet_review_tooling/plan.md` [本ファイル]
3. `docs/pre_phase_verification.md` [更新]
4. `docs/implementation_plan.md` [更新]
5. `.agents/subagents/fleet-reviewer/SYSTEM_PROMPT.md` [更新: `[good]` 新設と `[nits]` 純化]
6. `scripts/harness/postPrComment.js` [新規作成]
7. `scripts/harness/parseReviewResult.js` [新規作成]
8. `tests/harness/postPrComment.test.ts` [新規作成]
9. `tests/harness/parseReviewResult.test.ts` [新規作成]
10. `docs/issues/ISSUE-047_fleet_review_tooling/walkthrough.md` [実装完了後作成]
11. `docs/walkthrough.md` [実装完了後更新]

## 3. 実装詳細仕様

### (1) `.agents/subagents/fleet-reviewer/SYSTEM_PROMPT.md`
- 接頭辞体系に `[good]` を追加:
  - `[must]`: マージ前に修正必須（潜在バグ、セキュリティ欠陥、破壊的変更、重大な規約違反）
  - `[should]`: 強く推奨（保守性、堅牢性、エラーハンドリング向上）
  - `[imo]`: 私見・提案（別アプローチ、リファクタリング案、対応任意）
  - `[nits]`: 些細な指摘（typo、命名微修正、コメント追記等、対応任意）
  - `[ask]`: 質問・確認（実装意図や背景の確認）
  - `[good]`: 称賛・好ましい実装（対応不要、優れた設計や工夫の評価）
- コメント冒頭の凡例ガイドに `[good]` を含めること、および総合判定 `[LGTM]` または `[要修正]` の明示を義務化。

### (2) `scripts/harness/postPrComment.js`
- `postPrComment(prNumber, commentBody, options = {})`
  - `commentBody` を UTF-8 で一時ファイル (`os.tmpdir()` 配下) に書き出す。
  - `gh pr comment <prNumber> --body-file <tempPath>` を同期実行。
  - 成功・失敗を問わず `finally` で一時ファイルを削除。
  - CLI: `node scripts/harness/postPrComment.js <prNumber> [bodyOrFilePath]`

### (3) `scripts/harness/parseReviewResult.js`
- `parseReviewResult(markdownText, options = {})`
  - 総合判定の判定:
    - `[LGTM]` または `LGTM` の有無。
    - `[要修正]` の有無。
  - 指摘行の抽出:
    - パターン: `/[-*#0-9.]*\s*(?:\*\*)?\[(must|should|imo|nits|ask|good)\](?:\*\*)?[:\s]*(.*)/i`
    - 接頭辞種別を小文字正規化。
    - `[good]` は `praise` 配列に格納し、未解決指摘（`issues` 配列）からは除外、または `type: 'good'` かつ非ブロックとして扱う。
    - `blockingIssues`: `type === 'must' || type === 'should'`
    - `nonBlockingIssues`: `type === 'imo' || type === 'nits' || type === 'ask'`
    - 最終的な `isLgtm`: `hasLgtm && blockingIssues.length === 0`
  - オプション `updateState: true` の場合:
    - `scripts/harness/loopState.js` の `setReviewResult` を自動呼び出し。
  - CLI: `node scripts/harness/parseReviewResult.js <fileOrText> [--update-state]`

### (4) 単体テスト
- `tests/harness/postPrComment.test.ts`
  - 一時ファイルのライフサイクル（作成とクリーンアップ）の検証。
  - 正常系および外部コマンド失敗時の例外ハンドリング。
- `tests/harness/parseReviewResult.test.ts`
  - `[good]` が指摘カウントに含まれないことの検証。
  - `[must]`, `[should]` による `NEEDS_FIX` 判定。
  - `[LGTM]` かつ非ブロック指摘・称賛のみの `RESOLVED_LGTM` 判定。
  - 記法揺れ（大文字小文字、リスト記法、見出し記法）の堅牢性検証。

## 4. 検証手順
- `npm.cmd run test:run tests/harness/postPrComment.test.ts`
- `npm.cmd run test:run tests/harness/parseReviewResult.test.ts`
- `npm.cmd run check`（ワンショット総合品質ゲート）
