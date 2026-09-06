# Issue #44: 品質ゲートの階層化と手動フルチェック二重実行の排除

## 1. 開発の背景と課題 (Problem Statement)
- [ADR-0016 (ループエンジニアリング確立に向けた開発ハーネスの 6 段階リファクタリング)](../../adr/0016-loop-engineering-harness-refactoring.md) の Step 1 に位置付けられるタスク。
- エージェントがコード修正後、コミット前やプッシュ前に手動でフル品質ゲート（`npm run check`）を重複実行している。
- `npm run check` は、シークレットスキャン、ドキュメント検査、TypeScript 型検査、全単体テスト＋カバレッジ計測、Vite プロダクションビルドを一括で実行するため、1回あたり約 15 秒を要する。
- プッシュ時には `.githooks/pre-push` フックによって同一の `npm run check` が自動実行されるため、プッシュ直前の手動実行は完全な二重実行となっている。
- 今後の自己修復ループ（Issue #45〜#49）において、1行の軽微な修正のたびに毎回 15 秒のフルゲートを回すと、ループのターンあたり待ち時間が巨大なボトルネックとなる。

## 2. 実装要件 (Requirements)
1. **`package.json` への軽量高速検証コマンド追加**:
   - `check:fast`: `tsc --noEmit && vitest run`（型検査と単体テストのみを実行）。
   - カバレッジレポート生成や Vite ビルドをスキップし、所要時間を 2〜3 秒に短縮する。
2. **手動二重実行の運用撤廃**:
   - リモートプッシュ時の品質担保は `pre-push` フック（`npm run check`）に一元化し、エージェントが手動でフルゲートを二重実行する運用を廃止する。
   - ループ中の反復検証には `npm run check:fast` を使用する。

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] `package.json` に `check:fast` スクリプトが追加されていること。
- [ ] `npm.cmd run check:fast` が単体テストと型検査のみを正常・高速に実行できること。
- [ ] 既存の `npm.cmd run check` および Git フック（`pre-commit`, `pre-push`）が正常に機能すること。
- [ ] `scripts/docCheck.js`（ドキュメント検査）が全件 PASS すること。
