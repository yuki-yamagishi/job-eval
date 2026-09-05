## Phase 21: Cloudflare D1 ＋ E2EE 暗号化による常時非同期クラウド同期の実装 (Issue #18)

| 検証軸 | 検出事項・考慮点 | 実装・設計での解決策 |
| :--- | :--- | :--- |
| **1. 技術・環境** | Cloudflare D1 と Pages Functions API、およびブラウザ標準 Web Crypto API（AES-GCM-256）の整合性。 | 2テーブル構成（`sync_rooms`, `sync_jobs`）の SQL スキーマを作成し、`functions/api/sync.ts` に pull/push API を実装。 |
| **2. UX・エッジケース** | PC の電源が切れていても、スマホで開いた瞬間にバックグラウンドで D1 から最新データが自動復元されること。 | 画面操作はローカルストレージ（0ms）で即時反映し、D1 同期はバックグラウンド非同期（楽観的UI）で実行。 |
| **3. 永続性・互換性** | データベースには AES-GCM 暗号化されたバイナリ/文字列のみが保存され、個人情報が平文で残らないこと。 | ルームコードから PBKDF2/SHA-256 で暗号化鍵を生成し、クライアント側で完全暗号化（Zero-Knowledge）。 |
| **4. テスト容易性 & 自律性** | Node.js / Vitest 環境で Web Crypto API による暗号化・復号、および D1 API モックの単体テストが 100% PASS すること。 | `e2eeCrypto.test.ts` と `d1Sync.test.ts` を作成しテスト自律性を担保。 |

---
