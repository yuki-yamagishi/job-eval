# ADR-0029: antigravity-review-loop プラグイン更新の自動検知・品質検証・自動 PR 同期ワークフローの導入

- **ステータス**: Accepted
- **決定日**: 2026-09-18
- **対象**: Customization Layer, Git Submodule, CI/CD Automation, GitHub Actions, Governance
- **関連 Issue**: Issue #89

---

## 1. 背景と課題 (Context)

ADR-0024 において、自律レビューループ機構（Hooks, Skills, Rules, Agents, State Machine）は外部リポジトリ（`yuki-yamagishi/antigravity-review-loop`）に分離され、JobEval には Git Submodule として取り込む構成へ移行した。

しかし、以下の運用上の課題が存在していた：
1. **更新反映の手動依存と反映漏れ**:
   - プラグイン側でバグ修正や安全装置（curl timeout guard や branch DoR 検査強化等）の改修が行われた際、JobEval 側で開発者が手動で `git submodule update` を実行してコミット・PR を作成しない限り最新版が反映されなかった。
2. **親リポジトリ互換性検証の自動化欠如**:
   - プラグインの更新が JobEval 本体のチェッカー（`agentSkillChecker.js` 等）、TypeScript 型検査、単体テストスイート、本番ビルドを破壊しないかを自動検証する仕組みがなく、手動テストに依存していた。
3. **ガバナンスと安全性の両立**:
   - 人間のマージ専権（AGENTS.md / Global Rules）を担保しつつ、プラグイン更新の検知と反映を自動化する仕組み（Mechanisms over good intentions）が求められていた。

---

## 2. 決定事項 (Decisions)

### 2.1 自動同期ワークフロー（`.github/workflows/sync-submodule.yml`）の新設
サブモジュール同期専用の独立した GitHub Actions ワークフローを新設し、以下を配備する：
- **多重トリガー**:
  - `repository_dispatch`: 外部リポジトリ（`antigravity-review-loop`）からの即時プッシュ通知イベント（`types: [antigravity-review-loop-updated, submodule-update]`）を受信。
  - `schedule`: 定期 cron（毎日 UTC 0:00 = JST 9:00）によるフェイルセーフな差分検知・同期。
  - `workflow_dispatch`: GitHub Actions UI からの手動実行。
- **実行環境の統一**:
  - ADR-0027 に準拠し、Node 24 ネイティブ版アクション（`actions/checkout@v7`, `actions/setup-node@v7`）を採用。

### 2.2 厳格な品質ゲート（`npm run check`）の必須通過
サブモジュールを最新コミットへ更新後、差分が検知された場合のみ以下を実行する：
1. `npm ci` によるクリーンインストール。
2. `npm run check` によるワンショット品質ゲート（シークレットスキャン、ドキュメント・スキル整合性検査、型検査、Vitest 全テスト、プロダクションビルド）。
3. 品質ゲートに 1 つでも失敗した場合は直ちにワークフローを中断（Fail）し、破壊的変更の混入を物理遮断する。

### 2.3 自動トピックブランチ作成と Pull Request 発行（人間マージ専権の維持）
- main ブランチへの直接 push や自動マージは厳禁とし、専用ブランチ `chore/update-antigravity-review-loop` を作成して Pull Request を自動発行する。
- 既存の同一ブランチ PR がオープンしている場合は、ブランチへの上書き push により既存 PR を安全に最新化し、多重 PR の乱立を防止する。
- 人間（ユーザー）が PR 上で差分および CI 結果を確認し、最終マージを決定する。

---

## 3. 結果と影響 (Consequences)

### ポジティブな影響
- **プラグイン更新の即時・自動反映**: 外部リポジトリの更新が放置されることなく、自動で検証・PR 化される。
- **高水準の安全性保証**: 親プロジェクトの全品質ゲート（`npm run check`）を通過した健全なコミットのみが PR 化される。
- **人間中心のガバナンス維持**: 直接 push ではなく PR 方式を採用することで、人間承認原則を一切毀損しない。

### 留意事項
- 外部リポジトリ側から push 時に即時トリガーしたい場合は、外部リポジトリ側の Actions から JobEval リポジトリに対して `repository_dispatch` を送信するステップ（PAT または GitHub App トークン）を設定する。
- 外部通知が設定されていない場合でも、JobEval 側の定期 cron（毎朝 JST 9:00）および手動 dispatch により確実に最新化される。
