# Issue #89: antigravity-review-loop プラグイン更新の自動検知・同期 GitHub Actions ワークフローの構築

## 1. 解決すべき課題・背景 (Why)
- **現在の問題点**:
  - ADR-0024 において、自律レビューループ機構を外部リポジトリ（`yuki-yamagishi/antigravity-review-loop`）に分離し、JobEval には Git Submodule として取り込む構成へ移行した。
  - しかし、プラグイン側で安全装置（curl timeout guard や branch DoR 検査強化等）の改修が行われた際、JobEval 側で開発者が手動でサブモジュールを fetch・merge・コミット・PR 作成しない限り最新版が反映されない。
  - そのため、プラグインの機能向上やバグ修正が JobEval に即時反映されず、反映漏れや古いフックの長期残存が発生している。
- **放置した場合のリスク**:
  - プラグイン側で修正された潜在的デッドロックやセキュリティ改善が JobEval に適用されず、古い動作規則のままレビューやガードレールが稼働し続ける。
  - 手動更新の手間により更新頻度が低下し、親プロジェクトとプラグインの乖離が拡大する。
- **なぜ今解く必要があるのか**:
  - `antigravity-review-loop` にて Issue #1（安全ガード・branch DoR 強化）の PR #2 がマージされた。
  - 今後も継続的にプラグインが改善されるため、更新の即時自動同期パイプラインを物理的に整備し、人的運用への依存を排除するメカニズム（Mechanisms over good intentions）を構築する必要がある。

## 2. 期待される成果と価値 (Desired Outcome / Value)
- `antigravity-review-loop` の更新が自動で検知され、JobEval 側で全自動で同期検証・PR 作成される。
- 同期時には必ず `npm run check`（シークレットスキャン、ドキュメント検査、型検査、単体テスト、本番ビルド）の品質ゲートを通過させ、壊れた変更の混入を物理遮断する。
- 自動マージは行わず PR を作成することで、人間（ユーザー）による最終確認・マージ専権を完全に維持する。

## 3. 排除するリスク (Risks to Eliminate)
- **古いプラグインの長期残存リスク**:
  - プラグイン側の更新をイベント（`repository_dispatch`）、定期スケジュール（`schedule` cron）、手動（`workflow_dispatch`）の 3 重のトリガーで検知し、常に最新の安全機構を維持する。
- **未検証更新の混入・親プロジェクト破壊リスク**:
  - サブモジュール更新後に必ず `npm ci` および `npm run check` を実行し、合格した場合にのみ PR を作成することで、ビルド破損や型エラーの混入を物理的に阻止する。
- **人間承認なしの main 直接変更リスク (セルフマージ禁止)**:
  - 直接 main へ push することは一切行わず、更新専用トピックブランチを作成して Pull Request を発行する運用に限定する。人間が差分と CI 結果を確認してマージするガバナンスを遵守する。

## 4. スコープの定義 (Scope & Boundaries)
- **スコープ内 (In-Scope)**:
  - `.github/workflows/sync-submodule.yml` の設計・実装。
  - トリガーの多重化（`repository_dispatch`, `schedule`, `workflow_dispatch`）。
  - サブモジュール更新、差分検出、品質ゲート検証（`npm run check`）、自動 PR 作成処理の実装。
  - 現在の最新プラグインコミット（`65aa8b9`）の JobEval への取り込み。
  - ADR-0029 の策定およびアーキテクチャ設計書の更新。
- **スコープ外 (Non-Goals)**:
  - PR の自動マージ（人間専権原則により人間がマージする）。
  - プラグイン内部ロジック自体の変更（プラグイン側リポジトリで実施済み）。

## 5. 受け入れ基準 (Acceptance Criteria / Definition of Done)

### 5.1. 機能受け入れシナリオ (Feature-specific Acceptance Criteria: Given-When-Then)
- **シナリオ 1: サブモジュール更新の検知と自動 PR 作成（正常系）**
  - **Given (前提)**: `yuki-yamagishi/antigravity-review-loop` のリモート main に新規コミットが存在し、JobEval のコミットポインタと差分がある。
  - **When (操作・入力)**: `.github/workflows/sync-submodule.yml` がトリガー（dispatch または schedule）される。
  - **Then (期待結果)**: サブモジュールがリモート最新に更新され、`npm run check` が実行されて全項目 PASS し、ブランチ `chore/update-antigravity-review-loop` が作成されて Pull Request が発行される。
- **シナリオ 2: サブモジュールが既に最新の場合の早期終了（差分なし）**
  - **Given (前提)**: JobEval のサブモジュールポインタがリモート最新と完全に一致している。
  - **When (操作・入力)**: `.github/workflows/sync-submodule.yml` が実行される。
  - **Then (期待結果)**: 差分なしと判定され、不要な品質ゲート実行や PR 作成をスキップして正常終了（exit code 0）する。
- **シナリオ 3: プラグイン更新により品質ゲートが失敗した場合の自動遮断（異常系・防護）**
  - **Given (前提)**: プラグインの更新内容に破壊的変更が含まれ、JobEval の `npm run check` が失敗する。
  - **When (操作・入力)**: `.github/workflows/sync-submodule.yml` が実行される。
  - **Then (期待結果)**: 品質ゲートステップでワークフローが即時失敗終了し、壊れたサブモジュールの PR 作成やマージは阻止される。

### 5.2. PR作成前プロセス完了基準 (Pre-PR Process DoD)
- [x] `.github/workflows/sync-submodule.yml` が作成され、構文エラーがないこと。
- [x] サブモジュール `.agents/plugins/antigravity-review-loop` が最新コミット（`65aa8b9`）に更新されていること。
- [x] 重複・パッチワーク点検（Impact & Duplication Check）が `pre_verification.md` に記録されていること。
- [x] ADR-0029 が策定され、設計決定が記録されていること。
- [x] 4軸ドキュメント（`issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md`）が完備されていること。
- [x] フル品質ゲート（`npm.cmd run check`）が 100% PASS すること。

### 5.3. マージ前完了ゲート (Pre-Merge Gate)
- [ ] GitHub Actions CI が PASS していること。
- [ ] 2者合議レビュー（`fleet_reviewer` ＋ `fleet_completion_auditor`）による客観的レビューを受領し両者 LGTM となること。
- [ ] 人間（ユーザー）による最終確認とマージが完了していること。

## 6. 関連ドキュメント・仕様正本 (References & SSOT)
- 事前検証記録: `docs/issues/ISSUE-089_sync_submodule_workflow/pre_verification.md`
- 関連 ADR: ADR-0024（Git Submodule 運用）, ADR-0029（本改修）
- 仕様正本: `docs/architecture_overview.md`
