# Phase 33: Antigravity IDE Fleet 主導の最上位モデル PR レビュー＆修正・マージ承認ワークフローへの完全刷新 実装計画書 (Issue #38)

## 🎯 実装目的・概要
GitHub Actions 上で個人 API キー（日次クォータ制約・Flash-Lite 妥協）を用いて動作していた既存の AI PR レビューボット（`ai-pr-reviewer.yml`）を技術的負債として完全廃止・削除します。
代わって、**Antigravity IDE の最上位モデル（Gemini 3.8 Flash）をフル活用した「Fleet（独立サブエージェント）」** による客観的第三者レビュー、GitHub PR コメント公式記録、および手元での迅速な修正コミット・人間承認マージを組み合わせた、クォータ制約ゼロの堅牢な新開発ワークフローを確立します。

---

## 📝 変更ファイル一覧と実装内容

### 1. `.github/workflows/ai-pr-reviewer.yml` (削除)
- GitHub Actions レビューワークフローを完全削除し、API クォータ消費、モデル妥協、CI ブロックリスクなどの負債を根絶。

### 2. `docs/adr/0013-antigravity-fleet-pr-review-workflow.md` (新規)
- ADR-0012（GitHub Actions AI PR Reviewer）を Superseded（置き換え）とするアーキテクチャ決定レコードを作成。
- 背景、GitHub Actions 方式の課題（クォータ、モデル性能妥協、即マージ問題）、および Fleet 方式の優位性と運用手順を記録。

### 3. `docs/adr/README.md` (更新)
- ADR-0012 を `Superseded (by ADR-0013)` に更新し、ADR-0013 を追加。

### 4. `AGENTS.md` (更新)
- 開発ライフサイクル（第2章）および安全規約（第5章）を改定：
  - PR 起票後の **Fleet（独立サブエージェント）による最上位モデルレビュー** 手順を明記。
  - 接頭辞ルール（`[must]`, `[should]`, `[imo]`, `[nits]`, `[ask]`）と `gh pr comment` による公式記録。
  - レビュー指摘の手元自己修復コミット＆プッシュ。
  - **PR 起票後の自動マージ厳禁・人間承認（ユーザー承認）によるマージ義務化** を明記。

---

## 🧪 検証手順
1. `npm.cmd run check`（シークレット検査、ドキュメント検査、型検査、全単体テスト、ビルド）が 100% PASS すること。
2. Git コミット・プッシュ・PR 起票後、Fleet サブエージェントを起動して新ワークフロー（第三者レビュー ➔ `gh pr comment` 投稿 ➔ 指摘確認 ➔ PR OPEN 維持でユーザー承認待ち）を実演検証。

---
