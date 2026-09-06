# Issue #48: 指摘自己修復・PRコメント解決報告ツールの実装

## 1. 開発の背景と課題 (Problem Statement)
- [ADR-0016 (ループエンジニアリング確立に向けた開発ハーネスの 6 段階リファクタリング)](../../adr/0016-loop-engineering-harness-refactoring.md) の Step 5 に位置付けられるタスク。
- Fleet レビューで指摘（`[must]`, `[should]`）を受けた後、エージェントが手元で修正コミットを行い、PR スレッドに解決（Resolved）報告を投稿するフローを自動化・標準化する。
- 手動での返信文作成による報告漏れや状態不整合を防ぎ、全指摘の解消を自動判定してループを収束させる。

## 2. 実装要件 (Requirements)
1. **解決報告ツール (`scripts/harness/resolveReview.js`)**:
   - 対応したコミットハッシュ、修正概要、解決理由を引数に受け取る。
   - `postPrComment.js` を利用して PR スレッドに公式解決コメント（`[Resolved]`）を投稿。
   - すべての必須指摘が解消されたら `loopState.js` を `RESOLVED_LGTM` に遷移させる。
2. **単体テストの作成 (`tests/harness/resolveReview.test.ts`)**:
   - 解決コメント生成と状態遷移の単体テスト。

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] 修正コミット情報と紐づいた解決コメントが正常に生成・投稿できること。
- [ ] 全指摘の解消をもって状態が `RESOLVED_LGTM` に更新されること。
