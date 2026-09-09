# Issue #63: tests/services/cloudSync.test.ts における外部通信遮断・Mock WebSocket 導入による CI クオリティゲート不安定（Flaky）の解消

## 1. 発生した問題と背景 (Problem Statement)
- PR #61 の main マージ後、GitHub Actions CI Quality Gate（Ubuntu-latest）において、以下のテスト失敗が発生した：
  ```
  FAIL tests/services/cloudSync.test.ts > Cloud Real-Time Sync Service & StorageAdapter Integration > does not overwrite local jobs when connecting to a brand new empty cloud room (exists: false)
  AssertionError: expected [] to have a length of 1 but got +0
  ❯ tests/services/cloudSync.test.ts:257:20
  ```
- **根本原因の分析**:
  1. `tests/services/cloudSync.test.ts` 内で `cloudSyncService.configure()` を呼び出した際、グローバルの `WebSocket` を通じて外部の `wss://ntfy.sh/...` へのリアル通信が発生していた。
  2. また、一部のテストケースで `global.fetch` がモックされておらず、本番 API（`https://job-eval.pages.dev/api/sync`）への実通信が発生し、HTML エラーレスポンスによるパース失敗（`Failed to pull from D1 cloud DB SyntaxError: Unexpected token '<'`）が stderr に記録されていた。
  3. 直前のテストケースで走った非同期通信（`pullFromD1` 等）の遅延解決と、テスト間での `cloudSyncService` シングルトン / タイマーのクリーンアップ漏れが重なり、CI 環境の並行実行・リソース競合時に `localStorage` が空配列 `[]` で上書きされる競合状態（Flaky Test）を引き起こしていた。

## 2. 改修要件 (Requirements)
1. **Mock WebSocket の導入**:
   - `tests/services/cloudSync.test.ts` において、`global.WebSocket` をインメモリの安全なダミークラスにモック化し、外部通信および非同期エラーイベントの漏洩を完全に遮断する。
2. **完全な fetch モックの適用**:
   - `beforeEach` でデフォルトの安全な fetch モックを提供し、外部 D1 API への漏洩を完全に防止する。
3. **テスト間の確実なリソース破棄とステートクリーンアップ**:
   - `beforeEach` / `afterEach` で `await cloudSyncService.configure({ enabled: false, roomId: "", autoSync: false })` を呼び出し、ポーリングタイマー・再接続タイマー・WebSocket を完全にクリーンアップする。
   - `vi.clearAllTimers()`, `vi.restoreAllMocks()`, `localStorage.clear()` を徹底する。
4. **テストの決定論的安定化**:
   - `does not overwrite local jobs...` テストで期待通りのアサーションが 100% 決定論的にパスすることを検証する。

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] `tests/services/cloudSync.test.ts` 実行時に外部通信（ntfy.sh, job-eval.pages.dev）が発生しないこと。
- [ ] stderr に `WebSocket sync error` や `Failed to pull from D1 cloud DB SyntaxError` が一切出力されないこと。
- [ ] `npm.cmd run check` が 100% 決定論的にパスし、CI Quality Gate が安定して成功すること。
