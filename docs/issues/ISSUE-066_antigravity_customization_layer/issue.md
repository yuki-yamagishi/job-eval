# Issue #66: Antigravity Customization Layer への刷新（God Skill解体・フック配置純化・公式Subagent仕様・CI待機統合・Whyの仕組み化）

## 1. 解決すべき課題・背景 (Problem Statement / Why)
- **現在の問題点**:
  - 現在の AI 開発ハーネス（Agent / Skills / Hooks / Rules / Subagents）について、Google Antigravity 公式仕様（https://antigravity.google/docs/ および agy-customizations）との突き合わせ検証を実施した結果、スクリプト配置の混在、13KBの巨大モノリススキル（God Skill）、非公式サブエージェント構造、CWD依存の複雑なHooksなどの構造的欠陥が存在する。
- **放置した場合のリスク**:
  - トークン消費圧迫による推論精度低下、サブエージェントの自動認識失敗、フック実行パスの破壊、エージェントによる自己承認（セルフLGTM）、CI 失敗見落とし、待機デッドロック等が発生し、自律開発ループが破綻する。
- **なぜ今解く必要があるのか**:
  - プロダクト開発が本格化する前に、エージェントが安全・自律的・決定論的に改善サイクルを回すための基盤（Customization Layer）を確立するため。

## 2. 期待される成果と価値 (Desired Outcome / Value)
- Google Antigravity 公式アーキテクチャに準拠し、本プロジェクトのガバナンス機構を「Customization Layer（カスタマイズ層）」として純化・リファクタリングする。
- エージェントの注意力や文章（作文）に依存せず、コード・状態マシン・フック（Mechanism）によって安全性を100%物理担保する。

## 3. 排除するリスク (Risks to Eliminate)
- **自己承認（セルフLGTM）リスク**: 親エージェントが独断で完了とみなすことの物理遮断。
- **CI 失敗見落としリスク**: リモート CI（GitHub Actions）が PASS していない状態でのレビュー・マージ進行の物理遮断。
- **着手前コンテキスト汚染リスク**: 作業ツリーが dirty または前ループ未完了のままでのブランチ作成の物理遮断。
- **待機デッドロックリスク**: サブエージェント稼働中の親エージェント停止拒否によるフリーズの根絶。
- **不正マージリスク**: エージェントによる `gh pr merge` の直接実行の物理遮断。

## 4. スコープの定義 (Scope & Boundaries)
- **スコープ内 (In-Scope)**:
  - ルート直下 `scripts/harness/` の完全撤廃と `.agents/` への完全集約。
  - スキルの単一責務 3 分割（`issue-lifecycle`, `dev-lifecycle`, `review-self-healing`）。
  - 公式サブエージェント仕様（`.agents/agents/fleet_reviewer.md`）への移行。
  - フック配置の純化とデッドロック防止（`payload.fullyIdle` 対応）。
  - レビュー状態マシンの厳格化（自己LGTM物理禁止 & Fleet Re-review 必須化）。
  - CI 合格検証の仕組み化（CI 未通過時のレビュー依頼ブロック）。
  - 着手前（DoR）の Git 健全性 & Why First 検査の仕組み化。
  - ADR-0018 の作成および Issue 4軸ドキュメントの同期。
- **スコープ外 (Non-Goals)**:
  - アプリケーション本体のビジネスロジック変更。

## 5. 受け入れ基準 (Acceptance Criteria / Definition of Done)
- [x] `scripts/harness/` が撤廃され、エージェント専用スクリプトが `.agents/` 配下に完全カプセル化されていること。
- [x] `.agents/skills/` 配下が 3 つの単一責務スキルに分割され、Progressive Disclosure に準拠していること。
- [x] `.agents/agents/fleet_reviewer.md` が配備され、公式サブエージェント仕様に準拠していること。
- [x] `loopState.js` において自己承認（セルフLGTM）が物理禁止され、Fleet の Re-review なしには `canStop` が通過しないこと。
- [x] `loopState.js` において CI 未通過時のレビュー依頼が物理ブロックされること。
- [x] `preToolHook.js` において、dirty ツリーでのブランチ作成および Why 不足のブランチ作成が物理ブロックされること。
- [x] 内外分離（Boundary Design）に基づき、エージェント向け内部制御が英語に統一され、Remediation Guidance が完備されていること。
- [x] ワンショット品質ゲート（`npm.cmd run check`）が 100% PASS すること。
- [x] 独立レビュアー（fleet_reviewer）による客観的再レビューで LGTM を受領すること。

## 6. 関連ドキュメント・仕様正本 (References & SSOT)
- 関連 ADR: docs/adr/0018-antigravity-customization-layer-refactoring.md
- 仕様正本: AGENTS.md, docs/architecture_overview.md

