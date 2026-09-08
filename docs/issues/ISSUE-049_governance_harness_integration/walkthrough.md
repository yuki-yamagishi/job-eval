# Issue #49: AGENTS.md / SKILL.md 規約改編・二重管理解消と自己修復ループ E2E 検証 実装成果レポート

## 1. 概要 (Overview)
ADR-0016 Step 6 に基づき、`AGENTS.md`（設計原則・ガバナンス・DoD）および `SKILL.md`（開発エージェント向け実践 Runbook）の役割分担と再構成を行い、コピペ二重管理を解消しました。また、整合性チェッカー（`agentSkillChecker.js`）を更新し、自己修復ループ全体の完全自律サイクルを実証する E2E 結合テスト `tests/harness/e2eLoop.test.ts` を配備しました。

## 2. 成果物 (Deliverables)

### ① `AGENTS.md` の改訂
- **ループエンジニアリング完了定義 (Definition of Done: DoD)** の明文化：
  - PR 作成後は自動的にライフサイクルフック（`stopHook.js`）により早期停止（作業完了の宣言）が物理的に禁止されること。
  - レビュー結果は `parseReviewResult.js` で自動パースし、ブロッキング指摘（`[must]`, `[should]`）を手元で修正後、`resolveReview.js` により PR スレッドへ公式解決報告（`[Resolved]`）を投稿すること。
  - `loopState.js` の状態が `STATUS.RESOLVED_LGTM`（未解消ブロッキング指摘 0 件）に到達して初めて Stop ガードが解除されること。
- 開発・ハーネス用コマンド一覧（`loopState.js`, `parseReviewResult.js`, `resolveReview.js` 等）を追加。

### ② `.agents/skills/job-eval-harness/SKILL.md` の実践 Runbook 化
- `AGENTS.md` の重複文章を廃止。
- タスク着手から完了までの 7 フェーズ（Phase 1: 着手 ➔ Phase 2: 実装・ドキュメント ➔ Phase 3: 検証・コミット ➔ Phase 4: PR作成・ガード発動 ➔ Phase 5: Fleetレビュー ➔ Phase 6: 自己修復・解決報告・DoD達成 ➔ Phase 7: 承認マージ・リセット）を実践的なコマンド例付きで整理。

### ③ 整合性チェッカー更新 (`scripts/checkers/agentSkillChecker.js`)
- `loopState`, `resolveReview`, `DoD` の同期検証項目を追加し、規約・Runbook の整合性を自動担保。

### ④ E2E 結合テスト配備 (`tests/harness/e2eLoop.test.ts`)
- PR 作成 ➔ 早期停止拒否 ➔ レビュー起動待機（待機用停止許可） ➔ 指摘検出（修正前停止拒否） ➔ 部分解決（停止拒否維持） ➔ 全件解決報告（`RESOLVED_LGTM` 到達・停止許可） ➔ 承認後リセット（IDLE 復帰）の一連のライフサイクルが完全自律完走することを Vitest 上で実証。
- サブエージェント実行環境下でのバイパス動作も検証。

## 3. 検証結果 (Verification Results)
- `tests/harness/e2eLoop.test.ts`: 2/2 件 PASS
- `tests/harness/` (全ハーネステスト): 61/61 件 PASS
- `node scripts/docCheck.js`: 全ドキュメント整合性 PASS
- `npm.cmd run test:run`: 全 26 ファイル / 165 テスト 100% PASS
