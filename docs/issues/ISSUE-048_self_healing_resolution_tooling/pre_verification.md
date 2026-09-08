# Issue #48: 指摘自己修復・PRコメント解決報告ツール 4軸事前検証ログ

## 1. 技術的ボトルネック検証 (Technical Bottlenecks)
- **PowerShell / CLI 引数エスケープ・文字化け**:
  - PR コメントに長文の Markdown や箇条書き、改行、特殊文字が含まれる場合、PowerShell の引数展開で破損するリスクがある。
  - **対策**: ADR-0016 / Issue #47 で確立した `scripts/harness/postPrComment.js` の `--body-file` 一時ファイル経由の安全投稿インターフェースを活用し、文字化けやクォート破壊を物理的に防止する。
- **PR 番号および対象指摘の取得漏れ**:
  - 引数での渡し忘れによる投稿失敗を防ぐ必要がある。
  - **対策**: 引数指定がない場合は `.agents/state/loop_state.json` に記録されている `prNumber` および未解決の必須指摘（`must`, `should`）を自動フォールバック取得する。

## 2. UX / 開発者体験検証 (Developer Experience)
- **ワンショット解決報告**:
  - エージェントは修正コミットを行った後、`node scripts/harness/resolveReview.js --commit <hash> --summary "<概要>"` を 1 行実行するだけで、構造化された公式解決レポート（チェックボックス、コミットリンク、判定）が PR スレッドに投稿される。
- **事前のドライラン検証**:
  - `--dry-run` フラグをサポートし、GitHub への実投稿を行わずに生成される Markdown や状態遷移結果を安全に事前確認可能とする。

## 3. データ永続性 & 状態整合性検証 (Data Persistence & State Consistency)
- **状態機械との完全同期**:
  - `loopState.js` の `resolveIssues(commitHash, targetIds)` を呼び出し、各指摘の `resolved: true` および `resolvedCommit: hash` を記録。
  - 未解消ブロッキング指摘（`must`, `should`）がゼロになった場合のみ `STATUS.RESOLVED_LGTM` に遷移し、Stop フックの停止ガードが解除される。
- **原子性とクリーンアップ**:
  - 投稿エラー時は状態更新を行わずエラーを返却し、不整合な状態永続化を防止する。

## 4. テスト自律性検証 (Test Autonomy)
- **高テスト容易性設計（DI パターン）**:
  - `postCommentFn` および `stateMachine` をオプション引数として注入可能（DI）にし、実際の Git/GitHub コマンドやファイルシステムに依存せず、Vitest 上で 100% 単体テスト可能とする。
- **全分岐の網羅**:
  - 全解消シナリオ、一部解消シナリオ、バリデーションエラー、ドライラン、投稿失敗エラーハンドリングを単体テストで網羅する。
