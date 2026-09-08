# Issue #56 4軸事前検証ログ (Pre-Phase Verification)

## 1. 4軸事前検証の観点

### ① 事前検証 / 技術的ボトルネック
- **Stop Hook の強制ターン継続による親エージェントのデッドロック防止**:
  - Antigravity の非同期サブエージェント（`invoke_subagent`）および Reactive Wakeup アーキテクチャでは、親エージェントはサブエージェント起動後にツール呼び出しを行わずターンを終了（Stop）して通知を待機する設計となっている。
  - しかし従来の `stopHook.js` は、`loopState.status` が `IDLE` または `RESOLVED_LGTM` に達していない場合、機械的に `{"decision": "continue"}` を返して停止を拒否していた。
  - これにより親エージェントは停止できず、不要な polling コマンドやタイマー設定を余儀なくされ、コンテキスト枯渇や進行停滞の原因となっていた。
  - **解決策**: `canStop` および `stopHook.js` に `hasActiveSubagents` 判定および `isSubagent` バイパス機構を導入し、アクティブなサブエージェントが存在する場合（または待機中である場合）は `{"decision": "allow"}` を返却して安全にターンを終了可能にする。
- **カレントディレクトリ依存による状態ファイルパスの破損防止**:
  - `loopState.js` のデフォルトパス定義が `path.resolve(process.cwd(), '.agents/state/loop_state.json')` となっていたため、サブエージェントやコマンドが `.agents/` 等のサブディレクトリで実行された場合に `.agents/.agents/state/loop_state.json` のような二重ネストが発生していた。
  - **解決策**: `import.meta.url` を基準にリポジトリルートを算出し、どのような CWD から呼び出されてもリポジトリ直下の `.agents/state/loop_state.json` を確実に参照・更新する不変パス解決へ改修する。

### ② UX / 開発者体験
- **人間およびエージェントの自律フロー調和**:
  - 親エージェントがサブエージェントを起動した直後、自然にターンを終了して待機状態（Idle / Sleeping）へ移行できるため、不要なログ出力や無駄なトークン消費を抑制。
  - サブエージェント側でも自身のタスク（レビュー・コメント投稿・単体テスト実行）完了時に親のループ状態に邪魔されず正常に終了できる。

### ③ データ永続性 / 互換性
- **状態管理マシンのスキーマ拡張と後方互換性**:
  - `loop_state.json` に `activeSubagents`（boolean または count）フィールドを追加するが、既存の `status`, `prNumber`, `issues` 等のスキーマとは 100% 後方互換を維持。
  - `setReviewRequested({ activeSubagents: true })`（デフォルト `true`）および `setReviewResult()` 時の `activeSubagents: false` 自動更新により、状態遷移とサブエージェント生存状態が常に整合する。

### ④ テスト自律性
- **単体テスト網羅率 100% 維持**:
  - `tests/harness/loopState.test.ts` に `canStop({ hasActiveSubagents, isSubagent })` および `activeSubagents` 状態遷移のテストケースを追加。
  - `tests/harness/hooks.test.ts` に、親エージェント待機時（`hasActiveSubagents: true`）の `decision: 'allow'` 判定、サブエージェント実行時（`isSubagent: true` / 環境変数）のバイパス判定、非アクティブ時の継続ブロック判定を網羅。
  - すべてのテストを Vitest によるモック・一時ファイルで安全に完結。
