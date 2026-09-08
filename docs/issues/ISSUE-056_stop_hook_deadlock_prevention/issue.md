# Issue #56: サブエージェント非同期待機中における Stop Hook デッドロック防止とコンテキスト別判定の実装

## 1. 開発の背景と課題 (Problem Statement)
- Issue #46 で導入したライフサイクルフック（`.agents/hooks.json` の `stopHook.js`）は、自己修復ループが `RESOLVED_LGTM` または `IDLE` に達していない場合、エージェントの停止（ターン終了）を強制的に拒否（`{"decision": "continue"}`）する。
- しかし、Issue #47 の Fleet レビュー実行において以下の2つの問題が発生し、無限ループ（デッドロック）になりかける事象が確認された：
  1. **親エージェントの待機拒否**: `invoke_subagent` により Fleet レビュアーを非同期起動した後、親エージェントは Reactive Wakeup によるサブエージェント完了通知を待つためにターンを終了（Stop）する必要があるが、`loopState` が `PR_CREATED` / `REVIEW_REQUESTED` であるため停止が拒否され、不要なツール呼び出し（polling や schedule）を強制される。
  2. **サブエージェント環境での二重インターセプト**: 同一ワークスペースを共有するサブエージェント（Fleet）側でも `stopHook` が発動し、バックグラウンドコマンド（`npm.cmd run check` 等）の待機時に停止をブロックされる。

## 2. 実装要件 (Requirements)
1. **サブエージェント非同期待機中の Stop 許容判定**:
   - `stopHook.js` において、`loopState.status` が `PR_CREATED` または `REVIEW_REQUESTED` であっても、アクティブなサブエージェント（Fleet レビュアー等）が存在している場合は、親エージェントが完了通知を待つための停止を **`{"decision": "allow"}`** とする。
2. **サブエージェント実行環境のコンテキスト識別とバイパス**:
   - サブエージェント側で実行されている場合（環境変数や実行コンテキスト情報、プロセス等から判定可能にする）、またはサブエージェント自身が一時的に待機するための Stop を適切にバイパスまたは許容する。
3. **`stopHook.js` および `loopState.js` の改修と単体テスト拡充**:
   - `canStop` のコンテキスト引数対応（例: `hasActiveSubagents` オプション）。
   - `tests/harness/hooks.test.ts` に、サブエージェント待機中シナリオのテストケースを追加。

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] `invoke_subagent` 起動後、親エージェントが安全に Reactive Wakeup 待機（Stop）できること。
- [ ] サブエージェント側でバックグラウンドタスク待機時の Stop が誤ってブロックされないこと。
- [ ] すべてのテストがパスし、`npm.cmd run check` を通過すること。
