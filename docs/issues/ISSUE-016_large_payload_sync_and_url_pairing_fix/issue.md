# [Bug] 大容量求人データ同期時の ntfy.sh アタッチメント対応とスマホワンタップURL自動接続の修正

- **ステータス**: 🔵 着手可能 (Ready / To Do)
- **優先度**: 高 (High / Blocker)
- **カテゴリ**: 端末間同期, WebRTC, バグ修正, モバイル最適化
- **対象プラットフォーム**: 全プラットフォーム (Web / Mobile / Desktop)

---

## 📌 課題の概要 (Problem Description)

PCで発行した同期URL（例: `https://job-eval.pages.dev/?sync=JE-9961`）をスマホで開いた際、以下の2つの根本原因によってデータが同期されない不具合が発生していた：

1. **ntfy.sh の 4KB 超過アタッチメント化による JSON パース失敗**:
   - 求人データや Markdown を含むデータパケットのサイズが 4KB を超えると、ntfy.sh はメッセージ本文を `"You received a file: attachment.json"` に置き換え、実データを `attachment.url` に退避する仕様だった。
   - クライアント側で `attachment.url` のフェッチ処理を行っていなかったため、大容量データのパケットが SyntaxError となって握りつぶされ、求人データが届かなかった。
2. **`App.tsx` における URL クエリパラメータ自動接続の依存関係ループ**:
   - `useEffect` の依存配列に `syncConfig` が含まれており、初期ロード時のタイミングによって同期接続が発火しない場合があった。

---

## 🎯 要件定義 (Requirements)

### 1. `cloudSyncService.ts` における大容量パケット（アタッチメント）自動取得
- WebSocket メッセージ受信時、`raw.attachment?.url` が存在する場合は `fetch(raw.attachment.url)` で実際の JSON パケットを自動ダウンロードしてマージ処理（`applyJobsMerge` / `applyProfileMerge`）を実行する。

### 2. `App.tsx` における URL ペアリング処理の確実化
- マウント時に URL クエリパラメータ（`?sync=JE-XXXX`）を確実に検知し、未接続または異なる Room ID の場合に即時接続を実行。

---

## ✅ 受け入れ基準 (Acceptance Criteria)

- [ ] 4KB を超える求人データ（Markdown含む）であっても、アタッチメント自動フェッチにより PC ↔ スマホ間で確実に同期されること。
- [ ] `https://job-eval.pages.dev/?sync=JE-XXXX` を開くだけで、スマホ側が自動接続され PC のデータが即時表示されること。
- [ ] `npm run check`（シークレットスキャン、ドキュメント検査、TypeScript型検査、全テスト、ビルド）がすべて PASS すること。
