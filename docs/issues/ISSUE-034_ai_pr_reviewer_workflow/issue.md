# ISSUE-034: GitHub Actions ＋ Gemini API による自動 AI PR レビューボットの導入

## 1. 概要
プルリクエスト（PR）が発行・更新された際に、GitHub Actions をトリガーとして独立した AI レビュアー（Gemini API）が自動でコード差分（diff）およびアーキテクチャ規約（`AGENTS.md`）を解析し、客観的な指摘・エッジケース検出・保守メモを PR コメントとして自動投稿するレビュー自動化基盤を構築します。

## 2. 背景と目的
- **課題**: 現在は開発エージェントが自律的に PR を起票しているが、実装者視点のバイアスが残りやすく、潜在的なエッジケース（空データ、ネットワーク遅延、型外の入力、後方互換性など）や保守上の留意点がマージ後に発覚するリスクがある。
- **目的**: 実装エージェントとは独立した「シニアテックリード / セキュリティ＆品質スペシャリスト」としての AI レビューボットを PR CI パイプラインに組み込み、PR 発行時に自動で高品質かつ構造化されたレビューコメントを残すことで、品質向上と将来の保守性・可読性の担保を実現する。

## 3. 要件定義 & 受け入れ基準 (Acceptance Criteria)
1. **GitHub Actions ワークフロー連携**:
   - `pull_request` イベント（`opened`, `synchronize`, `reopened`）で起動するワークフロー `.github/workflows/ai-pr-reviewer.yml` を定義。
   - PR の diff を自動抽出し、PR 番号・タイトル・説明とともにレビューコンテキストを生成すること。
2. **Gemini API 連携スクリプト (`scripts/aiPrReviewer.js`)**:
   - `GEMINI_API_KEY` を用いて Gemini 2.5 Flash / Pro モデルを呼び出し、コード差分を徹底解析。
   - `GEMINI_API_KEY` が設定されていない場合や外部 PR（シークレット権限なし）の場合は、CI をエラーで停止させず警告を出して正常終了（Graceful Skip）すること。
3. **客観的・構造化されたレビューコメント投稿**:
   - 以下のセクションを含む構造化マークダウンを PR にコメント投稿（`gh pr comment` または GitHub REST API）：
     - 🎯 **概要・変更インパクト評価**
     - 🛡️ **エッジケース & 潜在的リスク (Edge Cases & Risks)**
     - 💡 **保守性・コード品質の改善提案 (Maintainability & Improvements)**
     - 📋 **AGENTS.md / アーキテクチャ整合性チェック**
4. **テスト & ガードレール**:
   - `tests/scripts/aiPrReviewer.test.ts` による単体テストで差分解析・プロンプト生成・APIレスポンス処理の堅牢性を担保。
   - `npm.cmd run check`（シークレットスキャン、ドキュメント整合性、型検査、テスト、ビルド）を 100% 通過すること。

## 4. 影響範囲
- `.github/workflows/ai-pr-reviewer.yml` (新規)
- `scripts/aiPrReviewer.js` (新規)
- `tests/scripts/aiPrReviewer.test.ts` (新規)
- `docs/adr/0012-ai-automated-pr-review-workflow.md` (新規)
- `docs/pre_phase_verification.md` / `docs/implementation_plan.md` / `docs/walkthrough.md`
