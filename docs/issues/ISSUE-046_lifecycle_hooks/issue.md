# Issue #46: ライフサイクルフック（hooks.json）による機械的インターセプトの配備

## 1. 開発の背景と課題 (Problem Statement)
- [ADR-0016 (ループエンジニアリング確立に向けた開発ハーネスの 6 段階リファクタリング)](../../adr/0016-loop-engineering-harness-refactoring.md) の Step 3 に位置付けられるタスク。
- エージェントが「PR を作成したから一旦ユーザーに報告しよう」と早期終了（サボり）するのを防ぐため、Antigravity のライフサイクルフック（`.agents/hooks.json`）を導入する。
- Issue #45 で作成した状態管理マシンと連携し、自己修復ループが `RESOLVED_LGTM` に達していない段階でのエージェント終了を機械的に阻止する。

## 2. 実装要件 (Requirements)
1. **`.agents/hooks.json` の作成**:
   - `PostToolUse` (matcher: `run_command`): `gh pr create` の成功を検知し、`loopState.js` で `PR_CREATED` へ自動遷移。
   - `Stop`: エージェントが作業を終えようとした際、`loopState.canStop()` を呼び出し、false なら `{"decision": "continue", "reason": "PR の指摘が未解消です。自己修復を完了してください"}` で停止を拒否。
   - `PreToolUse` (matcher: `run_command`): ループ中の禁止コマンド（`gh pr merge` の勝手な実行やウォッチモード `npm test`）をブロック。
2. **フック実行スクリプトの実装 (`scripts/harness/hooks/`)**:
   - stdin/stdout JSON プロトコルに準拠した薄いハンドラー群の実装。

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] PR 作成後にエージェントが停止を試みた際、`Stop` フックにより停止が拒否されループが継続すること。
- [ ] `RESOLVED_LGTM` に達した状態では、正常に停止が許可されること。
