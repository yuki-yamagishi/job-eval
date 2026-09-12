# Issue #84 実装計画書: GitHub Actions 公式 Action の Node 24 ネイティブ版への移行と Node.js 24 実行環境の標準化

## 1. 概要・設計方針
本計画は、Issue #84 に基づき、GitHub Actions ランナー環境の Node 24 世代交代に対応し、リポジトリ内の全ワークフロー（`ci.yml`, `release.yml`）で使用している GitHub 公式 Action を Node 24 ネイティブ対応版に一括移行します。また、CI 実行 Node バージョンをローカル開発環境と同じ `node-version: 24` に統一し、警告ゼロ件（0 Warnings）かつ強固な環境再現性を確立します。

### 設計要件
1. **Node 24 ネイティブ Action への全面刷新**:
   - `actions/checkout`: `@v4` (Node 20) → `@v7` (Node 24)
   - `actions/setup-node`: `@v4` (Node 20) → `@v7` (Node 24)
   - `actions/upload-artifact`: `@v4` (Node 20) → `@v7` (Node 24)
   - `actions/download-artifact`: `@v4` (Node 20) → `@v8` (Node 24)
2. **実行環境（Node.js エンジン）の統一**:
   - `node-version: 20` → `node-version: 24`（ローカル環境 Node 24.19 と完全一致）。
3. **ワークフローの網羅的更新**:
   - `ci.yml`（CI 品質ゲート ＋ Cloudflare Pages デプロイ）
   - `release.yml`（Tauri Windows デスクトップアプリ自動ビルド）
4. **互換性と既存動作の 100% 維持**:
   - `submodules: true`, `cache: 'npm'`, `retention-days: 1`, `production-dist` などのパラメータをそのまま維持。

---

## 2. 変更対象ファイル一覧

| 区分 | ファイルパス | 変更内容 |
| :--- | :--- | :--- |
| **[MODIFY]** | `.github/workflows/ci.yml` | 全 Action を Node 24 ネイティブ版へ更新、`node-version: 24` へ更新、Step 表示名更新 |
| **[MODIFY]** | `.github/workflows/release.yml` | `checkout@v7`, `setup-node@v7`, `node-version: 24` へ更新 |
| **[NEW]** | `docs/adr/0027-github-actions-node24-native-migration.md` | Node 24 ネイティブ移行と実行環境標準化の設計決定記録 |
| **[MODIFY]** | `docs/adr/README.md` | ADR-0027 のインデックス登録 |
| **[MODIFY]** | `docs/architecture_overview.md` | CI/CD 環境仕様（Node 24 / Action v7+）の反映 |
| **[MODIFY]** | `docs/pre_phase_verification.md` | Issue #84 へのポインタ更新 |
| **[MODIFY]** | `docs/implementation_plan.md` | Issue #84 へのポインタ更新 |
| **[MODIFY]** | `docs/walkthrough.md` | Issue #84 へのポインタ更新 |
| **[NEW]** | `docs/issues/ISSUE-084_actions_node24_native_migration/walkthrough.md` | 成果レポートの作成 |

---

## 3. 実装ステップ

### Step 1: `.github/workflows/ci.yml` の更新
- `actions/checkout@v7`（2箇所）
- `actions/setup-node@v7`, `node-version: 24`, 表示名 `Set up Node.js 24`（2箇所）
- `actions/upload-artifact@v7`（1箇所）
- `actions/download-artifact@v8`（1箇所）

### Step 2: `.github/workflows/release.yml` の更新
- `actions/checkout@v7`
- `actions/setup-node@v7`, `node-version: 24`, 表示名 `Setup Node.js 24`

### Step 3: ADR-0027 の策定
- `docs/adr/0027-github-actions-node24-native-migration.md` を作成。
- `docs/adr/README.md` に登録。

### Step 4: システム仕様書・ルートポインタの更新
- `docs/architecture_overview.md` の CI/CD 項および ADR 統合マップを更新。
- `docs/pre_phase_verification.md`, `docs/implementation_plan.md`, `docs/walkthrough.md` を更新。

### Step 5: 品質ゲート検証
- `npm.cmd run check`（シークレットスキャン、ドキュメント検査、型検査、テスト全件合格、本番ビルド）を実行。

---

## 4. 検証計画

### 4.1. 自動検証
- `npm.cmd run check` がローカル（Node 24）で 100% PASS すること。
- GitHub Actions CI 実行時に Deprecation Warning が 0 件となること。
- `Full Quality Gate` および `Deploy to Cloudflare Pages (Production)`（main マージ時）が正常完了すること。
