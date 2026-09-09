# Issue #62: AI駆動開発のための補助資源最適化（トークン圧迫解消・過剰制約緩和・ワークスペース衛生・仕様SSOT一元化）

## 1. 概要
本プロジェクトは、ADR-0016 によるループエンジニアリングハーネスの配備および Issue #60 の信頼性向上を経て、決定論的かつ安全な自律自己修復ループを確立しました。
しかし、「AI駆動開発（Autonomous AI-Driven Development）」を真の目的として補助資源（Agent Scaffolding）を再レビューした結果、以下の構造的な課題・摩擦が確認されました：
1. `AGENTS.md` (17KB) が毎ターン常時注入されることによるコンテキストウィンドウ圧迫（Token Tax）
2. `issueDocChecker.js` による過剰な制約（実装途中でも walkthrough.md を要求し、こまめなコミットを阻害）
3. ルートディレクトリへの一時ファイル（`.pr_body_*.md`, `diff*.txt` 等）残留によるワークスペース汚染
4. ルートの `requirement.md` の陳腐化による仕様 SSOT の曖昧さ

本 Issue ではこれらを一括解決し、AIエージェントの推論リソースを最大限に引き出す理想的な AI 駆動開発環境へ最適化します。

## 2. 要件定義

### (1) トークン圧迫の解消: `AGENTS.md` の憲章化 & `SKILL.md` への実践手順集約
- `AGENTS.md` から長文の実践手順・コマンド一覧テーブルを切り離し、`.agents/skills/job-eval-harness/SKILL.md` に集約。
- `AGENTS.md` は「エージェント憲章・DoD・絶対遵守事項・アーキテクチャ原則」に純化し、軽量化（2〜3KB目標）してコンテキスト消費を半減させる。

### (2) 過剰制約の緩和: `issueDocChecker.js` の段階的ドキュメント検査
- コミット時（`pre-commit`）は `issue.md` と `plan.md` のみを必須とする。
- 実装成果レポート（`walkthrough.md`）は PR 作成前のフル検査（`npm run check` / `pre-push`）で初めて必須化し、TDD や中間ステップコミットを容易にする。

### (3) ワークスペース衛生管理: 一時ファイル一掃 & `.gitignore` 強化
- ルート直下のゴミファイル（`.pr_body_18.md`, `pr_review_54.md`, `diff.txt`, `diff_utf8.txt`）を削除。
- `.gitignore` に一時ファイル・差分ログパターンを追加し、再発を物理的に防止。

### (4) 仕様 SSOT の一元化: `requirement.md` アーカイブ & `docs/architecture_overview.md` 新設
- 陳腐化した `requirement.md` を `docs/archive/legacy_requirement.md` へアーカイブ。
- 最新アーキテクチャ（ADR-0001〜0016）を俯瞰する `docs/architecture_overview.md` を整備し、エージェントの知識源を一本化。

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] `AGENTS.md` が軽量化され、毎ターンのトークン消費が大幅に削減されること。
- [ ] `agentSkillChecker.js` および `docCheck.js` の整合性検査に 100% 合格すること。
- [ ] `issueDocChecker.js` により、実装途中（walkthrough.md 未作成）でも中間コミットが可能になること。
- [ ] ルート直下のゴミファイルが整理され、`.gitignore` で保護されること。
- [ ] `requirement.md` がアーカイブされ、SSOT が `docs/` に一元化されること。
- [ ] `npm.cmd run check` が全件合格すること。
