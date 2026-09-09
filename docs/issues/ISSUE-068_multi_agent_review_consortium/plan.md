# Issue #68: 実装計画書 (Implementation Plan)

## 1. 改修の目的
Antigravity 2.0 の「The Agent Fleet is the unit of work」思想に基づき、独立した 2 者のサブエージェント（コード品質担当 ＋ 批判的完了性監査担当）による並行レビューおよび合議制ステートマシン（Multi-Agent Review Consortium Gate）を構築する。

## 2. 実装ステップ

### ステップ 1: 公式サブエージェント定義の新設・純化
- `.agents/agents/fleet_completion_auditor.md`（新設）:
  - 役割: 批判的完了性・Why・排除リスク・やり残し・ユーザー視点での死角の徹底監査
- `.agents/agents/fleet_reviewer.md`（更新）:
  - 役割: TypeScript 型安全性、アーキテクチャ原則、セキュリティ、テスト完全性、デッドロック防止の専門レビュー

### ステップ 2: loopState.js の合議制（Consortium）対応
- 状態モデルの拡張：
  ```javascript
  {
    status: 'REVIEW_REQUESTED',
    prNumber: 68,
    reviews: {
      codeReviewer: { verdict: 'LGTM', issues: [], reviewedAt: '...' },
      completionAuditor: { verdict: 'REQUEST_CHANGES', issues: [...], reviewedAt: '...' }
    },
    issues: [...], // 全レビュアーの集約指摘
    activeSubagents: false
  }
  ```
- 遷移ロジック：
  - `recordReview(agentType, { verdict, issues })`:
    - 指定スロットにレビュー結果を記録。
    - 両者のスロットが埋まり、かつ両者 `verdict === 'LGTM'` の場合のみ `RESOLVED_LGTM` に遷移。
    - いずれかが `REQUEST_CHANGES` の場合は `NEEDS_FIX` に遷移し、指摘事項をマージ。
    - 片方のみレビュー完了時は `REVIEW_REQUESTED` のまま待機（`canStop` は拒絶）。

### ステップ 3: parseReviewResult.js の拡張
- CLI 引数 `--agent-type <type>`（`codeReviewer` または `completionAuditor`）の追加。
- 解析結果を `loopState.recordReview()` に伝搬。

### ステップ 4: review-self-healing スキルの Runbook 更新
- PR 作成後、`invoke_subagent` で `fleet_reviewer` と `fleet_completion_auditor` を同時に並行起動する手順を明記。
- 両者の結果をパースし、合議判定を確認するフローを標準化。

### ステップ 5: ハーネステストの拡充
- `tests/harness/loopState.test.ts`:
  - 2 者合議制（片方のみLGTM、両方NG、両方LGTM）の全分岐テスト。
- `tests/harness/resolveReview.test.ts`:
  - 複数エージェントからの指摘解消と合議フロー検証。

### ステップ 6: ADR-0019 制定と仕様正本（SSOT）同期
- `docs/adr/0019-multi-agent-review-consortium.md`
- `docs/architecture_overview.md`

## 3. 検証計画
- `npm.cmd run test:run -- tests/harness/`
- `npm.cmd run check` (ワンショット品質ゲート 100% PASS)
- 実際の 2 者 Fleet 並行レビューの受領検証
