# ADR-0014: 開発ハーネス（Agent / Skill / Hook / Docs / Checkers）の抜本的リファクタリング＆責務分割刷新

- **ステータス**: Accepted
- **決定日**: 2026-09-05
- **関連Issue**: Issue #40

---

## 1. コンテキスト (Context)

自律型 AI エージェントによる高速な機能開発と PR レビューサイクルを運用する中で、以下の課題・構造的歪みが顕在化しました：

1. **ドキュメント検査スクリプトの神スクリプト化 (Fat Script)**:
   - `scripts/docCheck.js` 内に ADR 検証、ルートドキュメント検証、キーワードチェックが混在し、検査の拡張や保守が困難。
2. **Skill と AGENTS.md の同期乖離**:
   - リポジトリのルール（`AGENTS.md`）とエージェントスキル（`.agents/skills/job-eval-harness/SKILL.md`）の間で、Fleet レビュー等の新運用ルールの記述に差分が発生。
3. **ドキュメントの累積肥大化（1,000行・50KB問題）**:
   - `docs/pre_phase_verification.md`, `docs/implementation_plan.md`, `docs/walkthrough.md` に全過去フェーズ（Phase 4〜33）が追記され続け、毎回の読み込み・置換で大量のトークンと実行時間を浪費。
4. **サブエージェントの目的と権限のアンマッチ**:
   - レビュー用サブエージェントを `TypeName: "self"`（全権限継承）で起動したため、作業ディレクトリの迷子や対話型ウォッチモード（`npm test`）の誤起動によるハングアップが発生。
5. **Git Hook の Windows stdin 構文エラー**:
   - `.githooks/pre-push` が標準入力を安全に消費しなかったため、Windows 環境で構文エラーが発生。

---

## 2. 決定事項 (Decisions)

### ① ドキュメント検査スクリプトの責務分割 (`scripts/checkers/`)
- `scripts/docCheck.js` を薄いオーケストレーターとし、検証責務ごとに独立したモジュールへ分離：
  - `adrChecker.js`: ADR ファイルと `docs/adr/README.md` テーブル登録の整合性検証
  - `agentSkillChecker.js`: `AGENTS.md` と `SKILL.md` の存在・規約同期検証
  - `issueDocChecker.js`: `docs/issues/` 配下の Issue フォルダ内ドキュメント完結性検証

### ② ドキュメント管理の Issue フォルダ完結型への刷新
- 過去のフェーズ（Phase 4〜33）を `docs/issues/`（各Issueフォルダ）および `docs/archive/phases/`（単独Phase）に完全に細分化して切り分け・保全。
- 新規の設計ドキュメントは `docs/issues/ISSUE-XXX_<slug>/` 配下に配置するフォルダ完結型（`issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md`）へ移行。
- ルートの `docs/` 配下の3ファイルは現在進行中の最新 Issue へのポインタ兼軽量ファイルとし、肥大化を根絶。

### ③ サブエージェント最小権限定義の配備 (`.agents/subagents/fleet-reviewer/`)
- `subagent.json` により、ファイル書き込み（`enable_write_tools: false`）および子エージェント起動（`enable_subagent_tools: false`）を禁止。
- `SYSTEM_PROMPT.md` により、カレントディレクトリ固定、ウォッチモード厳禁（単発実行義務化）、Conventional Comments 接頭辞ルールを強制。

### ④ Git Hook の Windows stdin 安全化
- `.githooks/pre-push` で stdin から渡される ref 情報を `while read ...` で安全に消費・空読み破棄し、Windows 環境での構文エラーを防止。

---

## 3. 結果・影響 (Consequences)

- **ポジティブ**:
  - ドキュメント読み込み時のトークン消費と待ち時間が劇的に削減。
  - Issue ごとに仕様・事前検証・計画・成果が1箇所にまとまり、可読性と追跡性が向上。
  - レビュー用サブエージェントがファイル破壊やハングを起こすリスクがゼロに。
  - Git push 時の謎の構文エラーが解消。
- **留意点**:
  - 新規 Issue に着手する際は、必ず `docs/issues/ISSUE-XXX_<slug>/` フォルダを作成して運用する必要がある（`scripts/docCheck.js` で自動検証）。
