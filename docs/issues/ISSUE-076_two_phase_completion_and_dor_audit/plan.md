# 実装計画書: Issue #76

- **対象 Issue**: Issue #76: Pre-Phase 要件監査 (DoR) 導入と Fleet 完了性監査の反証型・過剰攻撃防止リファクタリング (ADR-0023)
- **ステータス**: Approved / In-Execution
- **作成日**: 2026-09-10

---

## 1. 改修の目的とスコープ
Issue 作成時における要件の具体化（Given-When-Then、境界値・異常系、曖昧語排除）を強制する Pre-Phase 要件監査サブエージェント `fleet_dor_auditor` を新設し、PR 段階の `fleet_completion_auditor` に反証型トレースおよび過剰攻撃防止ガードレール（反例提示義務、ゴールポスト移動禁止、ゼロ件恐怖症排除）を導入する。

---

## 2. 変更対象コンポーネントと作業手順

### 2.1 サブエージェント定義
- `[NEW]` `.agents/plugins/antigravity-review-loop/agents/fleet_dor_auditor.md`
  - DoR 要件監査専門エージェントのペルソナ・プロンプト配備。
- `[MODIFY]` `.agents/plugins/antigravity-review-loop/agents/fleet_completion_auditor.md`
  - 反証型トレース、反例提示義務、ゴールポスト移動禁止、ゼロ件恐怖症排除プロンプトの配備。

### 2.2 テンプレート & フック
- `[MODIFY]` `docs/issues/template_issue.md`
  - 5.1 機能受け入れシナリオ (Given-When-Then & 境界値・異常系)、5.2 Pre-PR Process DoD、5.3 Pre-Merge Gate の 3 階層化。曖昧語禁止の明記。
- `[MODIFY]` `.agents/plugins/antigravity-review-loop/hooks/branchDoRGate.js`
  - 受入基準具体性検査、曖昧語（「適切に」「よしなに」「必要に応じて」）検知、テンプレート引用ブロック事前除外（False Positive 防止）。
- `[MODIFY]` `.agents/plugins/antigravity-review-loop/hooks/prePrAuditGate.js`
  - 新旧両フォーマット対応正規表現による未完了 PR すり抜け（False Negative）防止。

### 2.3 ガバナンス・規約・SSOT・テスト
- `[NEW]` `docs/adr/0023-two-phase-completion-and-dor-audit.md`: ADR-0023 策定。
- `[MODIFY]` `docs/adr/README.md`: 全 23 件同期。
- `[MODIFY]` `docs/architecture_overview.md`: SSOT 同期。
- `[MODIFY]` `AGENTS.md`: ガバナンス憲章同期。
- `[MODIFY]` `.agents/plugins/antigravity-review-loop/skills/issue-lifecycle/SKILL.md`
- `[MODIFY]` `.agents/plugins/antigravity-review-loop/skills/dev-lifecycle/SKILL.md`
- `[MODIFY]` `.agents/plugins/antigravity-review-loop/skills/review-self-healing/SKILL.md`
- `[MODIFY]` `scripts/checkers/agentSkillChecker.js`: `fleet_dor_auditor.md` 存在検査追加。
- `[MODIFY]` `tests/harness/hooks.test.ts`: 反例・境界値テスト追加（計 49 件）。

---

## 3. 検証計画
- `npm.cmd run doc-check`
- `npm.cmd run check:fast`
- `npx.cmd vitest run tests/harness/hooks.test.ts`
- `npm.cmd run test:fast`
- `npm.cmd run check`
- サブエージェント実機 E2E 呼び出しテスト（DoR 監査、完了性監査、Re-audit LGTM 受領）
