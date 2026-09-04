# Phase 29: クラウド SSoT アーキテクチャ刷新とマージ機能全廃 実装計画書 (Issue #32)

## 🎯 実装目的・概要
これまで「差分最小化」として機能追加を重ねた結果、中途半端な分散マージ（`smartMerge`）が残り、初期プロファイルの現在時刻タイムスタンプによるクラウドデータの上書き破壊や、削除求人のゾンビ復活といった致命的な構造的矛盾が発生していました。
本フェーズでは、Cloudflare D1 を唯一の正本（Single Source of Truth: SSoT）と定め、不要な分散マージロジックを全廃し、完全スナップショット同期（上書き・ミラーリング）アーキテクチャへと刷新します。

---

## 📝 変更ファイル一覧と実装内容

### 1. ガバナンス・設計ドキュメント
- `docs/issues/ISSUE-032_cloud_ssot_architecture_and_merge_removal.md` 起票
- `docs/adr/0011-cloud-ssot-snapshot-sync.md` 起票 & `docs/adr/README.md` 登録

### 2. バックエンド API 層 (`functions/api/sync.ts`)
- PUSH 時に求人リストのスナップショットを受信し、含まれない旧求人を D1 から一括削除（`DELETE FROM sync_jobs WHERE room_id = ? AND job_id NOT IN (...)`）。
- PULL 時に D1 の最新全求人スナップショットを返却。

### 3. コアロジック層 (`src/core/`)
- `src/core/constants/defaultProfile.ts`: `DEFAULT_USER_PROFILE.updatedAt` を最古固定値 `1970-01-01` に変更。
- `src/core/sync/smartMerge.ts`: 複雑な配列合体マージを廃止し、クラウド正本スナップショット適用エンジン `applyJobsSnapshot` / `applyProfileSnapshot` に刷新。

### 4. サービス層 (`src/services/sync/cloudSyncService.ts`)
- D1 から取得したプロファイル・求人をそのまま完全上書きでローカルストレージに展開。
- WebSocket（ntfy.sh）を大容量データ送信から軽量シグナル `{ type: "DATA_UPDATED", roomId }` に限定し、データ本体取得を D1 Pull に統一。

### 5. テスト層 (`tests/`)
- `tests/core/smartMerge.test.ts` を SSoT スナップショット仕様のテストに改修。
- `tests/services/cloudSync.test.ts` をシグナル駆動 D1 スナップショット取得テストに改修。

---

## 🧪 検証手順
1. `npm.cmd run test:run` の全 19 テストファイル PASS 確認。
2. `npm.cmd run check` による全品質ゲート（セキュリティ、ドキュメント、型、テストカバレッジ、ビルド）100% PASS 確認。

---
