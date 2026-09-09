# 実装計画書 (Implementation Plan)

> [!NOTE]
> 本ファイルは最新の進行中フェーズの計画書を保持します。
> 過去のフェーズ（Phase 4〜33, Issue #40, #42, #44, #45, #46, #47, #50, #56, #60等）は docs/issues/ および docs/archive/phases/ に個別に保全されています。

## 現在進行中: Issue #63 (tests/services/cloudSync.test.ts における外部通信遮断・Mock WebSocket 導入による CI クオリティゲート不安定（Flaky）の解消)
詳細は [docs/issues/ISSUE-063_cloudsync_test_flaky_fix/plan.md](./issues/ISSUE-063_cloudsync_test_flaky_fix/plan.md) を参照。

### 実装計画サマリー
1. **変更ファイル**: `tests/services/cloudSync.test.ts`
2. **方針**: `MockWebSocket` クラスの導入、デフォルト `fetch` モックの導入、`afterEach` での明示的 `cloudSyncService` 接続破棄・タイマークリーンアップ。
3. **検証**: `npm.cmd run check`（ワンショット総合品質ゲート）全件 PASS。
