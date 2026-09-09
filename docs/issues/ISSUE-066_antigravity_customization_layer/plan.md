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

---

## 2. 検証手順
1. `npm.cmd run check:fast`: 高速型・単体テスト検査
2. `npm.cmd run doc-check`: ドキュメント・チェッカー整合性検査
3. `npm.cmd run check`: ワンショット総合品質ゲート（100% PASS）
