# Issue #48: 指摘自己修復・PRコメント解決報告ツールの実装計画書

## 1. 概要 (Overview)
ADR-0016 の Step 5 として、Fleet レビューで指摘された事項を手元で修正した際、PR スレッドに解決（Resolved）報告を投稿し、状態管理マシン（`loopState.js`）を `RESOLVED_LGTM` に遷移させる自動化スクリプト `scripts/harness/resolveReview.js` を実装します。

## 2. 変更・新規作成ファイル一覧 (Files to Modify/Create)
- `scripts/harness/resolveReview.js` [NEW]: 指摘解決報告・PRコメント投稿・状態更新スクリプト
- `tests/harness/resolveReview.test.ts` [NEW]: 単体テスト（バリデーション、全解消、部分解消、DI、ドライラン）
- `docs/issues/ISSUE-048_self_healing_resolution_tooling/pre_verification.md` [NEW]: 4軸事前検証ログ
- `docs/issues/ISSUE-048_self_healing_resolution_tooling/plan.md` [NEW]: 本実装計画書
- `docs/issues/ISSUE-048_self_healing_resolution_tooling/walkthrough.md` [NEW]: 実装成果レポート
- `docs/pre_phase_verification.md` [MODIFY]: 最新フェーズへのポインタ更新
- `docs/implementation_plan.md` [MODIFY]: 最新フェーズへのポインタ更新
- `docs/walkthrough.md` [MODIFY]: 最新フェーズへのポインタ更新

## 3. 実装詳細 (Implementation Details)

### ① `scripts/harness/resolveReview.js`
- **関数シグネチャ**:
  ```javascript
  export function resolveReview({
    commitHash,
    summary,
    details = '',
    issueIds = null,
    prNumber = null,
    dryRun = false,
    stateMachine = null,
    postCommentFn = null,
  })
  ```
- **バリデーション**:
  - `commitHash`: 空文字列・未指定不可。
  - `summary`: 空文字列・未指定不可。
  - `prNumber`: 引数または `stateMachine.getState().prNumber` から取得。
- **Markdown生成**:
  - ヘッダー（`## 🛠️ 指摘自己修復・解決報告 (Self-Healing Resolution Report)`）
  - 対応コミット情報と修正概要、対応詳細
  - 解消対象の指摘一覧（チェックボックス形式、ID、タイプ、説明、コミットリンク）
  - 残存指摘がある場合の警告と、最終ステータス判定（`[LGTM (All Resolved)]` または `[要修正]`）
- **状態更新と投稿**:
  - `postCommentFn`（デフォルトは `postPrComment`）により PR スレッドに投稿。
  - `stateMachine.resolveIssues(commitHash, targetIds)` を呼び出して状態を永続化。
  - 全てのブロッキング指摘が解消されていれば `STATUS.RESOLVED_LGTM` に遷移。
- **CLI 実行インターフェース**:
  - `node scripts/harness/resolveReview.js --commit <hash> --summary "<概要>" [--details "<詳細>"] [--issue-ids "<id1,id2>"] [--pr <prNum>] [--dry-run]`

### ② `tests/harness/resolveReview.test.ts`
- 引数バリデーション（コミットハッシュなし、サマリーなし、PR番号なし）
- 全ブロッキング指摘解消と `RESOLVED_LGTM` への収束
- 一部指摘解消と `NEEDS_FIX` 維持
- カンマ区切りおよび配列形式の `issueIds` 指定
- `dryRun: true` でのコメント生成と投稿スキップ
- `postPrComment` 失敗時のエラーハンドリング
- CLI コマンド実行インターフェースの動作検証

## 4. 検証手順 (Verification Plan)
1. `npm.cmd run test:run` で新規テスト `tests/harness/resolveReview.test.ts` を含む全テストを実行。
2. `npm.cmd run check` でシークレットスキャン、ドキュメント整合性検査、型検査、テスト＆カバレッジ、ビルドのワンショット検証。
