# [Feature] Cloudflare D1 ＋ E2EE 暗号化による常時非同期クラウド同期（PCオフ時もスマホから即時閲覧）の実装

- **ステータス**: 🔵 着手可能 (Ready / To Do)
- **優先度**: 高 (High / Critical)
- **カテゴリ**: クラウドDB, D1, E2EE, 端末間非同期同期, セキュリティ, Local-First
- **対象プラットフォーム**: 全プラットフォーム (Web / Mobile / Desktop)

---

## 📌 課題の概要 (Problem Description)

現在の P2P / WebSocket リレー同期は「PCとスマホが同時に開いている瞬間」にのみデータを直接やり取りする方式であるため、以下のような日常的な利用シーンで不便が生じていた：

1. **非同期利用ができない**: PCで昼間に求人を保存・分析した後、PCの電源を切って夜にスマホから開いた場合、PCが起動していないためデータが自動取得されない。
2. **ブラウザキャッシュ消去時の復旧**: スマホやPCのブラウザキャッシュがクリアされた際、もう一方の端末を起動して同期ボタンを押さないと復元できない。

本 Issue では、**Cloudflare D1（1日10万回書き込み無料）と Web Crypto（AES-GCM-256）による E2EE 暗号化常時クラウド同期** を導入し、**PCが閉じていてもスマホを開くだけでいつでも最新データを自動復元・同期できる真のクロスデバイス体験** を実現する。

---

## 🎯 要件定義 (Requirements)

### 1. Cloudflare D1 データベース & テーブル設計
- 2 テーブル構成でスキーマを定義：
  - **`sync_rooms`**: `room_id` (PK), `auth_hash`, `profile_encrypted`, `profile_updated_at`, `created_at`, `updated_at`
  - **`sync_jobs`**: `room_id` (PK, FK), `job_id` (PK), `job_encrypted`, `updated_at`

### 2. Cloudflare Pages Functions 同期 API (`functions/api/sync.ts`)
- `POST /api/sync/pull`: 指定した `roomId` と `since`（最終同期日時）以降の暗号化プロファイル・差分求人を一括取得。
- `POST /api/sync/push`: 端末側で暗号化されたプロファイル・求人差分を D1 に保存・更新（LWW自動判定）。

### 3. クライアント側 E2EE 暗号化エンジン (`src/core/crypto/e2eeCrypto.ts`)
- Web Crypto API (`crypto.subtle`) を使用した **AES-GCM-256** 暗号化・復号。
- ルームコード（例: `JE-8492-7K9A`）から PBKDF2/SHA-256 で暗号化鍵を自動導出。
- サーバー（Cloudflare D1）には暗号文しか渡らないため、完全なプライバシー（Zero-Knowledge）を保証。

### 4. `cloudSyncService.ts` への D1 常時同期と `smartMerge` の統合
- Local-First（楽観的UI）を堅持：画面操作は 0ms でローカルストレージに即時反映し、D1 同期はバックグラウンド（非同期）で自動実行。
- 接続時および定期バックグラウンドポーリングで D1 から差分を取得し、`smartMerge` で安全に統合。

---

## ✅ 受け入れ基準 (Acceptance Criteria)

- [ ] PCで求人を保存後、PCを閉じた状態でも、スマホで `https://job-eval.pages.dev/?sync=JE-XXXX` を開くと即座にデータが復元・表示されること。
- [ ] D1 に格納されるデータが完全暗号化（AES-GCM）されており、平文の個人情報がDBに一切残らないこと。
- [ ] オフライン時でもローカルで 100% 正常に動作し、電波復帰時に自動で差分同期されること。
- [ ] `npm run check`（全単体テスト、型検査、ビルド）が 100% PASS すること。
