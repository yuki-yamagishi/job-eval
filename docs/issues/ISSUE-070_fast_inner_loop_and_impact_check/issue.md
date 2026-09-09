# Issue #70: パッチワーク負債解消（真のfast化・手動全量廃止）と着手前Impact Check物理フックの導入

## 1. 解決すべき課題・背景 (Problem Statement / Why)
- **現在の問題点**:
  - `npm run check:fast` が `tsc --noEmit && vitest run`（全 200 テストの全量実行）となっており、変更箇所に閉じた「真の高速単体反復（Fast Inner Loop）」になっていない。
  - Git Pre-Push Hook と GitHub Actions CI で全量クオリティゲート（`npm run check`）が二重に配備されているにもかかわらず、Inner Loop でエージェントが重い全量チェックを手動実行して開発テンポを停滞させるパッチワーク運用が残存している。
  - 実装前の事前調査において「既存コード・共通ユーティリティ・ADRの調査（Impact & Duplication Check）」を怠ったままパッチワーク改修を重ねるリスクが、人間の注意任せ（Good intentions）になっており、物理的フック（Mechanisms）による検証が不足している。
- **放置した場合のリスク**:
  - 開発反復サイクルの鈍化、既存類似コードを無視した車輪の再発明、パッチワークによる技術的負債の増殖、エージェントの失念による重複実装。
- **なぜ今解く必要があるのか**:
  - グローバル開発憲章（Global Rules: `~/.gemini/GEMINI.md`）で「Good intentions don't work. Mechanisms do.」「Inner Loop と Outer Loop の分離」「Impact & Duplication Check」を定めた直後であり、JobEval のハーネスおよび開発プロセスを最上位規約に完全に合致させるため。

## 2. 期待される成果と価値 (Desired Outcome / Value)
- `npm run check:fast` / `test:fast` が真に対象ファイルにスコープされたミリ秒単位の高速反復となり、思考のテンポが極大化される。
- ブランチ作成時に、`preToolHook.js`（Block 3D）が「Impact & Duplication Check（重複・パッチワーク点検）」の完了を物理検証し、形骸化を根絶する。
- 全量テスト・ビルド・セキュリティ検査は Outer Loop（Git Hook & CI）に一本化され、冗長性と開発負荷が排除される。

## 3. 排除するリスク (Risks to Eliminate)
1. **パッチワーク・重複実装リスクの排除**: 既存基盤を調べずに新規コードをつぎはぎする行為を、着手前フックで物理遮断。
2. **Inner Loop 停滞リスクの排除**: 軽微な修正のたびに重い全量ビルドや全テストを回す非効率を排除。
3. **精神論（Good intentions）の排除**: 「気をつけます」という約束ではなく、フックによる物理拒絶でガバナンスを担保。

## 4. スコープの定義 (Scope & Boundaries)
- **スコープ内 (In-Scope)**:
  - `package.json`: 高速 Inner Loop スクリプトの適正化（`check:fast` / `test:fast`）
  - `.agents/hooks/preToolHook.js`: Block 3D（Impact & Duplication Check 物理検査）の追加
  - `docs/issues/template_issue.md` および `template_pre_verification.md` の制定・更新
  - `docs/adr/0020-fast-inner-loop-and-pre-impact-check.md` の制定
  - `AGENTS.md`, `docs/architecture_overview.md`, `.agents/skills/` の同期
  - `tests/harness/hooks.test.ts` への Block 3D 検査テスト追加
- **スコープ外 (Non-Goals)**:
  - アプリケーション本体（UI/Coreロジック）の機能追加

## 5. 受け入れ基準 (Acceptance Criteria / Definition of Done)
- [x] `package.json` にて Inner Loop 向けの真に高速なテスト反復が定義されていること。
- [x] `preToolHook.js` の Block 3D により、Impact Check 未実施のブランチ作成が具体的な英語ガイダンスとともに物理拒絶されること。
- [x] `preToolHook.js` の Block 3D を網羅検証する単体テストが `tests/harness/hooks.test.ts` に追加されていること。
- [x] `docs/issues/` に 4軸ドキュメント（issue, pre_verification, plan, walkthrough）が揃い、Impact Check が記録されていること。
- [x] ADR-0020 が制定され、仕様SSOT（`docs/architecture_overview.md`）および `AGENTS.md` に同期されていること。
- [x] ワンショット品質ゲート（`npm.cmd run check`）が 100% PASS すること。
- [x] 2者合議レビュー（`fleet_reviewer` ＋ `fleet_completion_auditor`）から両者 `[LGTM]` を受領すること。

## 6. 関連ドキュメント・仕様正本 (References & SSOT)
- 関連 ADR: ADR-0020
- 仕様正本: `docs/architecture_overview.md`
- 最上位憲章: `~/.gemini/GEMINI.md` (Global Rules)
