# Issue #49: AGENTS.md / SKILL.md 規約改編・二重管理解消と自己修復ループ E2E 検証

## 1. 開発の背景と課題 (Problem Statement)
- [ADR-0016 (ループエンジニアリング確立に向けた開発ハーネスの 6 段階リファクタリング)](../../adr/0016-loop-engineering-harness-refactoring.md) の Step 6（最終統合）に位置付けられるタスク。
- Issue #44〜#48 で配備した状態管理マシン・ライフサイクルフック・自動化スクリプト群を、公式開発規約（`AGENTS.md`）およびスキル（`job-eval-harness`）に統合する。
- `AGENTS.md` と `SKILL.md` のコピペ二重管理を解消し、自己修復ループが手元で自律完走することを E2E で総合検証する。

## 2. 実装要件 (Requirements)
1. **`AGENTS.md` の改訂**:
   - ステップ⑦に「ループエンジニアリング完了定義（DoD: 全指摘解消・LGTM 到達まで作業終了の禁止）」を厳格に明文化。
2. **`job-eval-harness/SKILL.md` の再構成**:
   - `AGENTS.md` の重複文章を廃止し、Issue #44〜#48 で配備したスクリプト群（`loopState.js`, `postPrComment.js`, `parseReviewResult.js`, `resolveReview.js`）の利用手順・Runbook に特化。
3. **検査スクリプトの更新 (`scripts/checkers/agentSkillChecker.js`)**:
   - 新しい規約・スキル構造に合わせた整合性チェッカーの改修。
4. **自己修復ループの E2E 結合検証**:
   - テストブランチ/PR を作成し、PR作成検知 → フックによる停止阻止 → Fleet レビュー → 指摘修復 → 解決報告 → LGTM 到達 → 正常終了 という完全自律サイクルが手元で成立することを実証。

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] `npm run check` が全件合格すること。
- [ ] エージェントが途中で早期停止せず、自律的に自己修復ループを回し切る再現性が確認できること。
