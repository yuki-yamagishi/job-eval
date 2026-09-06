# Issue #44: 実装計画書 (Implementation Plan)

## 1. 変更ファイル一覧
- `package.json`: `scripts` に `"check:fast": "tsc --noEmit && vitest run"` を追加
- `docs/pre_phase_verification.md`: Issue #44 へのポインタ更新
- `docs/implementation_plan.md`: Issue #44 へのポインタ更新
- `docs/walkthrough.md`: Issue #44 へのポインタ更新

## 2. 実装手順
1. `package.json` の `scripts` オブジェクトを修正し、`"check:fast"` を登録する。
2. Windows PowerShell 環境において `npm.cmd run check:fast` を実行し、高速に正常終了することを確認する。
3. 既存の `npm.cmd run check` を実行し、既存の全品質ゲートが依然として 100% 合格することを確認する。
4. `scripts/docCheck.js` を実行し、ドキュメント整合性が保たれていることを確認する。

## 3. 検証手順
- `npm.cmd run check:fast` の実行ログと所要時間の計測（2〜3秒で終了すること）。
- `npm.cmd run check` の実行とパス確認。
