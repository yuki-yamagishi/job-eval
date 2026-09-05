# Phase 29: 実装成果レポート (Walkthrough) - クラウド SSoT アーキテクチャ刷新とマージ機能全廃 (Issue #32)

## 🎯 達成した実装概要

これまで「差分最小化」として機能追加を重ねた結果、用途（単一ユーザーによる端末間共有・引き継ぎ）に対して不要かつ過剰な「分散マージ（`smartMerge`）」が残り、初期プロファイルの現在時刻タイムスタンプによるクラウドデータの上書き破壊や、削除求人のゾンビ復活といった致命的な構造的矛盾が発生していました。

本対応では、ユーザーとの合意に基づき **Cloudflare D1 を唯一の正本（Single Source of Truth: SSoT）** と定め、不要な分散マージロジックを全廃しました。「最後に保存した端末の状態がそのままクラウドに残り、他端末はそれをそのまま展開（ミラーリング）する」シンプルなスナップショット同期アーキテクチャへと刷新しました。

---

## 1. 主な変更点と改善内容

### ① クラウド SSoT スナップショット同期エンジンへの刷新 (`src/core/sync/smartMerge.ts`)
- 配列の結合や LWW フィールドマージロジックを全廃。
- クラウドのデータを無条件で正本として採用する純粋関数 `applyJobsSnapshot` / `applyProfileSnapshot` に刷新（後方互換エイリアス `mergeJobs`, `mergeProfile` も保持）。
- APIキー保護ガードを確立（ローカルに設定済みAPIキーがあり、クラウドにない場合はローカルのキーを安全に維持）。

### ② 初期プロファイルによるクラウド上書き破壊の根絶 (`src/core/constants/defaultProfile.ts`)
- `DEFAULT_USER_PROFILE.updatedAt` をアクセス時の現在時刻から最古固定値（`"1970-01-01T00:00:00.000Z"`）に変更。
- 新端末やデプロイ直後に開いたサンプル初期値（山田 太郎）がクラウド上のユーザー実データを上書き破壊する事故を 100% 根絶。

### ③ D1 API での求人削除完全同期 (`functions/api/sync.ts`)
- PUSH 時に求人リストを受信した場合、そのリストに含まれない旧求人レコードを D1 上で一括削除（`DELETE FROM sync_jobs WHERE room_id = ? AND job_id NOT IN (...)`）し、空配列の場合は全件削除を実行。
- 端末側で削除された求人が別端末でゾンビ復活する問題を解消。

### ④ WebSocket（ntfy.sh）リレーの軽量シグナル化 (`src/services/sync/cloudSyncService.ts`)
- WebSocket 経由での生データ送信を廃止し、`{ type: "DATA_UPDATED", roomId }` という数バイトの Ping 通知のみに限定。
- データ本体取得は D1 Pull に一本化し、4KB超えのパケット制限や通信エラー要因を排除。

### ⑤ テストの拡充
- `tests/core/smartMerge.test.ts` を SSoT スナップショット仕様のテストに改修。
- `tests/services/cloudSync.test.ts` をシグナル駆動 D1 スナップショット取得テストに改修。
- 全 19 テストファイル 97 件の単体テストが 100% PASS。

---
