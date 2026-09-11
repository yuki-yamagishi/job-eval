# Issue #78: 事前検証記録 (Pre-Verification)

## 1. 検証日時
2026-09-11

## 2. 現状の課題分析 (Problem Analysis)
- **現状のコード・アーキテクチャの振る舞い**:
  - `antigravity-review-loop` の全資産（Hooks, Skills, Rules, Agents, State Machine）は、現在 JobEval のリポジトリツリー `.agents/plugins/antigravity-review-loop/` に直接組み込まれている。
  - プラグインのバージョン管理や修正が JobEval リポジトリのコミットと不可分になっており、他リポジトリへのポータビリティが阻害されていた。
- **根本原因 (Root Cause)**:
  - 開発初期は迅速なプロトタイピングと改善のために JobEval 内部に直置きしていたが、プラグインとして成熟・安定した現在、独立リポジトリ（`yuki-yamagishi/antigravity-review-loop`）として分離・公開されたため、JobEval 側も Submodule 参照へと疎結合化する必要がある。

## 3. 重複・パッチワーク点検 (Impact & Duplication Check)
- **既存基盤・ユーティリティ・ASTの横断調査**:
  - `scripts/checkers/agentSkillChecker.js`: `.agents/plugins/antigravity-review-loop/plugin.json` やスキル・エージェントの存在を検査している。Submodule 化後も同じパス（`.agents/plugins/antigravity-review-loop`）に展開されるため、チェッカーのコード変更は不要。
  - `tests/harness/`: `../../.agents/plugins/antigravity-review-loop/` を参照している。Submodule 化後も同一のファイル構造が維持されるため、パスの変更なくそのまま動作可能。
  - ADR-0022（プラグインパッケージング）との整合性: ADR-0022 で定めたディレクトリ構造（`plugin.json`, `hooks/`, `skills/`, `agents/`, `state/`）を 100% 維持したままリポジトリのみを外部化したため、アーキテクチャ原則と完全に合致。
- **車輪の再発明・パッチワークの防止方針**:
  - 独自スクリプトによる ad-hoc なクローン同期や手動コピーではなく、Git 標準機能である `git submodule` を採用。
  - バージョン固定は Git のツリーオブジェクト（コミットポインタ）に委ね、CI では `actions/checkout@v4` の標準パラメータ `submodules: true` を用いることで、つぎはぎコードの一切ない最も堅牢かつ標準的な構成とする。

## 4. 改修方針 (Implementation Strategy)
1. 既存の `.agents/plugins/antigravity-review-loop` の追跡を解除・退避。
2. `git submodule add https://github.com/yuki-yamagishi/antigravity-review-loop.git .agents/plugins/antigravity-review-loop` を実行して `.gitmodules` を構成。
3. `.github/workflows/ci.yml` の `actions/checkout@v4` に `submodules: true` を追加。
4. `docs/adr/0024-external-plugin-submodule.md` を作成し、`docs/architecture_overview.md` を更新・同期。
5. `plan.md`, `walkthrough.md` を作成し、`npm.cmd run check` で全検査が PASS することを確認。
