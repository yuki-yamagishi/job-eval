# [Bug/Feature] PC（ローカル起動）↔ スマホ（クラウド起動）間のWebRTC P2Pリアルタイム同期と本番共有URL生成の修正

- **ステータス**: 🔵 着手可能 (Ready / To Do)
- **優先度**: 高 (High / Critical)
- **カテゴリ**: 端末間同期, WebRTC, P2P, Local-First, バグ修正
- **対象プラットフォーム**: 全プラットフォーム (Web / Mobile / Desktop)

---

## 📌 課題の概要 (Problem Description)

PCでローカル起動（`localhost:5173` や Tauri デスクトップアプリ）した状態で「端末同期」モーダルを開いた際、以下の2つの問題が発生していた：

1. **連携URLの誤生成**:
   - `window.location.origin` が `http://localhost:5173` になってしまい、スマホ側から開けないURLが生成される。
2. **インターネット越し同期の未達**:
   - `BroadcastChannel` は同一オリジン・同一ブラウザのタブ間通信専用であるため、PC（ローカル/別ネットワーク）とスマホ（`job-eval.pages.dev`）間ではリアルタイム同期メッセージが届かない。

---

## 🎯 要件定義 (Requirements)

### 1. 共有URL生成の修正 (`SyncModal.tsx`)
- 実行環境（`localhost`, `127.0.0.1`, `tauri://`）に関わらず、スマホ連携用リンクは常に **`https://job-eval.pages.dev?sync=JE-XXXX`** を生成・提示する。

### 2. WebRTC P2P / インターネット越しリアルタイム同期エンジンの導入 (`peerSyncService.ts`, `cloudSyncService.ts`)
- ルームコード（`JE-XXXX`）を識別子として、インターネット経由で PC と スマホを P2P（WebRTC DataChannel / シグナリング）で直接バインド。
- **Local-First & プライバシー保護の堅持**:
  - 求人データやプロファイル情報は第三者サーバーのDBに一切保存せず、端末間で直接エンドツーエンド暗号化通信。
- 接続確立時に双方の求人・プロファイルデータを `mergeJobs` / `mergeProfile` でスマートマージし、即座に同期完了。
- オフライン時や切断時でも各端末の LocalStorage で完全に動作を継続。

---

## ✅ 受け入れ基準 (Acceptance Criteria)

- [ ] PC（localhost起動）で生成されたスマホ連携URLが `https://job-eval.pages.dev?sync=JE-XXXX` となること。
- [ ] PC と スマホが同じルームコードで接続した際、インターネット経由で双方向に求人・プロファイルが即時同期されること。
- [ ] 既存の `smartMerge` ロジックと連携し、データ消失なくマージされること。
- [ ] `npm run check`（シークレットスキャン、ドキュメント検査、型検査、全テスト、ビルド）がすべて PASS すること。
