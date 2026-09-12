# Issue #84: 事前検証記録 (Pre-Verification)

## 1. 検証日時
2026-09-12

## 2. 現状の課題分析 (Problem Analysis)
- **現状のコード・アーキテクチャの振る舞い**:
  - 現在のリポジトリのワークフロー（`.github/workflows/ci.yml`, `.github/workflows/release.yml`）では、GitHub 公式の各 Action がすべて `@v4`（`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`）で固定されている。
  - これらの Action の内部メタデータ（`action.yml`）は `runs: using: node20` を指定している。
  - GitHub Actions ランナー環境の標準実行基盤が Node.js 24 へ移行したため、ランナー上で各 Action の実行時に「Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4, actions/upload-artifact@v4」という Deprecation Annotation Warning が発生している。
  - また、ワークフロー内で設定されている `node-version: 20` もローカル開発環境（Node 24.19）と一致しておらず、環境の不整合が生じている。
- **根本原因 (Root Cause)**:
  - GitHub Actions ランナー環境の世代交代（Node 20 EOL に伴う Node 24 への標準化）に対し、ワークフロー側の Action バージョン指定およびプロジェクト Node バージョン指定が旧世代（Node 20）のまま据え置かれていたこと。

## 3. 重複・パッチワーク点検 (Impact & Duplication Check)
- **既存基盤・ユーティリティ・ASTの横断調査**:
  - `.github/workflows/ci.yml`:
    - `actions/checkout@v4` (2箇所: test-and-build, deploy)
    - `actions/setup-node@v4` (2箇所: test-and-build, deploy)
    - `actions/upload-artifact@v4` (1箇所)
    - `actions/download-artifact@v4` (1箇所)
  - `.github/workflows/release.yml`:
    - `actions/checkout@v4` (1箇所)
    - `actions/setup-node@v4` (1箇所)
  - GitHub 公式 API による最新バージョンの調査結果:
    - `actions/checkout`: `@v7`（`using: node24`、`submodules: true` 互換性確認済）
    - `actions/setup-node`: `@v7`（`using: node24`、`cache: 'npm'` 互換性確認済）
    - `actions/upload-artifact`: `@v7`（`using: node24`、`retention-days`, `path` 互換性確認済）
    - `actions/download-artifact`: `@v8`（`using: node24`、`name`, `path` 互換性確認済）
- **車輪の再発明・パッチワークの防止方針**:
  - 一部の Action のみ場当たり的につぎはぎ更新するのではなく、リポジトリ内の全ワークフロー（`ci.yml` および `release.yml`）を一括で Node 24 ネイティブ版に揃える。
  - Action 側の実行エンジン（ランナーの JavaScript ランタイム）だけでなく、プロジェクト自身のビルド・テスト環境（`node-version: 24`）も一貫して揃え、ローカル環境（`v24.19.0`）と CI 実行環境の 100% 同一性を確立する。

## 4. 改修方針 (Implementation Strategy)
1. **`.github/workflows/ci.yml` の更新**:
   - `actions/checkout@v4` → `@v7`
   - `actions/setup-node@v4` → `@v7`, `node-version: 20` → `24`
   - `actions/upload-artifact@v4` → `@v7`
   - `actions/download-artifact@v4` → `@v8`
2. **`.github/workflows/release.yml` の更新**:
   - `actions/checkout@v4` → `@v7`
   - `actions/setup-node@v4` → `@v7`, `node-version: 20` → `24`
3. **ADR-0027 の策定**:
   - `docs/adr/0027-github-actions-node24-native-migration.md` を作成し、Node 24 ネイティブ移行の決定およびバージョン選定方針を記録。
4. **仕様正本・ドキュメントの同期**:
   - `docs/architecture_overview.md` および `docs/adr/README.md` を更新。
5. **品質ゲートの検証**:
   - `npm.cmd run check` を実行し、ローカル（Node 24）での完全合格を確認。
