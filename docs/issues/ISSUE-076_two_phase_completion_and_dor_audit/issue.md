# Issue #76: Pre-Phase 要件監査 (DoR) 導入と Fleet 完了性監査の反証型・過剰攻撃防止リファクタリング (ADR-0023)

## 1. 解決すべき課題・背景 (Problem Statement / Why)
- **現在の問題点**:
  - PR 段階の完了性監査（`fleet_completion_auditor`）は、親エージェントが作成した `issue.md` とコードを突き合わせるが、`issue.md` の受け入れ要件が「〇〇を実装すること」「テストが存在すること」等の抽象的・メタ的表現の場合、甘い基準を追認（Rubber Stamping）して合格を出してしまう。
  - その結果、Issue 本来の目的（Why）やユーザーが求める挙動との乖離を検知できず、PR 後に人間の手動レビューで毎回指摘が入る事態が生じていた。
  - また、単に批判的レビューを求めると、完璧な実装に対しても言いがかりのような粗探しや過剰な攻撃的指摘（Nitpicking / False Positives）が発生して開発ループが停滞するリスクがあった。
- **放置した場合のリスク**:
  - 形式的なチェックボックス埋めだけの低品質な PR が量産され、人間のレビュー負担が増大する。
  - レビュアー間の言いがかりによるブロッカー乱発で開発テンポが崩壊する。
- **なぜ今解く必要があるのか**:
  - プラグイン化（Issue #74）が完了し、自律レビューループ機構の基盤が確立された今、レビューの「質」と「タイミング（Shift-Left）」を根本から引き上げる絶好の機会であるため。

## 2. 期待される成果と価値 (Desired Outcome / Value)
- ブランチ作成前（Pre-Phase）に要件定義（DoR）を批判的に監査する独立サブエージェント `fleet_dor_auditor` を新設。
- `fleet_completion_auditor` に反証型監査および過剰攻撃防止ガードレール（反例提示義務、ゴールポスト移動禁止、ゼロ件恐怖症排除）を導入。
- `template_issue.md` および `branchDoRGate.js` を刷新し、Given-When-Then 機能受け入れシナリオの記述を物理強制。

## 3. 排除するリスク (Risks to Eliminate)
- **追認（Rubber Stamping）リスク**: 曖昧な要件をそのまま合格にしてしまう不全の排除。
- **シフトレフト欠落リスク**: 実装・PR 後に目的乖離が発覚して大規模な手戻りが生じるリスクの排除。
- **過剰攻撃・粗探しリスク**: 反例のない推測指摘や後出し要求でマージが不当に遅延するリスクの排除。

## 4. スコープの定義 (Scope & Boundaries)
- **スコープ内 (In-Scope)**:
  - `fleet_dor_auditor.md` の新設。
  - `fleet_completion_auditor.md` のプロンプト刷新。
  - `template_issue.md` の受入基準フレームワーク刷新（Given-When-Then、境界値、曖昧語禁止）。
  - `branchDoRGate.js` および `prePrAuditGate.js` の強化・修正。
  - ADR-0023 策定、仕様正本、規約、チェッカー、テストの更新。
- **スコープ外 (Non-Goals)**:
  - PR レビュー時のサブエージェント同時起動数の変更（Post-Phase は従来の 2 体体制を維持）。

## 5. 受け入れ基準 (Acceptance Criteria / Definition of Done)

### 5.1. 機能受け入れシナリオ (Given-When-Then)
- **シナリオ 1: 曖昧語を含む Issue のブランチ作成拒絶 (境界値/異常系)**
  - **Given**: `issue.md` の受け入れ基準に「適切に」「よしなに」「必要に応じて」等の曖昧語が含まれている。
  - **When**: `git checkout -b` を実行する。
  - **Then**: `branchDoRGate` により物理的に拒絶（deny）され、`contains ambiguous terms` のガイダンスが出力されること。
- **シナリオ 2: 具体的シナリオを含む Issue のブランチ作成許可 (正常系)**
  - **Given**: `issue.md` に Given-When-Then 形式の具体的な受け入れシナリオが定義されている。
  - **When**: `git checkout -b` を実行する。
  - **Then**: `branchDoRGate` により正常に許可（allow）されること。
- **シナリオ 3: テンプレート注意書き引用文を含む Issue の誤拒絶防止 (境界値/正常系)**
  - **Given**: `template_issue.md` 由来の注意書き引用文（`> ⚠️ 曖昧語の禁止: 「適切に」...`）が含まれているが、シナリオ自体は具体的である。
  - **When**: `git checkout -b` を実行する。
  - **Then**: 引用文が事前除外され、誤拒絶（False Positive）されずに正常に許可されること。
- **シナリオ 4: 新フォーマット 5.2 Pre-PR DoD 未完了時の PR 作成拒絶 (異常系)**
  - **Given**: 5.1 にシナリオがあり、5.2 Pre-PR DoD に未チェック項目（`- [ ]`）が残っている。
  - **When**: `gh pr create` を実行する。
  - **Then**: `prePrAuditGate` により物理的に拒絶（deny）されること。
- **シナリオ 5: 新フォーマット 5.2 完了・5.3 未完了時の PR 作成許可 (正常系)**
  - **Given**: 5.2 Pre-PR DoD が完了（すべて `[x]`）しており、5.3 マージ前ゲートに未チェック項目がある。
  - **When**: `gh pr create` を実行する。
  - **Then**: `prePrAuditGate` により正常に許可（allow）されること。

### 5.2. PR作成前プロセス完了基準 (Pre-PR Process DoD)
- [x] 上記 5.1 の全機能受け入れシナリオを検証するハーネステストが存在し PASS すること。
- [x] 重複・パッチワーク点検（Impact & Duplication Check）が pre_verification.md に完了・記録されていること。
- [x] 4軸ドキュメント（issue, pre_verification, plan, walkthrough）が揃っていること。
- [x] ADR-0023 が策定され、docs/architecture_overview.md (SSOT) と同期していること。
- [x] フル品質ゲート（npm.cmd run check）が 100% PASS すること。

### 5.3. マージ前完了ゲート (Pre-Merge Gate)
- [x] GitHub Actions CI が PASS していること。
- [x] 2者合議レビュー（fleet_reviewer ＋ fleet_completion_auditor）による客観的再レビューで両者 LGTM を受領すること。
- [ ] 人間（ユーザー）による最終確認とマージが完了していること。

## 6. 関連ドキュメント・仕様正本 (References & SSOT)
- 事前検証記録: docs/issues/ISSUE-076_two_phase_completion_and_dor_audit/pre_verification.md
- 関連 ADR: ADR-0023
- システム仕様書: docs/architecture_overview.md
