# Phase 20: 大容量求人データ同期時の ntfy.sh アタッチメント対応とスマホワンタップURL自動接続の修正 実装計画書 (Issue #16)

## 🎯 実装目的・概要
求人データや Markdown などの大容量データ（4KB超）を同期する際、ntfy.sh がファイルをアタッチメント化して送信する仕様に対応し、受信端末（スマホ/PC）側でアタッチメント URL から自動フェッチしてデータを完全復元・スマートマージできるようにします。また、`App.tsx` における URL クエリパラメータ自動接続処理を確実に動作させます。

---

## 📝 変更ファイル一覧と実装内容

### 1. アタッチメント自動フェッチとパースの実装
- **`src/services/sync/cloudSyncService.ts`**:
  - `ws.onmessage` 内で `raw.attachment?.url` を検知した場合、`fetch(raw.attachment.url)` で JSON をダウンロードし、`handleIncomingPacket(packet)` に渡す非同期処理を実装。

### 2. URL 自動接続処理の確実化
- **`src/App.tsx`**:
  - `useEffect` の依存関係を整理し、マウント時に URL クエリパラメータ（`?sync=JE-XXXX`）が存在する場合に確実に `updateSyncConfig` を呼び出す。

### 3. 単体テストの拡充
- **`tests/services/cloudSync.test.ts`**:
  - アタッチメント付きパケットの自動フェッチ＆マージ処理の単体テストを追加。

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check` を実行し、全ゲート（セキュリティ、ドキュメント、TypeScript型、単体テスト、ビルド）の 100% PASS を確認。
2. Git コミット・PR作成（`Closes #16`）を実施。
3. `main` マージ後、Cloudflare Pages へデプロイ。

---
