# Issue #60 作業計画書 (Implementation Plan)

## 1. 改修スコープと変更ファイル

### (1) `scripts/harness/parseReviewResult.js`
- `prefixRegex` をバッククォート装飾対応に拡張。
- 79行目の無差別スキップ判定（`line.includes('`[must]`')` 等）を削除し、凡例セクション内または凡例定義行に限定。

### (2) `scripts/harness/hooks/preToolHook.js`
- `/\bnpm(?:\.cmd)?\s+(?:run\s+)?test\b/i` に拡張し、`npm.cmd test` を確実にブロック。

### (3) `scripts/harness/hooks/postToolHook.js`
- コマンドライン文字列からの Issue 番号抽出（`closes #46` 等）による PR 番号誤認フォールバックを削除。

### (4) `scripts/harness/loopState.js`
- `canStop` の拒否理由メッセージに緊急脱出コマンド案内（`node scripts/harness/loopState.js reset`）を追加。

### (5) `.agents/subagents/fleet-reviewer/SYSTEM_PROMPT.md`
- Fleet サブエージェントの最小権限（読み取り専用・レビューMarkdown作成）と親エージェントによる PR コメント公式投稿の責務分担を同期。

### (6) `AGENTS.md` & `.agents/skills/job-eval-harness/SKILL.md`
- Fleet レビュー実行フローおよび緊急脱出プロトコル（`loopState.js reset`）を同期更新。

### (7) テストコード (`tests/harness/`)
- `tests/harness/parseReviewResult.test.ts`: バッククォート囲み指摘の抽出テスト。
- `tests/harness/hooks.test.ts`: `npm.cmd test` の deny 判定および `stopHook` のエスケープ案内文言テスト。

## 2. 実装 & 検証ステップ
1. コアスクリプト（`parseReviewResult.js`, `preToolHook.js`, `postToolHook.js`, `loopState.js`）の改修
2. テストコードの拡充と `npm.cmd run test:run tests/harness` による単体検証
3. プロンプトおよび規約ドキュメントの更新
4. `npm.cmd run check` によるフル品質ゲート検証
5. `walkthrough.md` の作成とルートポインタの更新
