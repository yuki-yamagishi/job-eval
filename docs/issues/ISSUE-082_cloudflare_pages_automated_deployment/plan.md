# Issue #82 実装計画書: GitHub Actions による Cloudflare Pages への安全な自動デプロイパイプライン構築

## 1. 概要・設計方針
本計画は、Issue #82 に基づき、`main` ブランチへの push（PR マージ完了）時に Outer Loop 品質ゲート（`npm run check`）の 100% 成功を検証した上で、Cloudflare Pages へ自動デプロイする安全なパイプラインを構築します。

### 設計要件
1. **直列品質ゲート (Mechanisms)**:
   - `test-and-build` ジョブで `npm run check`（シークレットスキャン、ドキュメント完全性、型検査、Vitest 全テスト、Vite 本番ビルド）を実行。
   - 成功時のみ `dist/` ディレクトリを GitHub Actions Artifact（`actions/upload-artifact@v4`）として保存。
   - `deploy` ジョブは `needs: test-and-build` を指定し、品質ゲートが 100% PASS した場合にのみ起動。
2. **実行条件とセキュリティ境界 (Boundary Security)**:
   - `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` により、PR 実行時や Fork からの実行を物理的に排除。
   - `environment: production` を指定し、GitHub Environments のブランチ保護ルール（`main` 限定）と連携。
   - Secrets（`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`）は `production` 環境に限定配置。
3. **成果物と Functions/D1 の完全性担保**:
   - `deploy` ジョブ内で `actions/checkout@v4` を実行し、リポジトリ内の `functions/api/sync.ts` および `wrangler.jsonc`（D1 バインディング `job-eval-db`）を確保。
   - `actions/download-artifact@v4` で検証済みの `dist/` ディレクトリを展開。
   - `npx --yes wrangler pages deploy dist --project-name job-eval --branch main` を実行してデプロイ。

---

## 2. 変更対象ファイル一覧

| 区分 | ファイルパス | 変更内容 |
| :--- | :--- | :--- |
| **[MODIFY]** | `.github/workflows/ci.yml` | `dist` アーティファクト保存ステップの追加、および後続 `deploy` ジョブの追加 |
| **[NEW]** | `docs/adr/0026-cloudflare-pages-automated-deployment.md` | 自動デプロイアーキテクチャ・セキュリティ決定記録の作成 |
| **[MODIFY]** | `docs/adr/README.md` | ADR-0026 のインデックス登録 |
| **[MODIFY]** | `docs/architecture_overview.md` | デプロイ・CI/CD アーキテクチャの更新 |
| **[MODIFY]** | `docs/pre_phase_verification.md` | Issue #82 へのポインタ更新 |
| **[MODIFY]** | `docs/implementation_plan.md` | Issue #82 へのポインタ更新 |
| **[MODIFY]** | `docs/walkthrough.md` | Issue #82 へのポインタ更新 |
| **[NEW]** | `docs/issues/ISSUE-082_cloudflare_pages_automated_deployment/walkthrough.md` | 成果レポートの作成 |

---

## 3. 実装ステップ

### Step 1: `.github/workflows/ci.yml` の拡張
- `test-and-build` ジョブに `actions/upload-artifact@v4` を追加し、`dist/` を `build-dist` としてアップロード。
- `deploy` ジョブを定義：
  ```yaml
  deploy:
    name: Deploy to Cloudflare Pages (Production)
    needs: test-and-build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://job-eval.pages.dev

    steps:
      - name: Checkout repository (for functions and wrangler.jsonc)
        uses: actions/checkout@v4
        with:
          submodules: true

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Download built assets
        uses: actions/download-artifact@v4
        with:
          name: build-dist
          path: dist

      - name: Deploy to Cloudflare Pages
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: npx --yes wrangler pages deploy dist --project-name job-eval --branch main
  ```

### Step 2: ADR-0026 の策定
- `docs/adr/0026-cloudflare-pages-automated-deployment.md` を作成。
- Public リポジトリにおけるトークン保護方針、GitHub Environments の活用、Direct Upload 方式の選択理由（Functions + D1 の整合性保持）を記録。
- `docs/adr/README.md` に追記。

### Step 3: ドキュメント正本の更新
- `docs/architecture_overview.md` に CI/CD パイプライン（CI 品質ゲート + Cloudflare Pages 自動デプロイ）を反映。
- ルートポインタ（`docs/pre_phase_verification.md`, `docs/implementation_plan.md`, `docs/walkthrough.md`）を更新。

### Step 4: 品質ゲートの実行と検証
- `npm.cmd run check`（ドキュメント整合性、セキュリティチェック、型チェック、テスト、本番ビルド）を実行し、100% PASS を確認。

---

## 4. 検証計画

### 4.1. 自動検証
- `npm.cmd run check`:
  - `securityCheck.js`: 秘密情報の非混入検証
  - `docCheck.js`: 4軸ドキュメントおよび ADR の整合性検証
  - `tsc --noEmit`: 型チェック
  - `vitest run --coverage`: 全テスト通過 & カバレッジ
  - `vite build`: 本番ビルドの成功

### 4.2. ワークフロー構文検証
- GitHub Actions 構文・インデント・依存関係（`needs`）、条件分岐（`if`）、環境設定（`environment`）の目視および整合性チェック。
