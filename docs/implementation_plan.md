# 実装計画書 (Implementation Plan)

> [!NOTE]
> 本ファイルは最新の進行中フェーズの計画書を保持します。
> 過去のフェーズ（Phase 4〜33, Issue #40, #42, #44, #45, #46, #50等）は docs/issues/ および docs/archive/phases/ に個別に保全されています。

## 現在進行中: Issue #47 (Fleet レビュー実行・安全コメント投稿・結果パースツールの実装)
詳細は [docs/issues/ISSUE-047_fleet_review_tooling/plan.md](./issues/ISSUE-047_fleet_review_tooling/plan.md) を参照。

### 実装計画サマリー
1. **変更ファイル**: `.agents/subagents/fleet-reviewer/SYSTEM_PROMPT.md` の改定、`scripts/harness/postPrComment.js` および `scripts/harness/parseReviewResult.js` の新設、単体テストの追加。
2. **Conventional Comments 体系適正化**: 称賛を表す `[good]` の新設と `[nits]` の純化。
3. **安全な PR 投稿 & 結果パース**: `--body-file` 経由投稿、`[good]` 除外型レビューパーサーと `loopState.js` 連携。
4. **検証**: Vitest 単体テストおよび `npm run check` によるワンショット品質ゲートパス。
