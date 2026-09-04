# ISSUE-038: Antigravity IDE Fleet 主導の最上位モデル PR レビュー＆修正・マージ承認ワークフローへの完全刷新

## 1. 概要
GitHub Actions 上で個人 API キー（日次クォータ制約・Flash-Lite 妥協）を用いて動作していた既存の AI PR レビューボット（`ai-pr-reviewer.yml`）を技術的負債として完全廃止・削除します。
代わって、**Antigravity IDE の最上位モデル（Gemini 3.8 Flash）をフル活用した「Fleet（独立サブエージェント）」** による客観的第三者レビュー、GitHub PR コメント公式記録、および手元での迅速な修正コミット・人間承認マージを組み合わせた、クォータ制約ゼロの堅牢な新開発ワークフローを確立します。

---

## 2. 背景と課題の棚卸し

### 現状（GitHub Actions 方式）で浮き彫りになった 5 つの課題
1. **モデル性能の妥協**:
   - Google AI Pro プランでは `gemini-3.8-flash` や Pro モデルの RPD（日次リクエスト枠）が 20〜50 回/日と厳しく、CI 自動レビューで即座に枯渇するリスクがあったため、軽量な `gemini-3.5-flash-lite` に妥協せざるを得なかった。
2. **外部 API の不安定性**:
   - Google 側の一時的な過負荷（503 UNAVAILABLE スパイク）やクォータ枯渇により、CI パイプラインが赤くブロックされるリスクが常に存在していた。
3. **実行待ち時間（待機ラグ）**:
   - GitHub Actions のコンテナ起動＋実行により、PR 発行ごとに毎回 1〜2 分の不要な待機時間が発生していた。
4. **レビュー即マージ問題（レビュー指摘の形骸化）**:
   - PR 起票直後にエージェントが自動でマージを行ってしまい、せっかく出力された指摘（`[should]`, `[imo]` 等）を反映・修正するプロセスがスキップされていた。
5. **クラウド上での自動修正の破綻リスク**:
   - クラウド（Actions）上で自動修正まで完結させようとすると、クォータ消費が倍増し、型エラー等の自己修復が困難で壊れたコミットが作られる危険があった。

### Antigravity IDE 側の圧倒的優位性
- Antigravity IDE では、**最上位モデル（Gemini 3.8 Flash）が個人 API キーの RPD 上限なしで使い放題**。
- プロジェクト全ファイル、型定義、ADR、Git 履歴、およびテスト実行エンジンをフル活用でき、レビューの洞察力・修正の自己修復力が段違いに高い。
- 結果は `gh pr comment` で GitHub PR に公式記録できるため、「GitHub に保守ログを残す」という目的も 100% 達成できる。

---

## 3. 要件定義 & 受け入れ基準 (Acceptance Criteria)

### ① GitHub Actions レビューワークフローの完全廃止（負債根絶）
- `.github/workflows/ai-pr-reviewer.yml` を削除。
- レビューの二重実行、API キー・RPD クォータの浪費、および保守負債を 100% 根絶する。
- 既存の CI パイプライン（`.github/workflows/ci.yml`）は、純粋な品質ゲート（シークレット検査、ドキュメント検査、型検査、テスト、ビルド）のみとしてシンプルに保つ。

### ② Antigravity Fleet（独立サブエージェント）による客観的第三者レビューの確立
- メインの実装エージェントとは**思考コンテキストを完全に切り離した Fleet（独立サブエージェント）**を起動。
- 実装者バイアスを排除し、`git diff` および `AGENTS.md` 規約のみをインプットとして最上位モデル（Gemini 3.8 Flash）で多角的レビューを実施。
- 以下のレビュー規約を厳守：
  - 各指摘の先頭に重要度プレフィックス（`[must]`, `[should]`, `[imo]`, `[nits]`, `[ask]`）を必ず付与。
  - コメント最上部に「💡 レビュー接頭辞ガイド（凡例）」を自動挿入。
  - 総合判定として **`[LGTM]`** または **`[要修正]`**（`[must]` がある場合）を明記。

### ③ GitHub PR への公式コメント記録（永続アーカイブ）
- Fleet はレビュー完了後、`gh pr comment <PR番号> --body "..."` を実行し、**GitHub PR の Web UI スレッドに公式コメントとして投稿・永続アーカイブ**する。

### ④ レビュー指摘に基づく手元修正＆テスト（Antigravity IDE）
- レビュー結果を受け取り、`[must]` や `[should]` の指摘がある場合、メインエージェントが Antigravity IDE 上でコードを修正。
- `npm.cmd run check`（全品質ゲート 100% PASS）を確認した上で、PR ブランチに追加コミット＆プッシュする。

### ⑤ 勝手なマージの厳禁（人間承認プロセスの確立）
- **PR 起票後は自動マージを厳禁とし、PR は OPEN 状態を維持する**。
- レビュー指摘の解消と総合判定 `[LGTM]` を確認した上で、**人間（ユーザー）の明示的な指示または承認を得てからのみマージを実行する**。

### ⑥ ガバナンス・ドキュメント更新
- `docs/adr/0013-antigravity-fleet-pr-review-workflow.md` を作成し、ADR-0012 の Superseded（置き換え）理由を記録。
- `docs/adr/README.md` の一覧を更新。
- `AGENTS.md` の開発フロー（第2章）および安全規約（第5章）に本ワークフローを明記。

---

## 4. 影響範囲
- `.github/workflows/ai-pr-reviewer.yml` (削除)
- `scripts/aiPrReviewer.js` (ローカル/Fleet 用レビューツールとして再編、またはスクリプト整理)
- `AGENTS.md` (開発フロー・レビュー承認規約の改定)
- `docs/adr/0013-antigravity-fleet-pr-review-workflow.md` (新規)
- `docs/adr/README.md` (更新)
- `docs/issues/ISSUE-038_antigravity_fleet_pr_review_workflow.md` (新規)
