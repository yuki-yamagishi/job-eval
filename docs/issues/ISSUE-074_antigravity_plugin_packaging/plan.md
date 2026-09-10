# Issue #74: 実装計画書 (Implementation Plan)

## 1. 概要
自律レビューループ機構（Hooks, Skills, Rules, State Machine）を、Antigravity（AGY）公式プラグイン仕様（`https://antigravity.google/docs/plugins/`）に準拠したワークスペースレベルプラグイン（`.agents/plugins/antigravity-review-loop/`）としてパッケージングする。

## 2. 変更対象ファイル一覧

### 新規作成
- `.agents/plugins/antigravity-review-loop/plugin.json`: プラグイン必須マーカーマニフェスト
- `docs/adr/0022-antigravity-plugin-packaging.md`: プラグイン化パッケージングの設計決定記録

### 移動・再配置
- `.agents/hooks.json` ➔ `.agents/plugins/antigravity-review-loop/hooks.json`
- `.agents/hooks/` ➔ `.agents/plugins/antigravity-review-loop/hooks/`
- `.agents/skills/` ➔ `.agents/plugins/antigravity-review-loop/skills/`
- `.agents/rules/` ➔ `.agents/plugins/antigravity-review-loop/rules/`
- `.agents/state/` ➔ `.agents/plugins/antigravity-review-loop/state/`

### 更新対象
- `scripts/checkers/agentSkillChecker.js`: スキル配置パスの更新
- `tests/harness/hooks.test.ts`: インポート・テスト実行パスの更新
- `tests/harness/e2eLoop.test.ts`: インポート・テスト実行パスの更新
- `tests/harness/loopState.test.ts`: インポート・テスト実行パスの更新
- `tests/harness/parseReviewResult.test.ts`: インポート・テスト実行パスの更新
- `tests/harness/postPrComment.test.ts`: インポート・テスト実行パスの更新
- `tests/harness/resolveReview.test.ts`: インポート・テスト実行パスの更新
- `docs/adr/README.md`: ADR-0022 の追加
- `docs/architecture_overview.md`: システム仕様正本（SSOT）の更新
- `docs/pre_phase_verification.md`, `docs/implementation_plan.md`, `docs/walkthrough.md`: ルートポインタの更新

## 3. 実装手順
1. **GitHub Issue #74 の作成**:
   - `gh issue create` で本 Issue を登録。
2. **トピックブランチの作成**:
   - `git checkout -b feature/issue-74-antigravity-plugin-packaging` を実行（`branchDoRGate.js` の DoR ゲート検証）。
3. **プラグインディレクトリ・マニフェストの作成**:
   - `.agents/plugins/antigravity-review-loop/plugin.json` を配備。
4. **コンポーネントの移設**:
   - `hooks.json`, `hooks/`, `skills/`, `rules/`, `state/` を新プラグイン配下へ移設。
   - ※各フック内の相対パス解決（`path.resolve` や `projectRoot` 解決）がプラグイン構造下でも正しく動作することを確認。
5. **テスト & チェッカーの追随更新**:
   - `tests/harness/` 配下の全テストファイルのインポートパスを新プラグイン配下に更新。
   - `scripts/checkers/agentSkillChecker.js` を更新。
6. **Inner Loop 高速テスト確認**:
   - `npm.cmd run test:fast` でテストが全件 PASS することを確認。
7. **ADR-0022 および仕様正本ドキュメントの更新**:
   - `docs/adr/0022-antigravity-plugin-packaging.md` を作成。
   - `docs/adr/README.md` と `docs/architecture_overview.md` を更新。
8. **成果ドキュメント（walkthrough.md）の作成 & Pre-PR DoD チェック**:
   - `docs/issues/ISSUE-074_antigravity_plugin_packaging/walkthrough.md` を作成。
   - `issue.md` の Pre-PR DoD チェックボックスをすべて `[x]` に更新。
9. **Outer Loop フル品質ゲート確認**:
   - `npm.cmd run check` で 100% PASS を確認。
10. **コミット・プッシュ & PR 作成**:
    - コミット、リモートプッシュ、`gh pr create` を実行。
11. **リモート CI 待機 & Fleet 2者合議レビュー受領**:
    - CI 完了確認後、`fleet_reviewer` と `fleet_completion_auditor` を並行起動し合議 LGTM を受領。
12. **人間（ユーザー）へのマージ依頼**:
    - ユーザーに報告してマージを依頼。
