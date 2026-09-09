# Issue #66: 実装計画書 (Plan)

## 1. 変更対象コンポーネントとファイル一覧

### (1) ガードレール層 (.agents/hooks/ & .agents/state/)
- `.agents/state/loopState.js`: [NEW] 状態マシンモジュール（scripts/harness/loopState.js から移行）
- `.agents/hooks/hookUtils.js`: [NEW] stdin/stdout JSON プロトコル共通ユーティリティ
- `.agents/hooks/preToolHook.js`: [NEW] コマンド事前検査ハンドラ
- `.agents/hooks/postToolHook.js`: [NEW] コマンド事後検査ハンドラ
- `.agents/hooks/stopHook.js`: [NEW] 終了阻止ハンドラ（payload.fullyIdle 対応）
- `.agents/hooks.json`: [MODIFY] コマンドパスを node ./hooks/<name>.js に純化

### (2) サブエージェント層 (.agents/agents/)
- `.agents/agents/fleet_reviewer.md`: [NEW] 公式仕様サブエージェント定義
- `.agents/subagents/fleet-reviewer/`: [DELETE] 旧非公式定義の削除

### (3) スキル層 (.agents/skills/)
- `.agents/skills/issue-lifecycle/SKILL.md`: [NEW] Issue 管理スキル
- `.agents/skills/dev-lifecycle/SKILL.md`: [NEW] 開発・TDDスキル
- `.agents/skills/review-self-healing/SKILL.md`: [NEW] レビュー・自己修復スキル（リモートCI待機・人間マージ依頼含む）
- `.agents/skills/review-self-healing/scripts/parseReviewResult.js`: [NEW]
- `.agents/skills/review-self-healing/scripts/postPrComment.js`: [NEW]
- `.agents/skills/review-self-healing/scripts/resolveReview.js`: [NEW]
- `.agents/skills/job-eval-harness/`: [DELETE] 旧モノリススキルの削除

### (4) プロダクト清浄化 & テスト・チェッカー更新
- `scripts/harness/`: [DELETE] 旧スクリプトディレクトリの完全撤廃
- `scripts/checkers/agentSkillChecker.js`: [MODIFY] 新スキル構成と公式サブエージェントの検証対応
- `tests/harness/*.test.ts`: [MODIFY] インポートパスの更新
- `AGENTS.md`: [MODIFY] スキル参照先および人間マージ方針の同期
- `docs/adr/0018-antigravity-customization-layer-refactoring.md`: [NEW]
- `docs/adr/README.md`: [MODIFY]

### (5) Why-First 思想の仕組み化 & ガバナンスゲート強化
- `docs/issues/template_issue.md`: [NEW] Why/Problem/Risk/Scope/Criteria/SSOT 標準 Issue テンプレート
- `.agents/hooks/preToolHook.js`: [MODIFY] ブランチ作成時（git checkout -b / switch -c）の 3 重物理検査（dirty ツリー拒絶、未完了 PR 拒絶、Issue 不在・Why/Risk 欠落拒絶）
- `.agents/state/loopState.js`: [MODIFY] CI Status Gate（CI pending/fail 時のレビュー要求拒絶） & Merge Verification Gate（PR 未マージ時の勝手な reset 拒絶）
- `tests/harness/hooks.test.ts`: [MODIFY] preToolHook Block 3 の単体テスト 5 件追加
- `tests/harness/loopState.test.ts`: [MODIFY] CI Gate 4 件および Reset Gate 4 件の単体テスト追加

---

## 2. 検証手順
1. `npm.cmd run test:run tests/harness/`: ハーネス単体テスト全 6 ファイル (78 件) PASS
2. `node scripts/docCheck.js`: ADR・Agent・Issue ドキュメント整合性検査 PASSED
3. `npm.cmd run check`: ワンショット総合品質ゲート（シークレット + docCheck + tsc + 182 テスト + ビルド 100% PASS）

