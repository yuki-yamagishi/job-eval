# Issue #72: 実装計画書 (Implementation Plan)

## 1. 概要
AGY 公式仕様（`https://antigravity.google/docs/hooks/`）に準拠し、`preToolHook.js` および `hooks.json` を目的別の 4 つの独立したライフサイクルフック／ハンドラーに責務分割（リファクタリング）する。

## 2. 変更対象ファイル一覧

| 区分 | ファイルパス | 変更概要 |
| :--- | :--- | :--- |
| **新規** | `.agents/hooks/safetyGuard.js` | ツール安全ガードフック（フラット配置） |
| **新規** | `.agents/hooks/branchDoRGate.js` | 着手品質ゲートフック（フラット配置） |
| **新規** | `.agents/hooks/prePrAuditGate.js` | 提出品質ゲートフック（フラット配置） |
| **新規** | `.agents/hooks/postPrCreate.js` | PR作成検知・状態遷移フック（フラット配置） |
| **削除** | `.agents/hooks/preToolHook.js` | 中間ファサードの完全撤廃 |
| **削除** | `.agents/hooks/postToolHook.js` | 中間ファサードの完全撤廃 |
| **変更** | `.agents/hooks.json` | 4 つの名前付きフック（フラットパス指定）に分割 |
| **変更** | `tests/harness/hooks.test.ts` | 新フックモジュールを直接検証するテストへ再編 |
| **変更** | `tests/harness/e2eLoop.test.ts` | `postToolHook` 依存を `postPrCreate` に直接追随 |
| **新規** | `docs/adr/0021-lifecycle-hooks-modular-separation.md` | フック責務分離とフラット構造採用の設計決定記録 |
| **変更** | `docs/architecture_overview.md` | ADR-0021 の反映・同期 |

## 3. 実装手順

### Step 1: フラットなフックモジュールの実装 (Inner Loop TDD)
- `.agents/hooks/` 直下に `safetyGuard.js`, `branchDoRGate.js`, `prePrAuditGate.js`, `postPrCreate.js` を実装。
- 各フックは単体で CLI 実行（`node ...`）および関数インポートの両対応とする。

### Step 2: ファサードの完全撤廃とテスト追随
- `preToolHook.js`, `postToolHook.js` を削除。
- `tests/harness/hooks.test.ts` および `tests/harness/e2eLoop.test.ts` を各フック直接検証へ健全に追従。

### Step 3: `hooks.json` のスキーマ更新
- 名前付きフックとして 4 つに分割。

### Step 4: ADR-0021 の作成と SSOT 同期
- 設計決定記録を作成し、`docs/architecture_overview.md` と `docs/adr/README.md` を更新。

### Step 5: 検証
- `npm.cmd run test:run tests/harness/hooks.test.ts`
- `npm.cmd run check`（フル品質ゲート 100% PASS）
