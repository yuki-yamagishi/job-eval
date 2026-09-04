# Phase 15: クラウドデータベースによる複数デバイス間リアルタイムデータ同期の実装 (Issue #4, ADR-0006)

## 🎯 実装目的・概要
Cloudflare Pages 経由で PC・スマホから利用する際、ブラウザの LocalStorage に閉じていた求人データおよびプロファイル設定を、**クラウドデータベース（Firebase Firestore）およびリアルタイムリスナー（`onSnapshot`）** を用いて、複数デバイス間でミリ秒単位で双方向リアルタイム同期できるように拡張します。
同期コード / QRコードによるペアリング機能を提供し、未接続時・オフライン時でも既存の `LocalStorageAdapter` に完全フォールバックする耐障害設計を確立します。

---

## 📝 変更ファイル一覧と実装内容

### 1. 型定義 & ストレージインターフェースの拡張
- **`src/types/storage.ts`**:
  - リアルタイム購読メソッド（`subscribeJobs?: (cb: (jobs: JobAnalysisResult[]) => void) => () => void`）
  - プロファイル購読メソッド（`subscribeProfile?: (cb: (profile: UserProfile) => void) => () => void`）
  - 同期ルーム設定メソッド（`setSyncRoom?: (roomId: string) => void`, `getSyncStatus?: () => SyncStatus`）の追加
- **`src/types/sync.ts`**:
  - 同期状態（`SyncStatus`: `idle`, `connected`, `syncing`, `error`, `offline`）および同期設定（`CloudSyncConfig`）の型定義

### 2. クラウド同期ストレージアダプターの実装
- **`src/services/storage/cloudStorageAdapter.ts`**:
  - Firebase Firestore（または汎用クラウドREST/Realtime）を用いた双方向リアルタイム同期アダプターの実装
  - 未設定時はローカルキャッシュ（LocalStorage）に透過的にフォールバック
- **`src/services/storage/index.ts`**:
  - シングルトンストレージアダプターの切り替え管理と同期マネージャー

### 3. フックのリアルタイムリスナー対応
- **`src/hooks/useJobs.ts`**:
  - `storageAdapter.subscribeJobs` を検知し、外部（他端末）からの更新を即座に React State に反映
- **`src/hooks/useProfile.ts`**:
  - `storageAdapter.subscribeProfile` を検知し、プロファイル変更を即座に React State に反映

### 4. UI コンポーネントの実装
- **`src/components/sync/SyncModal.tsx`**:
  - 同期ルームIDの作成・QRコード表示・ペアリングコード入力・接続テスト
- **`src/components/layout/Header.tsx`**:
  - 同期ステータスアイコン（🟢 クラウド同期中 / ☁️ ローカル動作）および「端末間同期」ボタンの配置

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check`（シークレットスキャン + ドキュメント整合性 + TypeScript型検査 + 全単体UIテスト + 本番ビルド）を実行し、全件 PASS を確認。
2. Git コミット・PR作成（`Closes #4`）を実施。

---
