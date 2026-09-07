# Issue #47: Fleet レビュー実行・安全コメント投稿・結果パースツールの実装

## 1. 開発の背景と課題 (Problem Statement)
- [ADR-0016 (ループエンジニアリング確立に向けた開発ハーネスの 6 段階リファクタリング)](../../adr/0016-loop-engineering-harness-refactoring.md) の Step 4 に位置付けられるタスク。
- Fleet レビュアーの起動、レビュー本文の GitHub PR 投稿、および結果のパース処理が現在エージェントのアドホックなコマンド組み立てに依存しており、Windows PowerShell 特有のダブルクォーテーションや改行によるエスケープ事故（文字化け・失敗）が懸念される。
- さらに、従来の Conventional Comments 接頭辞体系では「称賛（Good/Praise）」のラベルが存在しなかったため、レビュアーが「良い設計・工夫」を述べる際に `[nits]`（本来は些細な修正要求・Nitpick）を誤用し、二重の意味を持ってしまう問題が発生していた。
- 自動パース時に「褒め言葉」を「未解消の指摘」と誤認して自己修復ループが終了できなくなるリスクを防ぐため、接頭辞体系を適正化し、安全な投稿ラッパーと高精度パーサーを整備する。

## 2. 実装要件 (Requirements)
1. **Conventional Comments 接頭辞体系の適正化**:
   - 称賛を表す **`[good]`**（対応不要の肯定的フィードバック）を新設。
   - `[nits]` を本来の「些細な指摘・微小な修正要求（対応任意）」として純化し、二重の意味を解消。
   - `.agents/subagents/fleet-reviewer/SYSTEM_PROMPT.md` に新体系を反映。
2. **安全な PR コメント投稿ツール (`scripts/harness/postPrComment.js`)**:
   - 引数に渡された Markdown 本文を一時ファイルに安全に書き出し、`gh pr comment --body-file` 経由で確実に投稿。
3. **レビュー結果パーサー (`scripts/harness/parseReviewResult.js`)**:
   - レビュー本文から `[must]`, `[should]`, `[imo]`, `[nits]`, `[ask]` の指摘行・件数と総合判定（`[LGTM]` または `[要修正]`）を抽出。
   - **`[good]` は称賛（対応不要）として指摘件数カウントから除外**。
   - 抽出結果を基に `loopState.js` の状態を更新（要対応指摘ありなら `NEEDS_FIX`、なしなら `RESOLVED_LGTM`）。
4. **単体テストの作成 (`tests/harness/parseReviewResult.test.ts`)**:
   - 正常系・異常系・各接頭辞（特に `[good]` の除外判定）のパース検証。

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] 日本語・改行・記号を含むレビュー本文が PowerShell 環境で破損せずに投稿できること。
- [ ] `[good]` が含まれていても未解消指摘としてカウントされず、正しく除外判定されること。
- [ ] レビュー結果から正しく指摘件数と総合判定が抽出され、状態管理マシンが更新されること。
