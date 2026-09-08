# Issue #46: 実装計画書 (Implementation Plan)

## 1. 変更ファイル一覧
- `.agents/hooks.json`: [NEW] Antigravity ライフサイクルフック定義設定
- `scripts/harness/hooks/stopHook.js`: [NEW] `Stop` イベントハンドラー（未解決ループ時の停止拒否）
- `scripts/harness/hooks/preToolHook.js`: [NEW] `PreToolUse` イベントハンドラー（禁止コマンドのブロック）
- `scripts/harness/hooks/postToolHook.js`: [NEW] `PostToolUse` イベントハンドラー（`gh pr create` 検知による状態遷移）
- `tests/harness/hooks.test.ts`: [NEW] フック群の stdin/stdout JSON プロトコル検証テスト (Vitest)
- `docs/pre_phase_verification.md`: Issue #46 へのポインタ更新
- `docs/implementation_plan.md`: Issue #46 へのポインタ更新
- `docs/walkthrough.md`: Issue #46 へのポインタ更新

## 2. 実装手順
1. **フックハンドラーの実装 (`scripts/harness/hooks/`)**:
   - `stopHook.js`: stdin から JSON を受け取り、`loopState.canStop()` を判定。`allowed: false` なら `{"decision": "continue", "reason": "..."}`、`allowed: true` なら `{"decision": "allow"}` を stdout に出力。
   - `preToolHook.js`: stdin から `toolCall` を受け取り、`run_command` のコマンドラインを検査。禁止コマンド（例: `gh pr merge` の無断実行）があれば `{"decision": "deny", "reason": "..."}`、それ以外は `{"decision": "allow"}` を stdout に出力。
   - `postToolHook.js`: stdin から `toolCall` を受け取り、`gh pr create` の成功を検知した場合に `loopState.setPrCreated(...)` を呼び出して状態を自動遷移。stdout に `{}` を出力。
2. **フック設定の配備 (`.agents/hooks.json`)**:
   - `Stop`, `PreToolUse`, `PostToolUse` を定義し、上記スクリプトを呼び出す設定を記述。
3. **単体テストの作成 (`tests/harness/hooks.test.ts`)**:
   - 各ハンドラーの入力 JSON に対する stdout JSON の出力および状態遷移を網羅検証。
4. **品質・整合性検証**:
   - `npm.cmd run check:fast` で 100% 合格確認。
   - `node scripts/docCheck.js` でドキュメント整合性確認。

## 3. 検証手順
- `vitest run tests/harness/hooks.test.ts` で全ケース PASS 確認。
- `npm.cmd run check:fast` で 100% 合格確認。
- 手動 stdin パイプによる各フックの挙動確認（Windows PowerShell）。
