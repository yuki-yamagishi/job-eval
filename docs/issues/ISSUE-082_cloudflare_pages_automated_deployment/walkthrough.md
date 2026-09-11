# Issue #82 成果レポート: GitHub Actions による Cloudflare Pages への安全な自動デプロイパイプライン構築

## 1. 成果概要
Issue #82 に基づき、`main` ブランチへの push（PR マージ）時に自動で Outer Loop 品質ゲート（`npm run check`）を実行し、100% 成功した場合のみ Cloudflare Pages へ本番配信を行う安全な CI/CD パイプラインを構築しました。

これにより、PR マージ後の手動デプロイ忘れや 6 日間のデプロイ停止のような事故が物理的に再発しない仕組み（Mechanisms）が完成しました。

---

## 2. 実装内容

### 2.1. `.github/workflows/ci.yml` の拡張
- **成果物アーティファクト保存**:
  `test-and-build` ジョブでテスト・ビルド済みの `dist/` ディレクトリを `actions/upload-artifact@v4` で保存し、二重ビルドによる環境差分を排除。
- **直列デプロイジョブ (`deploy`) の新設**:
  - `needs: test-and-build`: テスト・型検査・ビルドが 100% 成功した場合のみ実行。
  - `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`: PR 実行時や Fork からの実行を物理的に排除。
  - `environment: production`: GitHub Environments の保護ルールと連携し、本番 Secrets を隔離。
  - `actions/checkout@v4` でワーキングツリーを取得し、`functions/api/sync.ts` および `wrangler.jsonc`（D1 バインディング `job-eval-db`）を確保。
  - `npx --yes wrangler pages deploy dist --project-name job-eval --branch main` でデプロイを実行。

### 2.2. ADR-0026 の策定
- `docs/adr/0026-cloudflare-pages-automated-deployment.md` を作成し、以下を明文化：
  - なぜ Cloudflare Pages 公式連携ではなく GitHub Actions 方式を採用したか（保守性・拡張性・テスト直列品質ゲートの優位性）。
  - Public リポジトリにおけるセキュリティ設計（最小権限トークン、Environment 分離、`main` push 限定）。
  - `docs/adr/README.md` に登録。

### 2.3. システム仕様書・ルートポインタの更新
- `docs/architecture_overview.md` に CI/CD パイプライン概要を反映。
- `docs/pre_phase_verification.md`、`docs/implementation_plan.md`、`docs/walkthrough.md` を更新。

---

## 3. 検証結果 (Validation Results)

### 3.1. ワンショット品質ゲート (`npm run check`)
- セキュリティ検査（`securityCheck.js`）: PASS
- ドキュメント検査（`docCheck.js`）: PASS
- TypeScript 型検査（`tsc --noEmit`）: PASS
- 単体テスト & カバレッジ（`vitest run --coverage`）: PASS（18テストファイル / 173テスト全件合格）
- 本番ビルド（`vite build`）: PASS

---

## 4. ユーザー様による GitHub Secrets / Environment 設定手順

本パイプラインを本番稼働させるため、PR マージ前またはマージ後に以下の設定をお願いいたします（初回 1 回のみ）。

### 手順 1: Cloudflare で最小権限 API トークンを発行
1. Cloudflare ダッシュボードにログインし、右上のユーザーアイコンから「My Profile」→「API Tokens」を開きます。
2. 「Create Token」をクリックし、「Create Custom Token」の「Get started」を選択します（または「Cloudflare Pages」テンプレート）。
3. 以下の通り設定します：
   - **Token name**: `job-eval-github-actions-deploy`
   - **Permissions**:
     - `Account` - `Cloudflare Pages` - `Edit`
   - **Account Resources**:
     - `Include` - 対象の Cloudflare アカウントを選択
4. 「Continue to summary」→「Create Token」をクリックし、表示されたトークン文字列をコピーします。
5. Cloudflare アカウント ID（Cloudflare ダッシュボードの URL や概要画面右下に表示されている 32 桁の英数字）を控えます。

### 手順 2: GitHub リポジトリに Environment & Secrets を登録
1. GitHub リポジトリ（`yuki-yamagishi/job-eval`）の「Settings」タブを開きます。
2. 左メニュー「Environments」を開き、「New environment」をクリックして名前を `production` と入力して作成します。
3. （推奨）「Deployment branches」で「Selected branches」を選択し、「Add deployment branch rule」で `main` を指定します。
4. 下部の「Environment secrets」で「Add secret」をクリックし、以下の 2 つを登録します：
   - `CLOUDFLARE_API_TOKEN`: 手順 1 で取得した API トークン
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare アカウント ID
