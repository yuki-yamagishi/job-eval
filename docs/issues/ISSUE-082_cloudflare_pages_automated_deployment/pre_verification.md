# Issue #82: 事前検証記録 (Pre-Verification)

## 1. 検証日時
2026-09-11

## 2. 現状の課題分析 (Problem Analysis)
- **現状のコード・アーキテクチャの振る舞い**:
  - 現在のリポジトリには `.github/workflows/ci.yml` が存在し、`push` および `pull_request` 時に `npm ci` と `npm run check`（シークレットスキャン、ドキュメント検査、型検査、Vitest 全単体テスト、Vite 本番ビルド）を実行している。
  - しかし、CI ワークフロー内には Cloudflare Pages へのデプロイステップが存在せず、また Cloudflare Pages 側も GitHub リポジトリ連携ではなく Direct Upload 方式（`Git Provider: No`）で運用されている。
  - そのため、PR が `main` ブランチにマージされた後も本番環境（`https://job-eval.pages.dev`）への自動デプロイが一切トリガーされず、ローカル端末から手動で `npx wrangler pages deploy dist --project-name job-eval` を実行しない限り最新コードが本番反映されない状態であった（事実として直近 6 日間デプロイが停止していた）。
- **根本原因 (Root Cause)**:
  - CI パイプライン（Outer Loop）において、「検査・ビルド」のフェーズで完了しており、「検証済み成果物の本番配信（Continuous Deployment）」の仕組みが最初から欠落していたこと。

## 3. 重複・パッチワーク点検 (Impact & Duplication Check)
- **既存基盤・ユーティリティ・ASTの横断調査**:
  - `wrangler.jsonc`:
    - 既にプロジェクトルートに存在し、`pages_build_output_dir: "dist"`、`compatibility_date: "2026-09-01"`、および D1 データベースバインディング（`job-eval-db`）が完全定義されている。
  - `functions/api/sync.ts`:
    - Cloudflare Pages Functions のバックエンド同期 API 実装が存在する。
  - `.github/workflows/ci.yml`:
    - 既存のワンショット品質ゲート `npm run check` が定義されている。
  - 既存 ADR 群:
    - ADR-0018（Cloudflare D1 E2EE Cloud Sync）で D1 と Pages Functions のアーキテクチャが規定されている。今回の自動デプロイ追加はこれと完全に整合する。
- **車輪の再発明・パッチワークの防止方針**:
  - 別途孤立した `deploy.yml` を乱立させて `ci.yml` と二重ビルド・二重テストを行うパッチワークを避け、`.github/workflows/ci.yml` に `deploy` ジョブを直列後続（`needs: test-and-build`）として統合する。
  - `test-and-build` で既に生成された `dist` ディレクトリを GitHub Actions の Artifact（`actions/upload-artifact@v4` / `actions/download-artifact@v4`）経由で `deploy` ジョブに引き渡すことで、**「テスト・検証された成果物と寸分違わぬ同一バイナリ」を本番配信する**。ビルドの二重実行による環境差分や無駄な実行時間を根絶する。
  - `wrangler.jsonc` の設定をそのまま `wrangler pages deploy` に読み込ませることで、既存の Functions / D1 バインディング定義を一切破壊せずにそのまま適用する。

## 4. 改修方針 (Implementation Strategy)
1. **`.github/workflows/ci.yml` の拡張**:
   - `test-and-build` ジョブの末尾で `dist/` ディレクトリをアーティファクトとしてアップロード。
   - 後続に `deploy` ジョブを追加：
     - `needs: test-and-build`
     - `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`
     - `environment: production`
     - `cloudflare/wrangler-action@v3`（または `npm install -D wrangler` + `npx wrangler pages deploy dist --project-name=job-eval --branch=main`）を実行。
2. **ADR-0026 の策定**:
   - `docs/adr/0026-cloudflare-pages-automated-deployment.md` を作成し、Public リポジトリにおける安全な自動デプロイアーキテクチャ（最小権限トークン、Environment 分離、Outer Loop 直列結合）を記録。
3. **運用ドキュメントの整備**:
   - GitHub リポジトリの `Settings -> Environments -> production` に `CLOUDFLARE_API_TOKEN` および `CLOUDFLARE_ACCOUNT_ID` を登録する手順書を明文化。
