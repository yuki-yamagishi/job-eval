# Phase 30: GitHub Actions ＋ Gemini API による自動 AI PR レビューボットの導入 実装計画書 (Issue #34, ADR-0012)

## 🎯 実装目的・概要
プルリクエスト（PR）が発行・更新された際、GitHub Actions をトリガーとして独立した AI レビュアー（Gemini API）が自動でコード差分（diff）およびアーキテクチャ規約（`AGENTS.md`）を解析し、客観的な指摘・エッジケース検出・保守メモを PR コメントとして自動投稿するレビュー自動化基盤を構築します。

---

## 📝 変更ファイル一覧と実装内容

### 1. ガバナンス・設計ドキュメント
- `docs/issues/ISSUE-034_ai_pr_reviewer_workflow.md` 起票
- `docs/adr/0012-ai-automated-pr-review-workflow.md` 起票 & `docs/adr/README.md` 登録
- `docs/pre_phase_verification.md` & `docs/walkthrough.md` 更新

### 2. レビュー自動化スクリプト (`scripts/aiPrReviewer.js`)
- PR の Git 差分（`git diff origin/main...HEAD` 等）または GitHub Actions context から変更内容を取得。
- Gemini API（`gemini-2.5-flash` または利用可能なモデル）を呼び出し、コード差分・コンテキスト・`AGENTS.md` 規約をプロンプトに注入。
- エッジケース・保守メモ・アーキテクチャ整合性にフォーカスした構造化レビュー結果を生成。
- `GITHUB_TOKEN` を用いて GitHub REST API または `gh pr comment` で PR にコメントを投稿。
- `GEMINI_API_KEY` 未設定時や外部 PR での Graceful Skip 機構。

### 3. GitHub Actions ワークフロー (`.github/workflows/ai-pr-reviewer.yml`)
- `pull_request` イベント（`opened`, `synchronize`, `reopened`）でトリガー。
- 権限: `pull-requests: write`, `contents: read`。
- Node.js 環境で `scripts/aiPrReviewer.js` を実行。

### 4. 単体テスト (`tests/scripts/aiPrReviewer.test.ts`)
- diff パース、プロンプト構築、Gemini API レスポンス解析、コメント投稿の各関数の単体テストを作成。

---

## 🧪 検証手順
1. `npm.cmd run test:run` の全テスト PASS 確認。
2. `npm.cmd run check` による全品質ゲート（セキュリティ、ドキュメント、型、テストカバレッジ、ビルド）100% PASS 確認。
3. PR を起票し、GitHub Actions ワークフローとスクリプトが正しくコミットされていることを確認。

---
