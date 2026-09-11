# Issue #78: 実装計画書 (Implementation Plan)

## 1. 概要 (Overview)
`antigravity-review-loop` プラグインを、JobEval リポジトリ内の直埋め込みから、GitHub 上の独立リポジトリ（`https://github.com/yuki-yamagishi/antigravity-review-loop.git`）を参照する Git Submodule 構成へと移行する。

## 2. タスク一覧 (Tasks)

### Task 1: 既存プラグインの Git 管理解除と Git Submodule の追加
- [ ] 既存の `.agents/plugins/antigravity-review-loop` ディレクトリのファイルを Git のインデックスから削除（`git rm -r .agents/plugins/antigravity-review-loop`）。
- [ ] `git submodule add https://github.com/yuki-yamagishi/antigravity-review-loop.git .agents/plugins/antigravity-review-loop` を実行して `.gitmodules` を作成・登録。
- [ ] `git submodule status` でコミットハッシュが正常に認識されていることを確認。

### Task 2: CI ワークフローの更新
- [ ] `.github/workflows/ci.yml` の `actions/checkout@v4` に `submodules: true` を追加。

### Task 3: ドキュメントおよび ADR の策定・同期
- [ ] `docs/adr/0024-external-plugin-submodule.md` を作成（Git Submodule 移行の決定事項と運用規約）。
- [ ] `docs/adr/README.md` に ADR-0024 を追記（`adrChecker.js` 準拠）。
- [ ] `docs/architecture_overview.md`（SSOT）に ADR-0024 の反映およびプラグイン管理方針の更新を記載。

### Task 4: 品質ゲートおよびハーネステスト検証
- [ ] `npm.cmd run check:fast`（型検査）の PASS を確認。
- [ ] `npm.cmd run test:run -- tests/harness`（全ハーネステスト 113 件）の PASS を確認。
- [ ] `npm.cmd run check`（シークレット、ドキュメント、型、全単体テスト、ビルド）の 100% PASS を確認。

### Task 5: PR 作成と Fleet 合議レビュー受領
- [ ] `docs/issues/ISSUE-078_external_plugin_submodule/walkthrough.md` を作成。
- [ ] PR を作成し、Fleet レビュー（`fleet_reviewer` & `fleet_completion_auditor`）を受領。
- [ ] ユーザーへのマージ依頼。

## 3. リスク管理・ロールバック方針
- 移行中に問題が生じた場合は、ブランチを破棄して main の状態（直埋め込み）に戻すことが可能。
