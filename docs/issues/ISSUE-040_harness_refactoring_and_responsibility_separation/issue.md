# ISSUE-040: 開発ハーネス（Agent / Skill / Hook / Docs / Checkers）の抜本的リファクタリング＆責務分割刷新

- **ステータス**: 🔵 着手可能 (`status: ready`)
- **優先度**: 最高 (Critical / Harness Architecture Refactoring)
- **カテゴリ**: `type: harness`, 開発基盤, ガバナンス, CI/CD, 自動化
- **対象プラットフォーム**: Antigravity IDE / Node.js / Git

---

## 1. 概要 (Overview)

自律型AIエージェントによる開発ライフサイクル（Issue作成 〜 事前検証 〜 実装 〜 テスト 〜 コミット 〜 プッシュ 〜 PR 〜 Fleetレビュー 〜 指摘対応 〜 人間承認マージ）において浮き彫りになった **ボトルネック・設計の歪み・ツールの過剰権限・ドキュメント肥大化** を解消するため、開発ハーネス全体の抜本的リファクタリングと責務分割を実施します。

---

## 2. 背景と課題の棚卸し (Problems)

1. **ドキュメント検査スクリプトの神スクリプト化（Fat Script）**:
   - `scripts/docCheck.js` に ADR チェック、ファイル存在チェック、キーワードチェックが密集しており、機能拡張（Agent/Skill同期検証等）が困難。
2. **Skill と AGENTS.md の同期乖離（死角問題）**:
   - `.agents/skills/job-eval-harness/SKILL.md` が古い記述のまま放置されており、`docCheck.js` でも監視されていなかった。
3. **ドキュメントの累積肥大化（1,000行・50KB問題）**:
   - `docs/pre_phase_verification.md`、`docs/implementation_plan.md`、`docs/walkthrough.md` の3大ファイルに全フェーズが追記され続け、毎回の読み込み・置換で膨大なトークンと時間を浪費している。
4. **サブエージェントの目的と手段のアンマッチ（過剰権限・迷子・ウォッチ誤爆）**:
   - レビュー用サブエージェントを `TypeName: "self"`（全権限複製）で起動していたため、Cwd の迷子や対話型ウォッチモード（`npm test`）の誤起動によるハングアップが発生した。
5. **Git Hook の Windows stdin 構文エラー**:
   - `.githooks/pre-push` が標準入力を適切に処理せず、`'refs' is not recognized...` とエラーを吐いていた。

---

## 3. 要件定義 & アーキテクチャ刷新 (Requirements)

### ① ドキュメント検査エンジンの責務分割 (`scripts/checkers/`)
- `scripts/docCheck.js` を薄いオーケストレーターに改修。
- `scripts/checkers/` ディレクトリを新設し、各検証責務を独立モジュール化：
  - `adrChecker.js`: ADR 採番・README テーブル登録整合性チェック。
  - `agentSkillChecker.js`: `AGENTS.md` と `SKILL.md` の存在・規約同期チェック。
  - `issueDocChecker.js`: Issue 単位フォルダ内の必須ドキュメント整合性チェック。

### ② ドキュメント管理の Issue フォルダ完結型への刷新
- 過去のフェーズ（Phase 1〜33）を `docs/archive/` に安全に退避・保全。
- 新規の設計ドキュメントは `docs/issues/ISSUE-XXX_<slug>/` 配下に配置するフォルダ完結型に移行：
  - `issue.md`: 要件定義・受入基準
  - `pre_verification.md`: 4軸事前検証ログ
  - `plan.md`: 実装計画書
  - `walkthrough.md`: 実装成果レポート

### ③ サブエージェント専用定義の配備 (`.agents/subagents/fleet-reviewer/`)
- レビュアー専用の最小権限設定を Git バージョン管理下に配備：
  - `.agents/subagents/fleet-reviewer/subagent.json`:
    - `enable_write_tools: false`（ファイル書き込み禁止）
    - `enable_subagent_tools: false`（子エージェント再帰起動禁止）
  - `.agents/subagents/fleet-reviewer/SYSTEM_PROMPT.md`:
    - Cwd 絶対固定（`C:\Users\yukiy\.gemini\antigravity-ide\scratch\job-eval`）
    - ウォッチモード（`npm test`）実行厳禁、単発実行（`npm.cmd run test:run`）義務化
    - レビュー接頭辞（`[must]`, `[should]`, `[imo]`, `[nits]`, `[ask]`）義務化

### ④ Git Hook の不具合修正 ＆ 高速化
- `.githooks/pre-push` 内で stdin を `while read ...` で安全に空読み破棄し、Windows 構文エラーを根絶。
- テスト重複実行を整理。

### ⑤ Skill と AGENTS.md の完全同期 ＆ ADR-0014 策定
- `.agents/skills/job-eval-harness/SKILL.md` を最新化。
- `docs/adr/0014-harness-refactoring-and-responsibility-separation.md` を作成し決定事項を記録。

---

## 4. 受け入れ基準 (Acceptance Criteria)

- [ ] `scripts/checkers/` 配下に `adrChecker.js`, `agentSkillChecker.js`, `issueDocChecker.js` が実装され、`scripts/docCheck.js` から一括実行できること。
- [ ] `docs/issues/ISSUE-040_.../` に仕様・検証・計画・成果がフォルダ完結で配置され、検査をパスすること。
- [ ] `.agents/subagents/fleet-reviewer/` に `subagent.json` および `SYSTEM_PROMPT.md` が配備されていること。
- [ ] `.githooks/pre-push` の stdin 構文エラーが解消され、クリーンにプッシュできること。
- [ ] `npm.cmd run check` が 100% PASS すること。
- [ ] ADR-0014 が採択され、`docs/adr/README.md` に登録されていること。
