# ADR-0027: GitHub Actions 公式 Action の Node 24 ネイティブ版への移行と Node.js 24 実行環境の標準化

- **ステータス**: Accepted
- **決定日**: 2026-09-12
- **関連Issue**: Issue #84

---

## 1. コンテキスト (Context)

Node.js 20 は 2026年4月に公式 End-of-Life（EOL）を迎えました。これに伴い、GitHub Actions ランナー環境の標準実行基盤は **Node.js 24** へ移行し、ランナー上の Node 20 サポートは **2026年9月23日に完全削除（Removal）** されることが GitHub 公式よりアナウンスされました。

JobEval のワークフロー（`.github/workflows/ci.yml`, `.github/workflows/release.yml`）では、GitHub 公式の各 Action（`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`）が `@v4` のまま指定されていたため、以下の問題とリスクが生じていました：
1. **Deprecation Annotation Warning の常態化**:
   各 Action の内部定義が `using: node20` のままであるため、毎回の CI 実行時に「Node.js 20 is deprecated... forced to run on Node.js 24」という警告が発生し、ログのノイズとなっていた。
2. **2026年9月のパイプライン突然死リスク**:
   2026年9月23日にランナーから Node 20 が完全に削除された際、旧バージョン Action が動作不能となり、CI/CD パイプラインが突然停止する深刻なリスクが存在していた。
3. **ローカル環境と CI 環境の乖離（コンテキストドリフト）**:
   ワークフロー内で `node-version: 20` が指定されており、ローカル開発環境（Node 24.19）とランタイムエンジンにバージョン差分が存在していた。

---

## 2. 決定事項 (Decisions)

### ① 全 GitHub 公式 Action の Node 24 ネイティブ対応版への一括刷新
リポジトリ内の全ワークフロー（`ci.yml` および `release.yml`）において、GitHub 公式 Action を Node 24 ネイティブ対応版にアップデートする：
- **`actions/checkout`**: `@v4` → **`@v7`**（Node 24 ネイティブ、`submodules: true` 互換）
- **`actions/setup-node`**: `@v4` → **`@v7`**（Node 24 ネイティブ、`cache: 'npm'` 互換）
- **`actions/upload-artifact`**: `@v4` → **`@v7`**（Node 24 ネイティブ、`retention-days`, `path` 互換）
- **`actions/download-artifact`**: `@v4` → **`@v8`**（Node 24 ネイティブ、`name`, `path` 互換）

### ② プロジェクト実行環境（Node.js エンジン）の Node 24 への標準化
- `ci.yml` および `release.yml` における `node-version` 指定を `20` から **`24`** に統一する。
- ローカル開発環境（`v24.19.0`）と CI 実行環境のバージョンを完全一致させ、環境差異による予期せぬ挙動ブレを根絶する。

### ③ 既存パラメータ・振る舞いの 100% 保持
- `submodules: true`（プラグインサブモジュール取得）
- `cache: 'npm'`（依存関係キャッシュ高速化）
- `retention-days: 1`（アーティファクト保存期間最適化）
- `name: production-dist`（ビルド成果物の同一性受け渡し）
- `concurrency: group: production-deploy`（デプロイ直列化）
上記の安全パラメータはすべてそのまま継承し、ワークフローの堅牢性を維持する。

---

## 3. 結果・影響 (Consequences)

- **ポジティブ**:
  - GitHub Actions CI 実行時の Deprecation Annotation Warning が完全に **0件（クリーン化）** になる。
  - 2026年9月23日の Node 20 完全削除によるパイプライン破綻リスクを先手を打って恒久排除。
  - ローカル（Node 24）と CI（Node 24）の実行環境が完全に一致し、高い再現性が保証される。
- **留意点**:
  - 既存のテストスイート（27ファイル / 236テスト）およびビルドはすでにローカル Node 24 上で 100% PASS を確認済みであり、移行による破壊的影響は一切生じない。
