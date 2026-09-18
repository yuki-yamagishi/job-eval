# Issue #89: 事前検証記録 (Pre-Verification)

## 1. 検証日時
2026-09-18

## 2. 現状の課題分析 (Problem Analysis)
- **現状のコード・アーキテクチャの振る舞い**:
  - `docs/adr/0024-external-plugin-submodule.md` に基づき、`.agents/plugins/antigravity-review-loop` は Git Submodule として管理されている。
  - 現在の `.gitmodules` 定義：
    ```gitmodules
    [submodule ".agents/plugins/antigravity-review-loop"]
    	path = .agents/plugins/antigravity-review-loop
    	url = https://github.com/yuki-yamagishi/antigravity-review-loop.git
    ```
  - CI（`.github/workflows/ci.yml`）では `submodules: true` を指定してクローンしており、チェックアウト自体は行われる。
  - しかし、プラグイン（外部リポジトリ）が更新されたことを検知して JobEval 本体のサブモジュールポインタを自動更新するワークフローは存在しない。
- **根本原因 (Root Cause)**:
  - 親リポジトリ（JobEval）側に外部リポジトリの更新通知を受け取るエンドポイント（`repository_dispatch`）や定期ポーリング（`schedule` cron）が未定義であったため、手動作業に依存していた。

## 3. 重複・パッチワーク点検 (Impact & Duplication Check)
- **既存基盤・ユーティリティ・ASTの横断調査**:
  - 既存の GitHub Actions ワークフロー:
    - `.github/workflows/ci.yml`: メイン CI（push/PR 時に `npm run check` ＋ Cloudflare Pages デプロイ）。
    - `.github/workflows/release.yml`: Tauri デスクトップアプリのタグリリース。
  - 今回の機能は既存の CI や Release と責務が直交しており、独立した保守性の高いワークフロー `.github/workflows/sync-submodule.yml` として追加するのが最もクリーンである。
  - 既存のスクリプト検査機構:
    - `scripts/checkers/agentSkillChecker.js`: サブモジュール内の `plugin.json` や `skills/`, `agents/` の整合性を検証している。
    - `scripts/docCheck.js` / `scripts/securityCheck.js`: ドキュメントとシークレットの安全性を検証している。
  - これらの既存チェッカーを再利用し、サブモジュール更新時に `npm run check` をそのまま実行することで、車輪の再発明を完全に回避し、統一された品質ゲートを適用できる。
- **車輪の再発明・パッチワークの防止方針**:
  - アドホックなシェルスクリプトや専用の独自チェッカーを新規作成するのではなく、標準の `git submodule update --remote --merge` および既存の統一品質ゲート `npm run check` を活用する。
  - PR 作成には GitHub CLI（`gh`）または実績ある公式アクションを活用し、シンプルで壊れにくい構成とする。

## 4. 改修方針 (Implementation Strategy)
1. **GitHub Actions ワークフローの構築**:
   - `.github/workflows/sync-submodule.yml` を作成。
   - トリガー: `repository_dispatch` (types: `submodule-update`, `antigravity-review-loop-updated`), `schedule` (cron: `0 0 * * *`), `workflow_dispatch`。
   - ステップ:
     1. リポジトリチェックアウト（`actions/checkout@v7`）
     2. Node.js 24 セットアップ（`actions/setup-node@v7`）
     3. サブモジュールの更新（`git submodule update --init --remote --merge .agents/plugins/antigravity-review-loop`）
     4. 差分判定（`git status --porcelain .agents/plugins/antigravity-review-loop`）
     5. 差分がある場合、`npm ci` と `npm run check` を実行。
     6. 自動 PR 作成（既存 PR があれば更新、なければ新規作成）。
2. **ローカルサブモジュールの最新コミット（`65aa8b9`）への更新**:
   - `git submodule update --remote --merge` を実行し、親リポジトリでコミット。
3. **ADR-0029 の策定**:
   - サブモジュール自動同期ワークフローの設計決定を記録。
4. **仕様書および Issue ドキュメントの完備**:
   - `plan.md`, `walkthrough.md` を作成し、4軸ドキュメントを整合。
