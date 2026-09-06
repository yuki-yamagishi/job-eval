# Issue #47: Fleet レビュー実行・安全コメント投稿・結果パースツールの実装

## 1. 開発の背景と課題 (Problem Statement)
- [ADR-0016 (ループエンジニアリング確立に向けた開発ハーネスの 6 段階リファクタリング)](../../adr/0016-loop-engineering-harness-refactoring.md) の Step 4 に位置付けられるタスク。
- Fleet レビュアーの起動、レビュー本文の GitHub PR 投稿、および結果のパース処理が現在エージェントのアドホックなコマンド組み立てに依存しており、Windows PowerShell 特有のダブルクォーテーションや改行によるエスケープ事故（文字化け・失敗）が懸念される。
- これを防ぐため、安全な一時ファイル経由投稿ラッパーと、レビュー結果の自動パース・状態更新ツールを整備する。

## 2. 実装要件 (Requirements)
1. **安全な PR コメント投稿ツール (`scripts/harness/postPrComment.js`)**:
   - 引数に渡された Markdown 本文を一時ファイルに安全に書き出し、`gh pr comment --body-file` 経由で確実に投稿。
2. **レビュー結果パーサー (`scripts/harness/parseReviewResult.js`)**:
   - レビュー本文から `[must]`, `[should]`, `[imo]`, `[nits]` の指摘行・件数と総合判定（`[LGTM]` または `[要修正]`）を抽出。
   - 抽出結果を基に `loopState.js` の状態を更新（指摘ありなら `NEEDS_FIX`、なしなら `RESOLVED_LGTM`）。
3. **単体テストの作成 (`tests/harness/parseReviewResult.test.ts`)**:
   - 正常系・異常系・各接頭辞のパース検証。

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] 日本語・改行・記号を含むレビュー本文が PowerShell 環境で破損せずに投稿できること。
- [ ] レビュー結果から正しく指摘件数と総合判定が抽出され、状態管理マシンが更新されること。
