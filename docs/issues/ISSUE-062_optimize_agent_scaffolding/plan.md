# 実装計画書: Issue #62 AI駆動開発のための補助資源最適化

## 1. 目的
Token Tax の劇的解消、TDD/中間コミットの円滑化、ワークスペース衛生の確保、仕様 SSOT の一元化を実施し、AIエージェントの推論性能と自律開発速度を最大化する。

## 2. 変更対象ファイル一覧
1. `AGENTS.md` - 憲章・DoD・アーキテクチャ原則への純化と軽量化（2〜3KB目標）
2. `.agents/skills/job-eval-harness/SKILL.md` - 実践 Runbook・詳細コマンドリファレンス・安全規約の充実
3. `scripts/checkers/issueDocChecker.js` - 段階的ドキュメント検証（コミット時 vs フル検査時）
4. `scripts/docCheck.js` - `--pre-commit` 引数のサポート
5. `.githooks/pre-commit` - `--pre-commit` オプションの伝播
6. `.gitignore` - 一時ファイル・差分ログの除外パターン追加
7. ルート一時ファイル削除 (`.pr_body_18.md`, `pr_review_54.md`, `diff.txt`, `diff_utf8.txt`)
8. `requirement.md` -> `docs/archive/legacy_requirement.md` へのアーカイブ
9. `docs/architecture_overview.md` - 最新仕様 SSOT ドキュメントの新設
10. `src/core/markdown/markdownGenerator.ts` - 参照コメントの更新
11. `docs/adr/0017-optimize-agent-scaffolding-and-gradual-verification.md` - ADR起票
12. `docs/adr/README.md` - ADR一覧更新
13. `docs/issues/ISSUE-062_optimize_agent_scaffolding/` 配下の完結ドキュメント
14. ルートポインタ (`docs/implementation_plan.md`, `docs/pre_phase_verification.md`, `docs/walkthrough.md`)

## 3. 実装手順
- Step 1: ルート一時ファイルの削除と `.gitignore` の強化
- Step 2: `requirement.md` のアーカイブ移動と `docs/architecture_overview.md` の新設、参照更新
- Step 3: ADR-0017 の作成と `docs/adr/README.md` への登録
- Step 4: `scripts/checkers/issueDocChecker.js`, `scripts/docCheck.js`, `.githooks/pre-commit` の改修
- Step 5: `AGENTS.md` のスリム化と `SKILL.md` の更新
- Step 6: 動作検証（`--pre-commit` モード、フルモード、`npm run check`）
- Step 7: `walkthrough.md` の作成とルートポインタの更新
