# Issue #66: Antigravity Customization Layer への刷新（God Skill解体・フック配置純化・公式Subagent仕様・CI待機統合）

## 1. 開発の背景と課題 (Problem Statement)
現在の AI 開発ハーネス（Agent / Skills / Hooks / Rules / Subagents）について、Google Antigravity 公式仕様（https://antigravity.google/docs/ および agy-customizations）との突き合わせ検証を実施した結果、以下の構造的課題が特定された：

1. **スクリプト配置の混在**:
   - `scripts/harness/` がプロジェクトルート直下に配置されており、プロダクトコードやビルドスクリプトと混在している。
2. **スキルの巨大モノリス化 (God Skill)**:
   - `.agents/skills/job-eval-harness/SKILL.md`（185行・約13KB）が、Issue運用・実装手順・コマンド集・安全規約・レビューパース等を一手に抱え込んでおり、Antigravity の核心思想である「Progressive Disclosure（段階的開示）」に反してトークンを過剰消費している。
3. **Subagent 仕様の乖離**:
   - `.agents/subagents/fleet-reviewer/` が非公式の独自構造（`subagent.json` + `SYSTEM_PROMPT.md`）になっており、IDE/CLI 上の `Available subagents` に自動認識されていない。
4. **Hooks 実行パスの複雑性**:
   - `.agents/hooks.json` のコマンドが `if exist ../scripts/... else ...` という CWD 依存のワンライナーになっており脆弱。
5. **リモート CI 失敗の見落としリスク**:
   - 手順書（Runbook）にリモート CI（GitHub Actions）の待機・監視工程が存在せず、過去に 2 回 CI 失敗を見落としたまま進行した。
6. **PR マージ方針との整合**:
   - 「PR マージは人間が実施する」という確定方針に合わせ、エージェント手順を人間へのマージ依頼・待機へ整流化する。

---

## 2. 目的と改修方針 (Objectives & Architecture)
Google Antigravity の公式アーキテクチャに準拠し、本プロジェクトのガバナンス機構を **「Customization Layer（カスタマイズ層）」** として純化・リファクタリングする。

1. **ルート直下 `scripts/harness/` の完全撤廃**:
   - エージェント専用ツールを `.agents/` 配下に完全カプセル化。
2. **スキルの単一責務 3 分割 (Progressive Disclosure)**:
   - `skills/issue-lifecycle/`: Issue 管理・ラベル運用（DoR）
   - `skills/dev-lifecycle/`: 実装・TDD反復・品質ゲート
   - `skills/review-self-healing/`: PR作成・**リモートCI待機**・Fleetレビュー・自己修復・**人間マージ依頼**
3. **公式 Subagent 仕様への完全アラインメント**:
   - `.agents/agents/fleet_reviewer.md`（YAML frontmatter 形式）へ移行し、ネイティブ自動ロードを実現。
4. **Hooks のパス純化とデッドロック根絶**:
   - `hooks.json` を `node ./hooks/<name>.js` の直下参照に刷新。
   - `stopHook.js` において公式の `payload.fullyIdle === false` を検知して安全に待機（Stop）を許可。
5. **ドキュメント整合性チェッカー（`scripts/docCheck.js`）の更新**:
   - 新しいディレクトリ構造・スキル構成を検証対象に含める。

---

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] `scripts/harness/` が撤廃され、ルート直下 `scripts/` にハーネス専用ファイルが残存しないこと。
- [ ] `.agents/skills/` 配下が 3 つの単一責務スキルに分割され、各スキルが Progressive Disclosure に準拠していること。
- [ ] `.agents/agents/fleet_reviewer.md` が配備され、公式サブエージェント仕様に準拠していること。
- [ ] `.agents/hooks.json` のコマンドがシンプル化され、単体テスト・動作確認を通過すること。
- [ ] `npm.cmd run check` が 100% PASS すること。
