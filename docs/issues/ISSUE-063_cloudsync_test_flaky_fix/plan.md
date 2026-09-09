# Issue #63 実装計画書 (Implementation Plan)

## 1. 概要
`tests/services/cloudSync.test.ts` における外部 WebSocket / fetch への実通信を完全に遮断し、インメモリ MockWebSocket とデフォルト fetch モック、および厳格なライフサイクル破棄を導入することで、CI 環境における Flaky 失敗を根絶する。

## 2. 変更ファイル
1. `docs/issues/ISSUE-063_cloudsync_test_flaky_fix/issue.md` [作成済]
2. `docs/issues/ISSUE-063_cloudsync_test_flaky_fix/pre_verification.md` [作成済]
3. `docs/issues/ISSUE-063_cloudsync_test_flaky_fix/plan.md` [本ファイル]
4. `docs/issues/ISSUE-063_cloudsync_test_flaky_fix/walkthrough.md` [完了後作成]
5. `docs/pre_phase_verification.md` [更新]
6. `docs/implementation_plan.md` [更新]
7. `docs/walkthrough.md` [更新]
8. `tests/services/cloudSync.test.ts` [修正]

## 3. 実装詳細仕様 (`tests/services/cloudSync.test.ts`)
- **`MockWebSocket` クラスの定義**:
  - `send`, `close`, `addEventListener`, `removeEventListener` を備え、イベント発火可能なインメモリ WebSocket モック。
  - テスト開始時に `global.WebSocket = MockWebSocket as any;` に設定し、`afterAll` で復元。
- **デフォルト fetch モック**:
  - `beforeEach` で `defaultFetchMock` を割り当て、モック指定のないテスト（例: `updates status when configuring sync room`）でも外部への実通信を防止。
- **ライフサイクル破棄の徹底**:
  - `beforeEach` および `afterEach` で `await cloudSyncService.configure({ enabled: false, roomId: "", autoSync: false })` を呼び、タイマー・接続を完全破棄。
  - `localStorage.clear()` を実行。

## 4. 検証手順
- `npm.cmd run test:run tests/services/cloudSync.test.ts`
- `npm.cmd run check`（ワンショット総合品質ゲート）
