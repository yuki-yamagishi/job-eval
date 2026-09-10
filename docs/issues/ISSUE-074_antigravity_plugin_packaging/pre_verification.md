# Issue #74: 事前検証記録 (Pre-Verification)

## 1. 検証日時
2026-09-10

## 2. 現状の課題分析 (Problem Analysis)
- **現状のコード・アーキテクチャの振る舞い**:
  - Issue #72 / PR #73 のリファクタリングにより、ライフサイクルフックはフラットかつ単一責務の構造（`safetyGuard.js`, `branchDoRGate.js`, `prePrAuditGate.js`, `postPrCreate.js`, `stopHook.js`）へと刷新された。
  - しかし、これらのコンポーネント（フック、スキル、ルール、状態マシン）は `.agents/` ディレクトリ直下に平置きされている。
  - Antigravity 2.0 のプラグイン公式仕様（`https://antigravity.google/docs/plugins/`）では、機能バンドルを `plugins/<plugin-name>/` 配下に `plugin.json` マーカーと共に格納し、`hooks.json`, `hooks/`, `skills/`, `rules/` などをひとまとめにすることが定義されている。
- **根本原因 (Root Cause)**:
  - これまで段階的にハーネス機能やガバナンスを追加してきたため、プロジェクトルート直下の `.agents/` に設定やスクリプトが蓄積されていた。
  - 公式のプラグインパッケージング仕様へ体系的に移行していなかった。

## 3. 重複・パッチワーク点検 (Impact & Duplication Check)
- **既存基盤・ユーティリティ・ASTの横断調査**:
  - **公式仕様（SSOT）の整合性**:
    - `https://antigravity.google/docs/plugins/` の仕様：
      ```text
      plugins/<plugin-name>/
      ├── plugin.json       # 必須マーカー
      ├── mcp_config.json   # 任意 (今回は不要)
      ├── hooks.json        # 任意 (フック定義)
      ├── hooks/            # フック実体スクリプト
      ├── skills/           # スキル群 (<skill-name>/SKILL.md)
      └── rules/            # ルール群 (<rule-name>.md)
      ```
    - 配置場所:
      - ワークスペースレベル: `.agents/plugins/<plugin-name>/`
  - **既存コードベースの参照調査**:
    - `tests/harness/hooks.test.ts`, `e2eLoop.test.ts`, `resolveReview.test.ts`, `postPrComment.test.ts`, `parseReviewResult.test.ts`
    - `scripts/checkers/agentSkillChecker.js`
    - `.githooks/` や `package.json`
    これらは `.agents/hooks/`, `.agents/skills/`, `.agents/state/` をインポート・参照している。
  - **重複・パッチワーク防止方針**:
    - `.agents/` 直下に旧ファイルを残したままプラグイン配下にコピーするような「二重管理」「二重配置（パッチワーク）」は厳禁とする。
    - 自律レビューループ機構を `.agents/plugins/antigravity-review-loop/` に完全移設（Single Source of Truth 化）する。
    - 外部からの呼び出し（テスト、チェッカー）は新プラグインパス（`.agents/plugins/antigravity-review-loop/...`）を直接参照するよう一斉更新し、死にコードやゾンビ互換層を一切残さない。

## 4. 改修方針 (Implementation Strategy)
1. **プラグインディレクトリおよびマニフェストの配備**:
   - `.agents/plugins/antigravity-review-loop/plugin.json` を作成：
     ```json
     {
       "name": "antigravity-review-loop",
       "description": "Autonomous self-healing PR review loop & quality governance plugin for Antigravity"
     }
     ```
2. **コンポーネントの完全移設**:
   - `hooks.json` および `hooks/` を `.agents/plugins/antigravity-review-loop/` 配下に移動。
   - `skills/`（`dev-lifecycle`, `issue-lifecycle`, `review-self-healing`）を `.agents/plugins/antigravity-review-loop/skills/` 配下に移動。
   - `rules/`（`single-command.md`）を `.agents/plugins/antigravity-review-loop/rules/` 配下に移動。
   - `state/`（`loopState.js`, `loop_state.json` 等）をプラグイン配下に統合。
3. **パス解決とテスト・チェッカーの追随**:
   - `hooks.json` 内のコマンドパス（`node ./hooks/safetyGuard.js` 等）がプラグインルート起点で動作することを確認。
   - `scripts/checkers/agentSkillChecker.js` を新プラグイン配下のスキルパスを参照するよう更新。
   - `tests/harness/*.test.ts` のインポートパス・実行パスを新プラグイン配下に更新。
4. **設計決定記録（ADR-0022）の策定**:
   - `docs/adr/0022-antigravity-plugin-packaging.md` を作成し、`docs/adr/README.md` および `docs/architecture_overview.md` を更新。
5. **検証**:
   - `npm.cmd run test:fast` および `npm.cmd run check` で 212 tests pass, build pass, doc check pass を確認。
