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

2. **フラットなフックモジュール構成 (`.agents/hooks/`)**:
   - `safetyGuard.js` (54行): `safety-guard` フック実体
   - `branchDoRGate.js` (142行): `branch-dor-gate` フック実体
   - `prePrAuditGate.js` (138行): `pre-pr-audit-gate` フック実体
   - `postPrCreate.js` (88行): `PostToolUse` フック実体
   - `stopHook.js` (91行): `Stop` フック実体
   - 各フックは CLI からの直接実行（stdin/stdout JSON）と、関数インポートの両対応。

3. **ファサード（`preToolHook.js`, `postToolHook.js`）の完全撤廃とテストの直接追随**:
   - テストのためだけに残されていた中間ファサード（死にコード）および余計な `handlers/` サブ階層を完全撤廃。
   - `tests/harness/hooks.test.ts` および `tests/harness/e2eLoop.test.ts` は各フックモジュールを直接インポートして検証する構造へ健全に追従（検証アサーションは 100% 維持）。

4. **ADR-0021 の策定と SSOT 同期**:
   - `docs/adr/0021-lifecycle-hooks-modular-separation.md` を採択し、`docs/architecture_overview.md`（SSOT）を同期更新。

---

## 2. 変更ファイル一覧

| 区分 | ファイル | 説明 |
| :--- | :--- | :--- |
| **新規** | `.agents/hooks/safetyGuard.js` | ツール安全性ガードフック（フラット配置） |
| **新規** | `.agents/hooks/branchDoRGate.js` | ブランチ作成時 DoR ゲートフック（フラット配置） |
| **新規** | `.agents/hooks/prePrAuditGate.js` | PR作成前監査ゲートフック（フラット配置） |
| **新規** | `.agents/hooks/postPrCreate.js` | PR作成検知・状態遷移フック（フラット配置） |
| **削除** | `.agents/hooks/preToolHook.js` | 不要となった中間ファサードの完全撤廃 |
| **削除** | `.agents/hooks/postToolHook.js` | 不要となった中間ファサードの完全撤廃 |
| **変更** | `.agents/hooks.json` | 4 つの名前付きフックにスキーマ分割（フラットパス指定） |
| **変更** | `tests/harness/hooks.test.ts` | ファサード依存を撤廃し各フックを直接検証するテストへ再編（計 44 テスト） |
| **変更** | `tests/harness/e2eLoop.test.ts` | `postToolHook` 依存を `postPrCreate` に直接追随 |
| **新規** | `docs/adr/0021-lifecycle-hooks-modular-separation.md` | ADR-0021 設計決定記録 |
| **変更** | `docs/adr/README.md` | ADR 一覧テーブル更新 |
| **変更** | `docs/architecture_overview.md` | 仕様正本（SSOT）更新 |
| **新規** | `docs/issues/ISSUE-072_refactor_lifecycle_hooks_separation/` | 4軸ドキュメント（issue, pre_verification, plan, walkthrough） |

---

## 3. 検証結果

### 3.1. 単体テスト (Inner Loop)
- **コマンド**: `npm.cmd run test:run tests/harness/hooks.test.ts`
- **結果**: **44 passed (44)** (100% PASS - 各フックの単体テストおよび CLI 直接実行 stdin/stdout テスト含む)
- **コマンド**: `npm.cmd run test:run tests/harness/`
- **結果**: **108 passed (108)** (100% PASS)

### 3.2. フル品質ゲート (Outer Loop)
- **コマンド**: `npm.cmd run check`
- **結果**: **100% PASS**（後続のフル実行にて検証）

---

## 4. 設計上のトレードオフと境界設計 (Boundary Design)

### 4.1. issueDocChecker.js との二重管理解消見送り（自己完結優先）の理由
Issue #72 の着手当初は、Git Hook から呼ばれる `scripts/checkers/issueDocChecker.js` と `prePrAuditGate.js` のドキュメント検査ロジックを単一の共有モジュールへ統合することを検討していました。

しかし、次フェーズでの **「独立した GitHub プラグイン（`antigravity-loop-plugin`）への切り出し」** を見据えた場合、以下の重大なトレードオフが存在することが判明しました：
1. **依存関係の逆転・ポータビリティの喪失**:
   もし `.agents/hooks/prePrAuditGate.js` がプロジェクト固有の `scripts/checkers/` に依存してしまうと、プラグインを別リポジトリ（または `~/.gemini/config/plugins/`）へ切り出した際に、プロジェクト側の特定スクリプトが存在しなければ動かないという密結合が生じる。
2. **自己完結（Self-Containment）の優先**:
   AGY プラグインのベストプラクティスに基づき、`.agents/` 内のフック基盤はプロジェクトの `scripts/` や `src/` に一切依存しない自律完結構造（Zero External Dependencies）とすることを最優先した。

### 4.2. 中間ファサードの完全撤廃と公式フラット構造の採用理由
当初は既存テストコードの後方互換性を保つために `preToolHook.js` / `postToolHook.js` をファサードとして残し、`handlers/` サブフォルダを設けていました。

しかし、以下の観点から過剰構造（技術的負債の先送り）であると判断し、本 Issue の中でファサードを完全撤廃しました：
1. **死にコードの根絶**: `hooks.json` が直接フックモジュールを実行する以上、ファサードはテストのためだけに存在するデッドコードとなっていた。
2. **階層の非対称性の解消**: `stopHook.js` が直下にあり他が `handlers/` にあるという歪みを解消し、公式ドキュメント（`https://antigravity.google/docs/hooks/`）に最も素直な `.agents/hooks/` 直下のフラット構成に統一した。
3. **健全なテスト追随**: テストのアサーション内容（検証基準）を一切弱体化させることなく、テスト側のインポート先を新モジュールへ直接追随させた。

