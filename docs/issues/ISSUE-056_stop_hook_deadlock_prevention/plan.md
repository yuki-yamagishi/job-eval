# Issue #56 実装計画書 (Implementation Plan)

## 1. 概要
- サブエージェント非同期待機（Reactive Wakeup）中における親エージェントの Stop Hook デッドロックを防止。
- `stopHook.js` および `loopState.js` において、`hasActiveSubagents` コンテキストおよび `isSubagent` 実行環境のバイパス機構を実装。
- CWD の揺れに影響されない `loopState.js` の絶対パス解決（`.agents/.agents/` 誤ネストの根本対策）。
- `tests/harness/loopState.test.ts` および `tests/harness/hooks.test.ts` にテストケースを追加し、品質ゲートを通過。

## 2. 変更・新規作成ファイル一覧
1. `docs/issues/ISSUE-056_stop_hook_deadlock_prevention/pre_verification.md` [作成済]
2. `docs/issues/ISSUE-056_stop_hook_deadlock_prevention/plan.md` [本ファイル]
3. `docs/pre_phase_verification.md` [更新: Issue #56 へのポインタ]
4. `docs/implementation_plan.md` [更新: Issue #56 へのポインタ]
5. `scripts/harness/loopState.js` [更新: ルートパス解決不変化、`canStop({ hasActiveSubagents, isSubagent })` 対応、`activeSubagents` 状態プロパティ対応]
6. `scripts/harness/hooks/stopHook.js` [更新: `detectSubagentContext` と `detectActiveSubagents` ヘルパー実装、コンテキスト別 Stop 判定]
7. `tests/harness/loopState.test.ts` [更新: `canStop` のオプションテストおよび `activeSubagents` 遷移テストの追加]
8. `tests/harness/hooks.test.ts` [更新: サブエージェント待機中およびサブエージェント実行中の Stop テスト追加]
9. `docs/issues/ISSUE-056_stop_hook_deadlock_prevention/walkthrough.md` [初期版作成 -> 実装完了後更新]
10. `docs/walkthrough.md` [初期版更新 -> 実装完了後更新]

## 3. 実装詳細仕様

### (1) `scripts/harness/loopState.js`
- **パス解決の不変化**:
  - `const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');`
  - `DEFAULT_STATE_FILE = process.env.LOOP_STATE_FILE || path.resolve(ROOT_DIR, '.agents/state/loop_state.json');`
- **状態オブジェクトの拡張**:
  - `createInitialState()` に `activeSubagents: false` を追加。
- **`canStop(options = {})`**:
  - 引数: `{ hasActiveSubagents = false, isSubagent = false } = options`
  - 判定ロジック:
    1. `isSubagent === true` の場合:
       - `allowed: true`
       - `reason: 'Stop allowed: Execution is running inside a subagent context.'`
    2. `hasActiveSubagents === true` かつ `current.status` が `PR_CREATED` または `REVIEW_REQUESTED` の場合:
       - `allowed: true`
       - `reason: 'Stop allowed: Active subagent running in status "${current.status}". Parent agent is waiting for reactive wakeup notification.'`
    3. 通常判定:
       - `allowed = current.status === STATUS.IDLE || current.status === STATUS.RESOLVED_LGTM`
- **`setReviewRequested(options = {})`**:
  - `activeSubagents: Boolean(options.activeSubagents ?? true)` をセット。
- **`setReviewResult(result)`**:
  - `activeSubagents: false` をセット。
- **`setActiveSubagents(active = true)`**:
  - 明示的に `activeSubagents` を更新するメソッドを追加。

### (2) `scripts/harness/hooks/stopHook.js`
- **`detectSubagentContext(payload)`**:
  - `payload.isSubagent === true`
  - `payload.subagent === true`
  - `payload.agentRole` または `payload.agentType` に `'reviewer'` や `'subagent'` が含まれる
  - `payload.conversationType === 'subagent'`
  - 環境変数 `process.env.ANTIGRAVITY_SUBAGENT === 'true'`
  - 環境変数 `process.env.IS_SUBAGENT === 'true'`
  - 環境変数 `process.env.SUBAGENT_ROLE` が存在
- **`detectActiveSubagents(payload, stateMachine)`**:
  - `payload.hasActiveSubagents === true`
  - `payload.activeSubagents === true` または `typeof payload.activeSubagents === 'number' && payload.activeSubagents > 0`
  - `Array.isArray(payload.activeSubagents) && payload.activeSubagents.length > 0`
  - `Array.isArray(payload.subagents) && payload.subagents.length > 0`
  - `payload.waitingForSubagent === true`
  - `stateMachine.getState().activeSubagents === true`
  - 環境変数 `process.env.ACTIVE_SUBAGENTS === 'true'`
- **`handleStop(payload = {}, stateMachine = defaultStateMachine)`**:
  - 上記のヘルパーでフラグを取得し、`stateMachine.canStop({ hasActiveSubagents, isSubagent })` を呼び出し。
  - `decision: check.allowed ? 'allow' : 'continue'` を返却。

### (3) 単体テスト拡充
- `tests/harness/loopState.test.ts`:
  - `canStop({ hasActiveSubagents: true })` で `PR_CREATED` / `REVIEW_REQUESTED` 時に allow となること。
  - `canStop({ isSubagent: true })` で `NEEDS_FIX` 等でも allow となること。
  - `setReviewRequested` および `setReviewResult` での `activeSubagents` フラグの自動更新。
- `tests/harness/hooks.test.ts`:
  - `stopHook`:
    - payload に `hasActiveSubagents: true` がある場合の allow 判定。
    - payload に `isSubagent: true` がある場合の allow 判定。
    - 環境変数 `ANTIGRAVITY_SUBAGENT=true` 時の allow 判定。
    - `stateMachine` の `activeSubagents: true` 時の allow 判定。
    - 通常のブロッキング動作（未解決指摘あり、アクティブサブエージェントなし）の維持。

## 4. 検証手順
- `npm.cmd run test:run tests/harness/loopState.test.ts`
- `npm.cmd run test:run tests/harness/hooks.test.ts`
- `npm.cmd run check`（ワンショット総合品質ゲート）
