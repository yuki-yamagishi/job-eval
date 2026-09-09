# Issue #68: 事前検証記録 (Pre-Verification)

## 1. 検証日時
2026-09-09

## 2. 現状のアーキテクチャと課題分析

### 2.1 単一サブエージェント体制の限界
- 現在の公式サブエージェント `.agents/agents/fleet_reviewer.md` は、コード品質（TypeScript 型、アーキテクチャ、テスト、セキュリティ）と、Issue 整合性（Why / Risk / DoD）を 1 人で同時にレビューする設計になっている。
- しかし、LLM のアテンション特性として眼前のコード差分（How）に認知リソースが奪われ、Issue の根本動機（Why）や「エージェントの慢心によるやり残し」を批判的に掘り下げる視線が鈍る（確証バイアス）。

### 2.2 ステートマシンの単一レビュー前提
- 現在の `loopState.js` は、単一の `issues` 配列および単一の `verdict` のみを保持している：
  ```javascript
  {
    status: 'REVIEW_REQUESTED',
    prNumber: 67,
    issues: []
  }
  ```
- 2 体のサブエージェントが独立してレビュー結果を出力した際、どちらか片方の結果で上書きされたり、片方が LGTM でももう片方が REQUEST_CHANGES である場合の合議制判定ロジックが存在しない。

### 2.3 parseReviewResult.js の単一実行前提
- `parseReviewResult.js` は 1 つのファイルから verdict と issues を抽出し、直接 `loopState` を上書きする設計になっている。
- どのレビュアー（`codeReviewer` か `completionAuditor` か）の結果かを識別・マージする仕組みが必要。

## 3. 改修方針
1. `.agents/agents/fleet_completion_auditor.md` を新設し、批判的完了性・Why・排除リスク・やり残し監査に特化。
2. `.agents/agents/fleet_reviewer.md` をコード品質・セキュリティ・堅牢性に純化。
3. `loopState.js` に `reviews: { codeReviewer: null, completionAuditor: null }` スロットを追加し、両者 LGTM のみで `RESOLVED_LGTM` に遷移する合議判定（Consortium Gate）を実装。
4. `parseReviewResult.js` に `--agent-type <codeReviewer|completionAuditor>` 引数を追加。
5. 単体テストで合議制の全分岐（片方LGTM/片方NG、両方NG、両方LGTM）を網羅検証。
