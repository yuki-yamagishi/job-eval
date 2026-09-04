# Phase 21: Cloudflare D1 ＋ E2EE 暗号化による常時非同期クラウド同期の実装計画書 (Issue #18)

## 🎯 実装目的・概要
PC の電源を切った後でもスマホを開くだけで最新データが自動復元・同期されるようにするため、Cloudflare D1（1日10万回書き込み無料）と Web Crypto（AES-GCM-256）による E2EE 暗号化常時クラウド同期エンジンを導入・統合します。

---

## 📝 変更ファイル一覧と実装内容

### 1. D1 データベース & SQL スキーマの作成
- **`schema.sql`**:
  - `sync_rooms`: ルーム管理・暗号化プロファイル
  - `sync_jobs`: 1求人 = 1行の暗号化求人データ
- **`wrangler.jsonc`** / **`wrangler.toml`**:
  - D1 データベースバインディング `DB` の定義。

### 2. Cloudflare Pages Functions 同期 API の実装
- **`functions/api/sync.ts`**:
  - `POST /api/sync`: `action: "pull"`（差分取得）および `action: "push"`（差分アップロード）を処理。

### 3. クライアント側 E2EE 暗号化エンジンの実装
- **`src/core/crypto/e2eeCrypto.ts`**:
  - Web Crypto API による AES-GCM-256 暗号化・復号、PBKDF2 鍵導出。

### 4. `cloudSyncService.ts` への D1 常時同期統合
- **`src/services/sync/cloudSyncService.ts`**:
  - D1 への自動 Push/Pull と、既存の `smartMerge`（決定論的マージ）の完全統合。
  - P2P リアルタイム同期（同一起動時）と D1 常時同期（非同期起動時）のハイブリッド化。

### 5. 単体テストの追加
- **`tests/core/e2eeCrypto.test.ts`**: 暗号化・復号の単体テスト。

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check` を実行し、全ゲート（セキュリティ、ドキュメント、TypeScript型、単体テスト、ビルド）の 100% PASS を確認。
2. Git コミット・PR作成（`Closes #18`）を実施。
3. `main` マージ後、Cloudflare Pages & D1 へ本番デプロイ。

---
