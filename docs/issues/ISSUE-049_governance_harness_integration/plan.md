# Issue #49: AGENTS.md / SKILL.md 規約改編・二重管理解消と自己修復ループ E2E 検証 実装計画書

## 1. 概要 (Overview)
ADR-0016 の最終ステップ（Step 6）として、Issue #44〜#48 で配備された開発ハーネス資産（状態管理マシン・ライフサイクルフック・自動化スクリプト群）を公式規約（`AGENTS.md`）およびスキル（`job-eval-harness`）に統合します。
`AGENTS.md` と `SKILL.md` の重複を排除し、それぞれの役割（規約/ガバナンス vs 実践Runbook）を確立するとともに、一連の自律自己修復ループを E2E 結合テスト（`tests/harness/e2eLoop.test.ts`）で検証します。

## 2. 変更・新規作成ファイル一覧 (Files to Modify/Create)
- `AGENTS.md` [MODIFY]: ループエンジニアリング DoD の明文化、ツール連携ワークフローの記載
- `.agents/skills/job-eval-harness/SKILL.md` [MODIFY]: コピペ重複の廃止、実践 Runbook（実行手順・CLI コマンド集）への再構成
- `scripts/checkers/agentSkillChecker.js` [MODIFY]: 新規約・Runbook 構造に対応したチェッカーの更新
- `tests/harness/e2eLoop.test.ts` [NEW]: 自己修復ループ完全サイクルの E2E 結合テスト
- `docs/issues/ISSUE-049_governance_harness_integration/pre_verification.md` [NEW]: 4軸事前検証ログ
- `docs/issues/ISSUE-049_governance_harness_integration/plan.md` [NEW]: 本計画書
- `docs/issues/ISSUE-049_governance_harness_integration/walkthrough.md` [NEW]: 成果レポート
- `docs/pre_phase_verification.md` [MODIFY]: 最新ポインタ更新
- `docs/implementation_plan.md` [MODIFY]: 最新ポインタ更新
- `docs/walkthrough.md` [MODIFY]: 最新ポインタ更新

## 3. 実装詳細 (Implementation Details)

### ① `AGENTS.md` の改訂
- セクション 2 のハイブリッド開発フローにおいて：
  - ステップ ⑥ Fleet レビュー実行、ステップ ⑦ 手元自己修復・解決報告（`resolveReview.js`）、ステップ ⑧ 人間承認マージ の責務を最新ハーネスに合わせて更新。
  - **完了の定義 (Definition of Done: DoD)** の追加：
    - 「PR 作成後に作業を完了とみなして停止することは物理的に禁止（Stop フックによりインターセプト）。Fleet レビューの全ブロッキング指摘（`[must]`, `[should]`）を手元で修正し、`resolveReview.js` により PR に解決報告を投稿して `STATUS.RESOLVED_LGTM` に到達するまで自己修復ループを完走すること。」
- セクション 4 のコマンド一覧にハーネス用スクリプト群を追加。

### ② `.agents/skills/job-eval-harness/SKILL.md` の再構成
- `AGENTS.md` の文章の重複（コピペ）を解消。
- エージェントがタスク実行時に参照する **「実践 Runbook（開発・検証・レビュー・自己修復のコマンド集・手順）」** として再構成。
  - Phase 1: ブランチ作成 & Issue ラベル更新
  - Phase 2: コア実装 & 自動テスト（`npm.cmd run check`）
  - Phase 3: PR 作成 & 自動状態遷移
  - Phase 4: Fleet レビュー起動 & 待機
  - Phase 5: レビュー結果パース（`parseReviewResult.js`）
  - Phase 6: 指摘自己修復 & 解決報告（`resolveReview.js`）
  - Phase 7: 人間承認マージ & 状態リセット（`loopState.js reset`）

### ③ `scripts/checkers/agentSkillChecker.js` の更新
- 必須コアポリシーの検証（'Conventional Commits', 'npm run check', 'Fleet', 'docs/'）を維持。
- 新設されたハーネス機能（'resolveReview', 'loopState', 'DoD' 等）の同期検証を追加。

### ④ E2E 結合テスト (`tests/harness/e2eLoop.test.ts`)
- 一連のライフサイクル（PR作成 ➔ 停止ブロック ➔ Fleetレビュー ➔ 指摘検出 ➔ 手元修正 ➔ 解決報告 ➔ LGTM ➔ 停止許可 ➔ リセット）を結合テストで網羅。

## 4. 検証手順 (Verification Plan)
1. `npm.cmd run test:run` で新規テスト `tests/harness/e2eLoop.test.ts` を含む全テストを実行。
2. `npm.cmd run check` でシークレット、ドキュメント、型、テスト、ビルドの一括検証。
