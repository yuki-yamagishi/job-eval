# Issue #74: AGY公式仕様に準拠した自律レビューループ機構のプラグイン化パッケージング

## 1. 解決すべき課題・背景 (Problem Statement / Why)
- **現在の問題点**:
  - Issue #72 / PR #73 において、旧モノリシックフックを Antigravity（AGY）公式仕様（`https://antigravity.google/docs/hooks/`）に準拠したフラットかつ単一責任の個別フックへ分離した。
  - しかし現在、これらのフック（`hooks/`）、スキル（`skills/`）、ルール（`rules/`）、ステートマシン（`state/`）はプロジェクトルート直下の `.agents/` ディレクトリに平置きされており、Antigravity 公式のプラグイン機構（`https://antigravity.google/docs/plugins/`）に基づいたパッケージングが行われていない。
  - そのため、他プロジェクトへの再配布や Antigravity の自動プラグインディスカバリー（Workspace Level: `.agents/plugins/<plugin-name>/`）による名前空間カプセル化の恩恵を享受できていない。
- **放置した場合のリスク**:
  - `.agents/` 直下の平置き構造が肥大化し、プロジェクト固有の設定とレビューループ機構の関心が混在する。
  - Antigravity 2.0 のプラグインエコシステム標準から乖離し、将来の IDE / CLI アップデート時のプラグイン自動認識や管理コマンドとの互換性が損なわれる。
- **なぜ今解く必要があるのか**:
  - フックのリファクタリング（Issue #72）が完了し、各機能（フック、スキル、ルール）の境界が整理された直後である今こそ、公式プラグイン仕様へパッケージングする最適なタイミングである。

## 2. 期待される成果と価値 (Desired Outcome / Value)
- `.agents/plugins/antigravity-review-loop/` 配下に `plugin.json`, `hooks.json`, `hooks/`, `skills/`, `rules/`, `state/` を整然とカプセル化・パッケージングする。
- Antigravity 公式のプラグイン仕様に 100% 準拠し、ワークスペースレベルプラグインとして自動認識される。
- 単体テスト（`tests/harness/`）およびチェッカー（`scripts/checkers/`）が新プラグイン構造に追随し、既存のガードレール・品質ゲートが一切の回帰なく維持される。

## 3. 排除するリスク (Risks to Eliminate)
- **公式プラグイン仕様との不整合リスク**: 公式ドキュメントに定められた `plugin.json` マーカーおよびディレクトリ構造を逸脱し、ディスカバリーが失敗するリスクの排除。
- **パス解決破損によるガードレール不全リスク**: プラグイン配下への移設に伴い、フックの実行パス、ステートマシンの保存パス、テストコードの参照パスが壊れ、CI やガードレールが沈黙するリスクの排除。
- **パッチワーク・二重管理リスク**: `.agents/` 直下とプラグイン配下に重複してファイルが残り、修正が二重化・乖離する負債リスクの排除（旧配置から完全移設し、SSOT をプラグイン配下に統一）。

## 4. スコープの定義 (Scope & Boundaries)
- **スコープ内 (In-Scope)**:
  - `.agents/plugins/antigravity-review-loop/` の作成と `plugin.json` マニフェストの配備。
  - フック定義（`hooks.json`）およびフックスクリプト群（`hooks/`）のプラグイン内配置。
  - スキル定義（`skills/`）およびルール定義（`rules/`）のプラグイン内配置。
  - ステートマシン（`state/`）のプラグイン内統合。
  - テストコード（`tests/harness/*.test.ts`）およびチェッカー（`scripts/checkers/agentSkillChecker.js`）のパス参照追随。
  - 設計決定記録（`docs/adr/0022-antigravity-plugin-packaging.md`）の策定と仕様正本（`docs/architecture_overview.md`）の更新。
- **スコープ外 (Non-Goals)**:
  - フック内部の検証ロジックやステートマシンの状態遷移ロジック自体の改変（配置とパッケージングに集中）。
  - グローバルプラグイン（`~/.gemini/config/plugins/`）への公開・配布（本 Issue ではワークスペースプラグイン化に集中）。

## 5. 受け入れ基準 (Acceptance Criteria / Definition of Done)

### 5.1. PR作成前完了基準 (Pre-PR DoD)
- [x] `.agents/plugins/antigravity-review-loop/plugin.json` が公式仕様に準拠して作成されていること。
- [x] プラグイン配下に `hooks.json`, `hooks/`, `skills/`, `rules/`, `state/` が過不足なく配置されていること。
- [x] 重複・パッチワーク点検（Impact & Duplication Check）が `pre_verification.md` に完了・記録されていること。
- [x] 4軸ドキュメント（`issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md`）が揃っていること。
- [x] ADR-0022 が策定され、`docs/adr/README.md` および `docs/architecture_overview.md` と同期していること。
- [x] ハーネステスト（`tests/harness/`）がすべて成功し、フル品質ゲート（`npm.cmd run check`）が 100% PASS すること。

### 5.2. マージ前完了ゲート (Pre-Merge Gate)
- [ ] GitHub Actions CI が PASS していること。
- [ ] 2者合議レビュー（`fleet_reviewer` ＋ `fleet_completion_auditor`）による客観的再レビューで両者 LGTM を受領すること。
- [ ] 人間（ユーザー）による最終確認とマージが完了していること。

## 6. 関連ドキュメント・仕様正本 (References & SSOT)
- 事前検証記録: `docs/issues/ISSUE-074_antigravity_plugin_packaging/pre_verification.md`
- 関連 ADR: ADR-0022
- システム仕様書: `docs/architecture_overview.md`
- 公式プラグイン仕様: `https://antigravity.google/docs/plugins/`
