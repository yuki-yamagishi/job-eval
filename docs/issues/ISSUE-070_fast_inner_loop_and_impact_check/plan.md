# Issue #70: 実装計画書 (Implementation Plan)

## 1. 改修の目的
- グローバル開発憲章（Global Rules: `~/.gemini/GEMINI.md`）の「Mechanisms do」「Inner/Outer Loop 分離」「Impact & Duplication Check」を JobEval ハーネスに物理実装する。
- 開発中の Inner Loop を真に高速化し、ブランチ作成前のパッチワーク・重複調査を Hook で強制する。

## 2. 変更対象ファイルと責務

### 2.1 テンプレート層
- **[NEW] `docs/issues/template_pre_verification.md`**:
  - 事前検証記録の標準テンプレート。現状の課題分析、Impact & Duplication Check（既存コード・共通基盤・AST・重複調査）、改修方針の 3 軸を必須化。
- **[MODIFY] `docs/issues/template_issue.md`**:
  - `pre_verification.md` との連動および Impact Check への言及を追加。

### 2.2 ガードレール・フック層
- **[MODIFY] `.agents/hooks/preToolHook.js`**:
  - Block 3D「Impact & Duplication Check 物理検査」の実装。
  - `git checkout -b` / `git switch -c` 実行時に、`targetIssueDir/pre_verification.md` が存在し、かつ「重複・パッチワーク点検 (Impact & Duplication Check)」セクションが記述されているかを検証。
  - 満たさない場合はブランチ作成を物理拒絶し、具体的な英語 Remediation Guidance を表示。

### 2.3 開発スクリプト & Runbook 層
- **[MODIFY] `package.json`**:
  - `"check:fast"`: `tsc --noEmit`（型整合性の瞬時確認）に純化、または `"test:related": "vitest related --run"` の追加。
  - Inner Loop での高速 TDD 反復を支援。
- **[MODIFY] `.agents/skills/dev-lifecycle/SKILL.md`**:
  - Inner Loop（Fast/Targeted Tests）と Outer Loop（Git Hook & CI）の明確な分離を Runbook に明記。
- **[MODIFY] `.agents/skills/issue-lifecycle/SKILL.md`**:
  - ブランチ作成前の DoR に Block 3D（Impact Check）の要件を明記。

### 2.4 テスト層
- **[MODIFY] `tests/harness/hooks.test.ts`**:
  - Block 3D の単体テスト 3 件（pre_verification.md 欠落拒絶、Impact Check セクション欠落拒絶、合格時通過）を追加。

### 2.5 仕様正本 & ADR 層
- **[NEW] `docs/adr/0020-fast-inner-loop-and-pre-impact-check.md`**:
  - ADR-0020 制定。
- **[MODIFY] `docs/adr/README.md`**:
  - ADR-0020 の索引追加。
- **[MODIFY] `docs/architecture_overview.md`**:
  - ハーネス仕様・ADR履歴・Inner/Outer Loop 設計の同期。
- **[MODIFY] `AGENTS.md`**:
  - 仕様正本記述（ADR-0001〜0020）および開発規約の同期。

## 3. 実装・検証手順
1. `template_pre_verification.md` 作成 & `template_issue.md` 更新
2. `preToolHook.js` に Block 3D 実装
3. `tests/harness/hooks.test.ts` にテスト追加し、TDD で検証
4. `package.json` のスクリプト整理 & `dev-lifecycle/SKILL.md`, `issue-lifecycle/SKILL.md` 更新
5. ADR-0020 作成 & 仕様正本（`architecture_overview.md`, `AGENTS.md`）同期
6. ワンショット品質ゲート（`npm.cmd run check`）の実行確認
