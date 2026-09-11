# Issue #78: antigravity-review-loop プラグインの外部リポジトリ分離と Git Submodule 移行

## 1. 解決すべき課題・背景 (Problem Statement / Why)
- **現在の問題点**:
  - これまで `antigravity-review-loop` プラグイン（自律レビューループ機構、フック、スキル、エージェント、状態マシン）は、JobEval リポジトリ内の `.agents/plugins/antigravity-review-loop/` に直接組み込まれて管理されていた。
  - この構造では、他プロジェクトで同プラグインを利用する際に手動でコピーする必要があり、再利用性やプラグイン自体の独立したバージョン管理・テスト・継続的改善が困難であった。
- **放置した場合のリスク**:
  - 複数プロジェクト間でのプラグインのコードドリフト（個別改修による乖離）が発生し、保守コストが増大する。
  - プラグイン単体での CI やテストによる品質保証が行えず、プロジェクト固有の変更に巻き込まれて壊れるリスクがある。
- **なぜ今解く必要があるのか**:
  - プラグインが完成度の高い自己完結モジュールとして確立され、GitHub 上に独立リポジトリ（`yuki-yamagishi/antigravity-review-loop`）として公開されたため、JobEval 側も外部リポジトリを参照する Git Submodule 構成へと即座に移行し、運用体制を一本化する必要がある。

## 2. 期待される成果と価値 (Desired Outcome / Value)
- `antigravity-review-loop` が独立した Git Submodule として JobEval に組み込まれる。
- プラグイン自体の改善や機能追加は独立リポジトリ側で CI テストを経て行われ、JobEval 側ではコミットハッシュ単位で安全に固定・更新できるようになる。
- 他プロジェクトでも `git submodule add https://github.com/yuki-yamagishi/antigravity-review-loop.git .agents/plugins/antigravity-review-loop` の1コマンドで即座に同一の自律レビューループ機構を導入可能になる。

## 3. 排除するリスク (Risks to Eliminate)
- **プロジェクト間での重複実装・コード乖離リスクの排除**:
  - プラグインの SSOT（Single Source of Truth）を `yuki-yamagishi/antigravity-review-loop` に一元化し、プロジェクトごとのつぎはぎ改修を防止。
- **CI / クローン時のサブモジュール欠落リスクの排除**:
  - GitHub Actions CI（`.github/workflows/ci.yml`）で `submodules: true` を指定し、チェックアウト時のプラグイン欠落を物理的に防止。
- **既存テスト・チェッカーの互換性破壊リスクの排除**:
  - サブモジュールの展開パスを従来の `.agents/plugins/antigravity-review-loop` と完全一致させることで、`scripts/checkers/agentSkillChecker.js` や `tests/harness/` が無修正で 100% 動作することを保証。

## 4. スコープの定義 (Scope & Boundaries)
- **スコープ内 (In-Scope)**:
  - JobEval リポジトリ内の既存 `.agents/plugins/antigravity-review-loop` を外部リポジトリからの Git Submodule へ切り替え。
  - `.gitmodules` の作成・設定。
  - `.github/workflows/ci.yml` に `submodules: true` を追加。
  - ドキュメント（`docs/architecture_overview.md`, `docs/adr/0024-external-plugin-submodule.md`）の整備と同期。
- **スコープ外 (Non-Goals)**:
  - プラグイン内部のフック仕様や状態遷移ロジックの破壊的改修（すでに独立リポジトリ側で検証・公開済み）。

## 5. 受け入れ基準 (Acceptance Criteria / Definition of Done)

### 5.1. 機能受け入れシナリオ (Feature-specific Acceptance Criteria: Given-When-Then)
- **シナリオ 1: Git Submodule 構成の正常認識**
  - **Given (前提)**: JobEval リポジトリ直下に `.gitmodules` が存在し、`path = .agents/plugins/antigravity-review-loop` が登録されている。
  - **When (操作・入力)**: `git submodule status` を実行する。
  - **Then (期待結果)**: `antigravity-review-loop` がコミットハッシュ付きでサブモジュールとして認識されていること。
- **シナリオ 2: チェッカーおよびハーネステストの完全互換**
  - **Given (前提)**: サブモジュールとして `.agents/plugins/antigravity-review-loop` がチェックアウトされている。
  - **When (操作・入力)**: `node scripts/checkers/agentSkillChecker.js` および `npm.cmd run test:run -- tests/harness` を実行する。
  - **Then (期待結果)**: プラグインマニフェスト、スキル群、エージェント定義が全て正常判定され、ハーネステストが 100% PASS すること。
- **シナリオ 3: CI チェックアウト設定の網羅**
  - **Given (前提)**: `.github/workflows/ci.yml` が更新されている。
  - **When (操作・入力)**: actions/checkout ステップの定義を確認する。
  - **Then (期待結果)**: `submodules: true` が明記されており、CI 環境で自動チェックアウトされること。

### 5.2. PR作成前プロセス完了基準 (Pre-PR Process DoD)
- [x] 上記 5.1 の全機能受け入れシナリオを検証する実質的な単体テストが存在し PASS すること。
- [x] 排除対象のリスクに対する物理的ガードレール（Submodule設定・CI設定）が機能していること。
- [x] 重複・パッチワーク点検（Impact & Duplication Check）が pre_verification.md に完了・記録されていること。
- [x] 4軸ドキュメント（issue, pre_verification, plan, walkthrough）が揃っていること。
- [x] フル品質ゲート（npm.cmd run check）が 100% PASS すること。

### 5.3. マージ前完了ゲート (Pre-Merge Gate)
- [ ] GitHub Actions CI が PASS していること。
- [ ] 2者合議レビュー（fleet_reviewer ＋ fleet_completion_auditor）による客観的再レビューで両者 LGTM を受領すること。
- [ ] 人間（ユーザー）による最終確認とマージが完了していること。

## 6. 関連ドキュメント・仕様正本 (References & SSOT)
- 事前検証記録: docs/issues/ISSUE-078_external_plugin_submodule/pre_verification.md
- 関連 ADR: docs/adr/0024-external-plugin-submodule.md
- 影響を受けるアーキテクチャ設計書: docs/architecture_overview.md
