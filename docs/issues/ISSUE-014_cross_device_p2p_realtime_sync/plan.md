# Phase 19: PC（ローカル起動）↔ スマホ（クラウド起動）間のWebRTC P2Pリアルタイム同期と本番共有URL生成の修正 実装計画書 (Issue #14)

## 🎯 実装目的・概要
PCローカル開発環境（`localhost:5173`）やデスクトップアプリから発行した同期用ルームコードをスマホ（`https://job-eval.pages.dev`）で開いても同期できるようにするため、スマホ連携リンクの生成先を本番クラウドURLで標準化し、別ネットワーク・別端末間でインターネット越しにリアルタイム P2P データ同期（WebRTC / WebSocket リレー）を実現します。

---

## 📝 変更ファイル一覧と実装内容

### 1. 共有URL生成の修正
- **`src/components/sync/SyncModal.tsx`**:
  - `window.location.origin` が `localhost`, `127.0.0.1`, `tauri://` 等のローカル環境である場合でも、スマホ連携リンクには常に本番公開ドメイン `https://job-eval.pages.dev?sync=JE-XXXX` を生成。

### 2. インターネット越しリアルタイム同期エンジンの導入
- **`src/services/sync/cloudSyncService.ts`**:
  - `BroadcastChannel`（同一ブラウザ内用）に加え、インターネット経由でメッセージを双方向中継する P2P / リアルタイムリレー機構を統合。
  - ルームコード（`JE-XXXX`）をキーとして、接続確立時に `smartMerge`（求人・プロファイル）を自動実行。

### 3. 単体テストの追加
- **`tests/services/peerSync.test.ts`**:
  - クロス端末メッセージング、URL生成、`smartMerge` 統合の単体テスト。

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check` を実行し、全ゲート（セキュリティ、ドキュメント、TypeScript型、単体テスト、ビルド）の 100% PASS を確認。
2. Git コミット・PR作成（`Closes #14`）を実施。
3. `main` マージ後、Cloudflare Pages へデプロイ。

---
