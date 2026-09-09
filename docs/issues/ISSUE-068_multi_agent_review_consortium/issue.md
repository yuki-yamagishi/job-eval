# Issue #68: Fleet レビュー体制の 2 者合議制（コード品質担当 ＋ 批判的完了性監査担当）への拡張

## 1. 解決すべき課題・背景 (Problem Statement / Why)
- **現在の問題点**:
  - 単一のコードレビュアー（fleet_reviewer）にコード品質（型安全・セキュリティ・テスト・How）と完了性（IssueのWhy/課題解決・排除リスク・やり残し・What）を同時に評価させると、アテンションが眼前のコード差分に偏り、Issueの目的やユーザー視点でのやり残しを見落とす確証バイアスが生じる。
- **放置した場合のリスク**:
  - 「コードは綺麗でテストも通っているが、Issueの根本課題（Why）が解決されていない」「エージェントの慢心により、ユーザー視点での懸念事項が放置されたままPRが作成される」という品質・価値の乖離が発生する。
- **なぜ今解く必要があるのか**:
  - Antigravity 2.0 のコア哲学である「The Agent Fleet is the unit of work（エージェントフリートが作業単位）」および「関心の分離（Separation of Concerns）」に基づき、直交する 2 つの視点を独立したサブエージェントに分離し、並行起動・合議制判定を行う仕組みを標準化するため。

## 2. 期待される成果と価値 (Desired Outcome / Value)
- コード品質と批判的完了性を独立サブエージェント（`fleet_code_reviewer` と `fleet_completion_auditor`）に完全分離。
- 両者が共に LGTM を出すまで親エージェントが完了できない合議制ステートマシン（Review Consortium Gate）を配備。
- 「本当にこれで終わりか？」「IssueのWhyやリスクは解決されたか？」を第三者視点で徹底的に炙り出す。

## 3. 排除するリスク (Risks to Eliminate)
- **形式的合格（確証バイアス）の排除**: チェックボックスやテストが通ったからと中身を見ずにLGTMを出す甘いレビューの根絶。
- **目的乖離リスクの排除**: コードは綺麗だがIssueの根本課題が解けていない手戻りの根絶。
- **認知負荷による見落としリスクの排除**: コード差分の追跡に追われ、やり残しやユーザー視点の違和感を見落とす死角の根絶。

## 4. スコープの定義 (Scope & Boundaries)
- **スコープ内 (In-Scope)**:
  - 公式サブエージェント `.agents/agents/fleet_completion_auditor.md` の新設および `fleet_reviewer.md`（コード品質専門）の責務純化。
  - `loopState.js` の複数レビュアーステータス管理（`reviews: { codeReviewer, completionAuditor }`）および合議制判定ロジックの実装。
  - `parseReviewResult.js` における複数エージェント判定パース・マージ対応（`--agent-type`）。
  - `.agents/skills/review-self-healing/SKILL.md` の並行レビュー起動手順の標準化。
  - ハーネステスト（`tests/harness/`）の網羅的作成。
  - ADR-0019 の制定および SSOT 同期。
- **スコープ外 (Non-Goals)**:
  - 3人以上の常時必須化（UIやセキュリティの専門家はオンデマンド招集とし、常設は2人に限定）。

## 5. 受け入れ基準 (Acceptance Criteria / Definition of Done)
- [x] `.agents/agents/fleet_completion_auditor.md` が配備され、批判的完了性監査のプロンプトが定義されていること。
- [x] `.agents/agents/fleet_reviewer.md` がコード品質・セキュリティ・保守性に純化されていること。
- [x] `loopState.js` が 2 者の個別レビュー結果を追跡し、両者 LGTM でのみ `RESOLVED_LGTM` に遷移すること。
- [x] `parseReviewResult.js` がエージェント種別（`--agent-type`）を受け取り、対応するレビュアースロットに安全に記録できること。
- [x] `tests/harness/` において、片方のみ LGTM の場合にブロックされること、両者 LGTM で通過することを検証する単体テストが完備されていること。
- [x] ADR-0019 が作成され、`docs/architecture_overview.md`（SSOT）に同期されていること。
- [x] ワンショット品質ゲート（`npm run check`）が 100% PASS すること。
- [x] 2 者 Fleet（コード品質担当 ＋ 完了性監査担当）の並行レビューを受領し、両者 LGTM を獲得すること。

## 6. 関連ドキュメント・仕様正本 (References & SSOT)
- 関連 ADR: docs/adr/0019-multi-agent-review-consortium.md
- 仕様正本: AGENTS.md, docs/architecture_overview.md
