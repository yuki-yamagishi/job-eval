# ADR-0026: GitHub Actions による Cloudflare Pages への安全な自動デプロイパイプラインの採用

- **ステータス**: Accepted
- **決定日**: 2026-09-11
- **関連Issue**: Issue #82

---

## 1. コンテキスト (Context)

JobEval の本番環境（`https://job-eval.pages.dev`）は Cloudflare Pages 上でホスティングされています。
しかし、これまでの運用では Cloudflare Pages のプロジェクトが Direct Upload 方式（`Git Provider: No`）で運用されており、GitHub リポジトリ連携や GitHub Actions による自動デプロイが設定されていませんでした。

その結果、以下の課題とリスクが顕在化していました：
1. **本番配信の停止とリリース遅延**:
   - `main` ブランチに PR #81（Issue #80 福利厚生・健保取得機能）がマージされた後も、手動デプロイを実行するまで本番環境に反映されず、直近 6 日間デプロイが停止していた。
2. **コンテキストドリフト（コード乖離）**:
   - リポジトリの `main` コードと実際にユーザーが利用している本番配信バイナリが乖離し、バグ修正や新機能の即時提供が妨げられていた。
3. **Public リポジトリにおける自動デプロイのセキュリティ懸念**:
   - 本リポジトリが Public（公開）であるため、Fork PR からのトークン搾取（PwnRequest 攻撃）や、壊れたコード・未テストコードの本番公開リスクを完全に封じ込める必要があった。

---

## 2. 決定事項 (Decisions)

### ① Cloudflare Pages 公式連携ではなく「GitHub Actions 直列デプロイ」の採用
Cloudflare 側の Git 連携（Cloudflare が push を検知してビルド）と、GitHub Actions による Direct Upload を比較検討した結果、以下の理由から **GitHub Actions による自動デプロイ** を採用する：
- **保守性（Single Source of Truth）**:
  ビルド・テスト・デプロイの全定義が `.github/workflows/ci.yml`（Git 管理）に集約され、設定変更が 100% 追跡可能。
- **拡張性**:
  Tauri デスクトップ版のビルド（`.github/workflows/release.yml`）や、デプロイ後通知（Discord/Slack等）との将来的な統合パイプライン化が容易。
- **物理的信頼性（Mechanisms）**:
  Cloudflare 連携では「テストが落ちていてもビルドが通ればデプロイされてしまう」のに対し、GitHub Actions では **「Outer Loop 品質ゲート（`npm run check`）が 100% PASS しない限りデプロイステップに到達しない」** 直列ガードを物理強制できる。

### ② Public リポジトリにおける多層防壁セキュリティ境界
1. **トリガーの厳格制限**:
   - デプロイジョブは `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` の時のみ実行。
   - `on: pull_request` ではデプロイジョブは一切起動せず、Secrets にもアクセスしない（Fork PR によるトークン漏洩を原理的に遮断）。
2. **GitHub Environments（`production`）による保護**:
   - デプロイジョブに `environment: production` を指定。
   - `main` ブランチ以外からの実行を GitHub プラットフォームレベルで拒絶。
3. **最小権限トークン原則（Least Privilege）**:
   - Cloudflare の Global API Key は厳禁とし、「Cloudflare Pages: Edit」権限のみに対象アカウントを絞ったカスタム API トークン（`CLOUDFLARE_API_TOKEN`）を使用。

### ③ 成果物同一性の保証（コンテキストドリフト排除）
- `test-and-build` ジョブで `npm run check`（テスト・型検査・本番ビルド）を実行。
- 検証済みの `dist/` ディレクトリを `actions/upload-artifact@v4` で保存し、後続の `deploy` ジョブで `actions/download-artifact@v4` により展開。
- 二重ビルドによる環境差異を排除し、「検証された同一バイナリ」を本番配信する。

### ④ Functions（D1 Cloud Sync）および設定の維持
- `deploy` ジョブ内で `actions/checkout@v4` を実行し、ワーキングツリー内の `functions/api/sync.ts` および `wrangler.jsonc`（D1 バインディング `job-eval-db`）を wrangler に認識させる。
- `npx --yes wrangler pages deploy dist --project-name job-eval --branch main` により、静的アセットと Pages Functions を一括安全配信する。

---

## 3. 結果・影響 (Consequences)

- **ポジティブ**:
  - `main` ブランチに PR がマージされると、約 1〜2 分で品質ゲートを通過した最新コードが本番環境（`https://job-eval.pages.dev`）に完全自動デプロイされる。
  - 手動デプロイ作業が一切不要になり、デプロイ忘れによるリリース停止が物理的に根絶される。
  - テストや型チェックが落ちたコードはデプロイ直前で自動遮断されるため、本番障害リスクが極小化される。
- **留意点**:
  - 初回稼働時に、リポジトリ管理者（ユーザー）が GitHub リポジトリの `Settings -> Environments -> production` に `CLOUDFLARE_API_TOKEN` および `CLOUDFLARE_ACCOUNT_ID` を登録する必要がある。
