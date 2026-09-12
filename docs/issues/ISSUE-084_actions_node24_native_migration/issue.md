# Issue #84: GitHub Actions 公式 Action の Node 24 ネイティブ版への移行と Node.js 24 実行環境の標準化

## 1. 解決すべき課題・背景 (Problem Statement / Why)
- **現在の問題点**:
  - GitHub Actions ランナー環境の標準実行基盤が Node.js 24 へ移行したことに伴い、既存ワークフロー（`ci.yml`, `release.yml`）で使用されている GitHub 公式 Action（`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`）が Node 20 向け（`using: node20`）であるため、毎回の CI 実行で「Node.js 20 is deprecated... forced to run on Node.js 24」という警告（Annotation Warning）が発生している。
  - また、GitHub Actions ランナー上の Node.js 20 サポートは 2026年9月23日に完全削除（Removal）されることが GitHub 公式よりアナウンスされており、放置すると将来的に CI が突然停止・破綻する技術的負債となる。
  - さらに、ワークフロー内で設定されているプロジェクト自身の Node バージョン（`node-version: 20`）もローカル開発環境（Node 24.19）と乖離しており、環境差分（コンテキストドリフト）の温床となっている。
- **放置した場合のリスク**:
  - 2026年9月23日の Node 20 完全削除に伴うパイプライン破綻・デプロイ停止。
  - 警告の常態化による新規の真の警告（不具合兆候）の見落とし。
  - ローカル開発環境（Node 24）と CI 実行環境（Node 20）の差異による予期せぬ動作不整合。
- **なぜ今解く必要があるのか**:
  - Node 24 ネイティブ対応版 Action（`checkout@v7`, `setup-node@v7`, `upload-artifact@v7`, `download-artifact@v8`）が既に安定提供されており、手動デプロイ自動化（Issue #82）が完了した今、警告ゼロのクリーンかつ堅牢な CI/CD 基盤を確立するため。

## 2. 期待される成果と価値 (Desired Outcome / Value)
- `.github/workflows/ci.yml` および `.github/workflows/release.yml` 内の全 GitHub 公式 Action を Node 24 ネイティブ対応版にアップデートし、CI 実行時の Deprecation Warning を完全にゼロ件（0 Warnings）にすること。
- プロジェクトの CI 実行 Node バージョンを `node-version: 24` に更新し、ローカル開発環境（Node 24）との完全な一致・環境再現性を達成すること。

## 3. 排除するリスク (Risks to Eliminate)
- **Node 20 完全削除（2026年9月）による CI 突然死リスクの排除**: 事前に Node 24 ネイティブ版へ移行し、ランナー側での強制実行や将来の廃止影響を完全に無力化する。
- **Action バージョンアップに伴うオプション非互換リスクの排除**: 各 Action の最新仕様（`submodules`, `cache`, `retention-days` 等の input/output）を精査し、既存ワークフローの振る舞いを 100% 維持する。
- **CI ランナーとローカル実行環境の差異リスクの排除**: `node-version: 24` に統一することで、同一の Node.js エンジン上でビルド・テストを実行する。

## 4. スコープの定義 (Scope & Boundaries)
- **スコープ内 (In-Scope)**:
  - `.github/workflows/ci.yml`:
    - `actions/checkout@v7` への更新
    - `actions/setup-node@v7` への更新、`node-version: 24` への更新
    - `actions/upload-artifact@v7` への更新
    - `actions/download-artifact@v8` への更新
  - `.github/workflows/release.yml`:
    - `actions/checkout@v7` への更新
    - `actions/setup-node@v7` への更新、`node-version: 24` への更新
  - ADR-0027 の策定、SSOT ドキュメント（`architecture_overview.md`）の更新。
  - 4軸ドキュメント（`issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md`）の整備。
- **スコープ外 (Non-Goals)**:
  - Wrangler や Vite、React などのアプリケーション依存関係のメジャー更新（別 Issue で対応）。

## 5. 受け入れ基準 (Acceptance Criteria / Definition of Done)

### 5.1. 機能受け入れシナリオ (Feature-specific Acceptance Criteria: Given-When-Then)
- **シナリオ 1: CI ワークフローにおける Node 24 ネイティブ実行と警告ゼロ件**
  - **Given**: `.github/workflows/ci.yml` が Node 24 ネイティブ対応 Action（`checkout@v7`, `setup-node@v7`, `upload-artifact@v7`, `download-artifact@v8`）および `node-version: 24` に更新された。
  - **When**: GitHub Actions CI が実行される。
  - **Then**: `Full Quality Gate` がエラーなく PASS し、Node 20 に関する Deprecation Annotation Warning が 0 件であること。
- **シナリオ 2: デプロイジョブでの成果物受け渡しとデプロイ正常動作**
  - **Given**: `main` ブランチに更新が push される。
  - **When**: `upload-artifact@v7` で出力された `production-dist` を `download-artifact@v8` が展開し、Wrangler デプロイが実行される。
  - **Then**: アーティファクトの受け渡しに不整合なく、Cloudflare Pages へのデプロイが正常終了すること。
- **シナリオ 3: リリースワークフロー (`release.yml`) の一貫性**
  - **Given**: `.github/workflows/release.yml` が更新された。
  - **When**: ワークフロー構文および依存関係を検査する。
  - **Then**: `actions/checkout@v7` および `actions/setup-node@v7`（`node-version: 24`）が指定され、構文エラーがないこと。
- **シナリオ 4: ローカル品質ゲートとの完全整合**
  - **Given**: ローカル開発環境（Node 24）で `npm.cmd run check` を実行する。
  - **When**: シークレットスキャン、ドキュメント完全性検査、型検査、全単体テスト、本番ビルドを実行する。
  - **Then**: 全項目が 100% PASS すること。

### 5.2. PR作成前プロセス完了基準 (Pre-PR Process DoD)
- [x] 上記 5.1 の全機能受け入れシナリオを検証する実質的な設定・検査が存在すること。
- [x] 排除対象のリスクに対する物理的ガードレール（Action メジャーバージョン指定、Node 24 指定）が設定されていること。
- [x] 重複・パッチワーク点検（Impact & Duplication Check）が pre_verification.md に完了・記録されていること。
- [x] 4軸ドキュメント（issue, pre_verification, plan, walkthrough）が揃っていること。
- [x] フル品質ゲート（npm.cmd run check）が 100% PASS すること。

### 5.3. マージ前完了ゲート (Pre-Merge Gate)
- [ ] GitHub Actions CI が PASS していること（警告 0 件）。
- [ ] 2者合議レビュー（fleet_reviewer ＋ fleet_completion_auditor）による客観的再レビューで両者 LGTM を受領すること。
- [ ] 人間（ユーザー）による最終確認とマージが完了していること。

## 6. 関連ドキュメント・仕様正本 (References & SSOT)
- 事前検証記録: docs/issues/ISSUE-084_actions_node24_native_migration/pre_verification.md
- 関連 ADR: docs/adr/0027-github-actions-node24-native-migration.md
- 影響を受けるアーキテクチャ設計書: docs/architecture_overview.md
