# Issue #72: 実装計画書 (Implementation Plan)

## 1. 概要
AGY 公式仕様（`https://antigravity.google/docs/hooks/`）に準拠し、`preToolHook.js` および `hooks.json` を目的別の 4 つの独立したライフサイクルフック／ハンドラーに責務分割（リファクタリング）する。

## 2. 変更対象ファイル一覧

| 区分 | ファイルパス | 変更概要 |
| :--- | :--- | :--- |
| **新規** | `.agents/hooks/handlers/safetyGuard.js` | ツール安全ガード（`gh pr merge` 禁止、インタラクティブテスト抑止） |
| **新規** | `.agents/hooks/handlers/branchDoRGate.js` | 着手品質ゲート（ブランチ作成前のワーキングツリー、LoopState、Why/Risk、重複点検） |
| **新規** | `.agents/hooks/handlers/prePrAuditGate.js` | 提出品質ゲート（PR作成前の4軸書類、DoDチェック、SSOT/ADR同期） |
| **新規** | `.agents/hooks/handlers/postPrCreate.js` | PR作成検知とステートマシン自動遷移 |
| **変更** | `.agents/hooks/preToolHook.js` | ハンドラー群を束ねるファサード化（後方互換性維持） |
| **変更** | `.agents/hooks.json` | 4 つの名前付きフック（`safety-guard`, `branch-dor-gate`, `pre-pr-audit-gate`, `review-loop-guard`）に分割 |
| **変更** | `tests/harness/hooks.test.ts` | 分割ハンドラー単体のテスト追加および総合フックの互換性検証 |
| **新規** | `docs/adr/0021-lifecycle-hooks-modular-separation.md` | フック責務分離とAGY公式準拠の設計決定記録 |
| **変更** | `docs/architecture_overview.md` | ADR-0021 の反映・同期 |

## 3. 実装手順

### Step 1: ハンドラーモジュールの実装 (Inner Loop TDD)
- `.agents/hooks/handlers/` を作成。
- `safetyGuard.js`, `branchDoRGate.js`, `prePrAuditGate.js`, `postPrCreate.js` を実装。
- 各ハンドラーは単体で CLI 実行（`node ...`）および関数インポートの両対応とする。

### Step 2: `preToolHook.js` のリファクタリング
- `handlePreTool` を各ハンドラーのパイプラインとして再構築。
- 既存テストとの 100% 互換性を維持。

### Step 3: `hooks.json` のスキーマ更新
- 名前付きフックとして 4 つに分割。

### Step 4: ADR-0021 の作成と SSOT 同期
- 設計決定記録を作成し、`docs/architecture_overview.md` と `docs/adr/README.md` を更新。

### Step 5: 検証
- `npm.cmd run test:run tests/harness/hooks.test.ts`
- `npm.cmd run check`（フル品質ゲート 100% PASS）
