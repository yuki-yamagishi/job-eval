## Phase 20: 大容量求人データ同期時の ntfy.sh アタッチメント対応とスマホワンタップURL自動接続の修正 (Issue #16)

| 検証軸 | 検出事項・考慮点 | 実装・設計での解決策 |
| :--- | :--- | :--- |
| **1. 技術・環境** | ntfy.sh で 4KB を超える求人・Markdownパケットが送信された際、メッセージがファイルアタッチメント化される仕様。 | WebSocket 受信時に `raw.attachment?.url` を検知し、`fetch` で JSON を自動ダウンロード・パースしてマージする処理を追加。 |
| **2. UX・エッジケース** | スマホで `https://job-eval.pages.dev/?sync=JE-XXXX` を開いた際、初期マウント時に確実に自動接続されること。 | `App.tsx` の URL パラメータ検知ロジックを初回マウント時に確実に実行し、未接続時に即座に `updateConfig` をトリガー。 |
| **3. 永続性・互換性** | 取得した大容量求人データが既存の `smartMerge`（LWW・ID突合）を通過し、LocalStorage に安全に永続化されること。 | `applyJobsMerge` / `applyProfileMerge` が一貫して動作し、ローカルデータとマージ。 |
| **4. テスト容易性 & 自律性** | アタッチメント付きパケットの受信処理を含め、`npm run check` の全テストが 100% PASS すること。 | `cloudSync.test.ts` にアタッチメント復元テストを追加し、テスト自律性を担保。 |

---
