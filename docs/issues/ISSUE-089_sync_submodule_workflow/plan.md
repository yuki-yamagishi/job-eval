# Issue #89 実装計画書: antigravity-review-loop プラグイン更新の自動検知・同期 GitHub Actions ワークフローの構築

## 1. 概要・設計方針
本計画は、Issue #89 に基づき、外部リポジトリ `yuki-yamagishi/antigravity-review-loop` で行われた修正（curl timeout guard や branch DoR validation 強化等）を自動で検知・検証し、JobEval に安全に取り込むための GitHub Actions ワークフローを定義・導入します。また、現在更新されているプラグインの最新修正（コミット `65aa8b9`）を JobEval 側へ取り込みます。

### 設計要件
1. **自動同期ワークフロー（`.github/workflows/sync-submodule.yml`）の新設**:
   - トリガー:
     - `repository_dispatch`: 外部リポジトリ push 通知（`antigravity-review-loop-updated`, `submodule-update`）
     - `schedule`: 毎日 UTC 0:00 (JST 9:00) 定期実行
     - `workflow_dispatch`: 手動実行
   - パーミッション: `contents: write`, `pull-requests: write`
   - Node 24 ネイティブ版 Action（`actions/checkout@v7`, `actions/setup-node@v7`）の採用
2. **安全性の物理強制（品質ゲート通過義務）**:
   - サブモジュールをリモート最新に更新後、差分が存在する場合のみ `npm ci` および `npm run check` を実行。
   - 万が一プラグイン更新に不整合や破壊的変更がある場合は、ワークフローが即時失敗し、壊れた PR 作成を防止。
3. **人間マージ専権の維持**:
   - 直接 main へ push せず、`chore/update-antigravity-review-loop` ブランチへ commit/push し Pull Request を発行。
   - 既存 PR が存在する場合は、同一ブランチへの上書き push により安全に PR を更新。
4. **最新コミットへの更新と ADR-0029 の策定**:
   - サブモジュールを最新コミット `65aa8b9` へ更新。
   - ADR-0029 を策定し、アーキテクチャ設計書を更新。

---

## 2. 変更対象ファイル一覧

| 区分 | ファイルパス | 変更内容 |
| :--- | :--- | :--- |
| **[NEW]** | `.github/workflows/sync-submodule.yml` | サブモジュール自動検知・品質ゲート検証・自動 PR 同期ワークフロー |
| **[MODIFY]** | `.agents/plugins/antigravity-review-loop` | サブモジュールポインタを最新コミット `65aa8b9` へ更新 |
| **[NEW]** | `docs/adr/0029-submodule-automated-sync-workflow.md` | サブモジュール自動同期ワークフローの設計決定記録 |
| **[MODIFY]** | `docs/adr/README.md` | ADR-0029 のインデックス登録 |
| **[MODIFY]** | `docs/architecture_overview.md` | 仕様正本への ADR-0029 統合および自動同期パイプライン仕様追加 |
| **[MODIFY]** | `docs/pre_phase_verification.md` | Issue #89 へのポインタ更新 |
| **[MODIFY]** | `docs/implementation_plan.md` | Issue #89 へのポインタ更新 |
| **[MODIFY]** | `docs/walkthrough.md` | Issue #89 へのポインタ更新 |
| **[NEW]** | `docs/issues/ISSUE-089_sync_submodule_workflow/walkthrough.md` | Issue #89 成果レポートの作成 |

---

## 3. 実装ステップ

### Step 1: `.github/workflows/sync-submodule.yml` の作成
- `repository_dispatch`, `schedule`, `workflow_dispatch` をトリガーに定義。
- `git submodule update --init --remote --merge` による更新。
- 差分チェック、`npm ci`、`npm run check` の実行。
- `gh pr create` による自動 PR 発行（既存 PR があれば更新）。

### Step 2: サブモジュールポインタの最新化
- `git submodule update --remote --merge .agents/plugins/antigravity-review-loop` により最新コミット `65aa8b9` へ更新。

### Step 3: ADR-0029 の策定および仕様正本の更新
- `docs/adr/0029-submodule-automated-sync-workflow.md` を作成。
- `docs/adr/README.md` および `docs/architecture_overview.md` を更新。

### Step 4: 4軸ドキュメントおよびルートポインタの更新
- `plan.md`, `walkthrough.md` を作成。
- `docs/implementation_plan.md`, `docs/pre_phase_verification.md`, `docs/walkthrough.md` を更新。

### Step 5: フル品質ゲート検証
- `npm.cmd run check`（シークレットスキャン、ドキュメント検査、型検査、単体テスト全件、プロダクションビルド）を実行。

---

## 4. 検証計画

### 4.1. 自動検証
- `npm.cmd run check` が 100% PASS すること。
- サブモジュール更新後の既存テストスイートおよびチェッカーがすべて合格すること。
- `.github/workflows/sync-submodule.yml` の YAML 構文が正常であること。
