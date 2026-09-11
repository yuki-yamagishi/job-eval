# Issue #82: GitHub Actions による Cloudflare Pages への安全な自動デプロイパイプライン構築

## 1. 解決すべき課題・背景 (Problem Statement / Why)
- **現在の問題点**:
  - 現在、Cloudflare Pages のデプロイは GitHub リポジトリ自動連携ではなく Direct Upload 方式で手動実行されている。
  - PR マージ（`main` ブランチ更新）時にデプロイが自動トリガーされないため、最新機能やバグ修正が本番環境（`https://job-eval.pages.dev`）に即座に反映されず、デプロイ漏れ・リリース遅延が発生していた（直近でも 6 日間デプロイが停止していた）。
- **放置した場合のリスク**:
  - マージ済みコードと本番稼働コードの乖離（コンテキストドリフト）。
  - 手動デプロイ作業による人為的ミス、またはデプロイ忘れによるユーザー体験の毀損。
- **なぜ今解く必要があるのか**:
  - Issue #80 のマージ後に本番未反映が発覚し、リリースサイクルを自律的かつ確実に回すための Outer Loop 物理パイプライン（Mechanisms）の整備が急務であるため。

## 2. 期待される成果と価値 (Desired Outcome / Value)
- `main` ブランチへの push（PR マージ）を契機に、GitHub Actions で自動的に Outer Loop 品質ゲート（`npm run check`）が実行され、100% 合格した場合のみ Cloudflare Pages（Functions + 静的アセット）へ自動デプロイされること。
- Public リポジトリのセキュリティ原則（最小権限トークン、Environment 保護、Fork PR からのシークレット隔離）を徹底し、安全・堅牢な CI/CD が確立されること。

## 3. 排除するリスク (Risks to Eliminate)
- **Fork PR によるシークレット漏洩リスクの排除**: `on: pull_request` ではデプロイジョブおよびシークレットへのアクセスを一切行わず、`main` ブランチへの直接 push のみに限定する。
- **壊れたコードの本番デプロイリスクの排除**: `npm run check`（シークレットスキャン、ドキュメント検査、型検査、Vitest全テスト、本番ビルド）が 1 つでも失敗した場合はデプロイ処理を実行させない（`needs: test-and-build` による直列ブロック）。
- **過剰権限トークンによるインフラ改ざんリスクの排除**: Cloudflare API Token は「Pages:Edit」最小権限で運用する設定を明文化する。
- **デプロイ成果物とテスト成果物の不整合リスクの排除**: 品質ゲートでビルド・検証された同一の `dist` ディレクトリおよび `functions/` をデプロイに使用する。

## 4. スコープの定義 (Scope & Boundaries)
- **スコープ内 (In-Scope)**:
  - `.github/workflows/ci.yml` へのデプロイジョブ追加（直列依存 `needs: test-and-build`）。
  - GitHub Environments（`production`）および必要な Secrets 連携の仕様策定。
  - `wrangler.jsonc` と `functions/api/sync.ts` を含む完全なデプロイパイプラインの動作保証。
  - ADR（設計決定記録: `docs/adr/0026-cloudflare-pages-automated-deployment.md`）の作成。
  - 4軸ドキュメント（`issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md`）の整備。
  - ユーザー向け GitHub Secrets / Environment 設定手順のドキュメント化。
- **スコープ外 (Non-Goals)**:
  - 本番ドメインの変更や DNS 設定。
  - Tauri デスクトップアプリのインストーラービルド自動化（別 Issue で対応）。

## 5. 受け入れ基準 (Acceptance Criteria / Definition of Done)

### 5.1. 機能受け入れシナリオ (Feature-specific Acceptance Criteria: Given-When-Then)
- **シナリオ 1: main push 時の品質ゲート合格後の自動デプロイ**
  - **Given**: `main` ブランチにコミットが push（PR マージ）された。
  - **When**: GitHub Actions ワークフローが起動し、`test-and-build` ジョブ（`npm run check`）が 100% 成功した。
  - **Then**: 後続の `deploy` ジョブがトリガーされ、`production` 環境の Secrets（`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`）を用いて Cloudflare Pages へのデプロイが正常終了すること。
- **シナリオ 2: テスト・ビルド失敗時のデプロイ完全遮断**
  - **Given**: `main` ブランチに push されたコミットでテスト失敗または型エラーが存在する。
  - **When**: `test-and-build` ジョブがエラー終了する。
  - **Then**: `deploy` ジョブはスキップされ、壊れた成果物が Cloudflare Pages にデプロイされないこと。
- **シナリオ 3: Pull Request 実行時のデプロイ非起動**
  - **Given**: feature ブランチから `main` への Pull Request が作成または更新された。
  - **When**: GitHub Actions ワークフローが起動する。
  - **Then**: `test-and-build` ジョブのみが実行され、`deploy` ジョブは起動せず、Secrets へのアクセスも発生しないこと。
- **シナリオ 4: パイプライン構成のドキュメントと再現性**
  - **Given**: デプロイワークフローおよびドキュメントが更新された。
  - **When**: `npm.cmd run check`（ドキュメント整合性・セキュリティ・型・テスト）を実行する。
  - **Then**: すべての検査がエラーなく PASS すること。

### 5.2. PR作成前プロセス完了基準 (Pre-PR Process DoD)
- [x] 上記 5.1 の全機能受け入れシナリオを検証する実質的な検査・設定が存在すること。
- [x] 排除対象のリスクに対する物理的ガードレール（直列依存 `needs: test-and-build`、`environment: production`、ブランチ限定）が設定されていること。
- [x] 重複・パッチワーク点検（Impact & Duplication Check）が pre_verification.md に完了・記録されていること。
- [x] 4軸ドキュメント（issue, pre_verification, plan, walkthrough）が揃っていること。
- [x] フル品質ゲート（npm.cmd run check）が 100% PASS すること。

### 5.3. マージ前完了ゲート (Pre-Merge Gate)
- [ ] GitHub Actions CI が PASS していること。
- [ ] 2者合議レビュー（fleet_reviewer ＋ fleet_completion_auditor）による客観的再レビューで両者 LGTM を受領すること。
- [ ] 人間（ユーザー）による最終確認とマージが完了していること。

## 6. 関連ドキュメント・仕様正本 (References & SSOT)
- 事前検証記録: docs/issues/ISSUE-082_cloudflare_pages_automated_deployment/pre_verification.md
- 関連 ADR: docs/adr/0026-cloudflare-pages-automated-deployment.md
- 影響を受けるアーキテクチャ設計書: docs/architecture_overview.md
