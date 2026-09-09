# Issue #72: 実装成果レポート (Walkthrough)

## 1. 成果概要
AGY（Antigravity）公式仕様（`https://antigravity.google/docs/hooks/`）に準拠し、ライフサイクルフック基盤を目的別の 4 つの名前付きフックおよび独立ハンドラーに責務分割（リファクタリング）しました。
既存の包括的単体テスト（`tests/harness/hooks.test.ts`）に各ハンドラー単体のテストケースを追加し、全 44 テストおよび Harness スイート全 108 テストが 100% PASS することを確認しました。

### 主要な改善点
1. **AGY 公式仕様準拠の名前付きフック分割 (`.agents/hooks.json`)**:
   - `safety-guard`: ツール安全性（`gh pr merge` 直接実行禁止、インタラクティブテスト抑止）。
   - `branch-dor-gate`: トピックブランチ作成時 DoR（ワーキングツリー、LoopState、Why/Risk、重複点検）。
   - `pre-pr-audit-gate`: PR作成時提出前監査（4軸書類完備、DoDチェック、SSOT/ADR同期）。
   - `review-loop-guard`: 自律レビューループ進行と停止ガード（PR作成検知、`Stop` フック）。
   - ➔ これにより、AGY 標準の `"enabled": false` による個別無効化機能が完全に利用可能になった。

2. **単一責任の原則に基づくハンドラーモジュール化 (`.agents/hooks/handlers/`)**:
   - `safetyGuard.js` (60行)
   - `branchDoRGate.js` (124行)
   - `prePrAuditGate.js` (118行)
   - `postPrCreate.js` (88行)
   - 各ハンドラーは CLI からの直接実行（stdin/stdout JSON）と、関数インポートの両対応。

3. **100% 後方互換性ファサード (`preToolHook.js`, `postToolHook.js`)**:
   - 既存の `handlePreTool(payload, options)` および `handlePostTool(payload, stateMachine)` を維持し、内部で各ハンドラーを合成実行する構成へリファクタリング。
   - 既存テストコードを一切変更することなく、完全な互換性を保証。

4. **ADR-0021 の策定と SSOT 同期**:
   - `docs/adr/0021-lifecycle-hooks-modular-separation.md` を新設し、`docs/architecture_overview.md`（SSOT）を更新。

---

## 2. 変更ファイル一覧

| 区分 | ファイル | 説明 |
| :--- | :--- | :--- |
| **新規** | `.agents/hooks/handlers/safetyGuard.js` | ツール安全性ガードハンドラー |
| **新規** | `.agents/hooks/handlers/branchDoRGate.js` | ブランチ作成時 DoR ゲートハンドラー |
| **新規** | `.agents/hooks/handlers/prePrAuditGate.js` | PR作成前監査ゲートハンドラー |
| **新規** | `.agents/hooks/handlers/postPrCreate.js` | PR作成検知・状態遷移ハンドラー |
| **変更** | `.agents/hooks/preToolHook.js` | 各ハンドラーを束ねるファサードへリファクタリング |
| **変更** | `.agents/hooks/postToolHook.js` | `postPrCreate` へ委譲するファサードへリファクタリング |
| **変更** | `.agents/hooks.json` | 4 つの名前付きフックにスキーマ分割 |
| **変更** | `tests/harness/hooks.test.ts` | 新ハンドラーの単体テスト追加（計 44 テスト） |
| **新規** | `docs/adr/0021-lifecycle-hooks-modular-separation.md` | ADR-0021 設計決定記録 |
| **変更** | `docs/adr/README.md` | ADR 一覧テーブル更新 |
| **変更** | `docs/architecture_overview.md` | 仕様正本（SSOT）更新 |
| **新規** | `docs/issues/ISSUE-072_refactor_lifecycle_hooks_separation/` | 4軸ドキュメント（issue, pre_verification, plan, walkthrough） |

---

## 3. 検証結果

### 3.1. 単体テスト (Inner Loop)
- **コマンド**: `npm.cmd run test:run tests/harness/hooks.test.ts`
- **結果**: **44 passed (44)** (100% PASS)
- **コマンド**: `npm.cmd run test:run tests/harness/`
- **結果**: **108 passed (108)** (100% PASS)

### 3.2. フル品質ゲート (Outer Loop)
- **コマンド**: `npm.cmd run check`
- **結果**: 次ステップで検証（シークレットスキャン、ドキュメント完全性、型検査、全単体テスト & カバレッジ、本番ビルド）
