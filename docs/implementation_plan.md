# 実装計画書 (Implementation Plan)

> [!NOTE]
> 本ファイルは最新の進行中フェーズの計画書を保持します。
> 過去のフェーズ（Phase 4〜33, Issue #40, #42, #50等）は docs/issues/ および docs/archive/phases/ に個別に保全されています。

## 現在進行中: Issue #44 (品質ゲートの階層化と手動フルチェック二重実行の排除)
詳細は [docs/issues/ISSUE-044_quality_gate_layering_and_fast_check/plan.md](./issues/ISSUE-044_quality_gate_layering_and_fast_check/plan.md) を参照。

### 実装計画サマリー
1. **変更ファイル**: `package.json` に `"check:fast": "tsc --noEmit && vitest run"` を追加。
2. **手動二重実行の撤廃**: プッシュ前の手動 `npm run check` 重複を廃止し、`pre-push` フックに委ねる。
3. **検証**: `npm.cmd run check:fast` の実行速度および `npm.cmd run check` 全ゲートパスの確認。
