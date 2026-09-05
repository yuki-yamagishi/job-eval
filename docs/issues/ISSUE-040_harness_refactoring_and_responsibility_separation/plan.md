# Implementation Plan: 開発ハーネスの抜本的リファクタリング＆責務分割刷新 (Issue #40)

## 1. 概要
自律型AIエージェントによる開発ライフサイクルを健全化するため、開発ハーネス全体のモジュール分割と最適化を行う。

## 2. 実装手順
1. **ドキュメント検査スクリプトの責務分割 (`scripts/checkers/`)**:
   - `scripts/checkers/adrChecker.js`: ADR 整合性検証
   - `scripts/checkers/agentSkillChecker.js`: AGENTS.md / SKILL.md 同期検証
   - `scripts/checkers/issueDocChecker.js`: docs/issues/ 完結型ドキュメント検証
   - `scripts/docCheck.js`: オーケストレーター化
2. **サブエージェント専用定義の配備 (`.agents/subagents/fleet-reviewer/`)**:
   - `subagent.json`: 最小権限設定
   - `SYSTEM_PROMPT.md`: Cwd固定、単発テスト義務化、接頭辞ルール
3. **Git Hook の不具合修正 (`.githooks/pre-push`)**:
   - stdin 空読み処理追加
4. **ADR-0014 策定 ＆ ドキュメント同期**:
   - `docs/adr/0014-harness-refactoring-and-responsibility-separation.md` 作成
   - `docs/adr/README.md` 更新
   - `.agents/skills/job-eval-harness/SKILL.md` 最新化
   - `AGENTS.md` 同期更新
5. **品質ゲート全パス検証**:
   - `npm.cmd run check` 100% PASS 確認

## 3. 検証手順
- `npm.cmd run doc-check`
- `npm.cmd run test:run`
- `npm.cmd run check`
