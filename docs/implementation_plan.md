# 実装計画書 (Implementation Plan)

> [!NOTE]
> 本ファイルは最新の進行中フェーズの計画書を保持します。
> 過去のフェーズ（Phase 4〜33, Issue #40, #42, #44, #45, #46, #47, #48, #49, #50, #56等）は docs/issues/ および docs/archive/phases/ に個別に保全されています。

## 現在進行中: Issue #60 (自己修復ループの信頼性向上（バッククォート接頭辞パース、npm.cmdウォッチ防止、Fleet権限整合、緊急脱出案内）)
詳細は [docs/issues/ISSUE-060_harness_reliability_improvements/plan.md](./issues/ISSUE-060_harness_reliability_improvements/plan.md) を参照。

### 実装計画サマリー
1. **`parseReviewResult.js` のバッククォート対応**: バッククォート囲み（``- `[must]`: ○○``）指摘の抽出対応と凡例誤判定の根絶。
2. **`preToolHook.js` の `npm.cmd` 対応**: `/\bnpm(?:\.cmd)?\s+(?:run\s+)?test\b/i` 拡張によるウォッチモードハング防止。
3. **`postToolHook.js` の PR 番号解決安全性向上**: コマンドラインからの Issue 番号誤抽出フォールバックを排除。
4. **`stopHook.js` / `loopState.js` の緊急脱出案内**: 停止拒否メッセージに `node scripts/harness/loopState.js reset` を明記。
5. **Fleet レビュアーの最小権限と実行責務の整合化**: Fleet サブエージェントは読み取り専用でレビュー結果を出力し、PR 公式投稿は親エージェントが行うクリーンな責務分離。
6. **単体テスト拡充**: `tests/harness/` の単体テスト拡充と全品質ゲート通過。
