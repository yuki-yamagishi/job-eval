# Issue #72: AGY公式仕様準拠のライフサイクルフック責務分離とプラグイン化下準備

## 1. 解決すべき課題・背景 (Problem Statement / Why)
- **現在の問題点**:
  - `preToolHook.js`（254行）に、ツール安全性（`gh pr merge` 禁止）、開発環境保護（インタラクティブテスト抑止）、ブランチ作成着手品質（DoR / Why-First / 重複点検）、PR提出品質（4軸書類完備 / Pre-PR DoD / ADR同期）という、4つの異なる関心事が単一ファイル・関数に直列ベタ書きされ、単一肥大化（God Hook）している。
  - `hooks.json` が `"loop-engineering-gate"` という単一キーにまとまっており、AGY 公式仕様（`https://antigravity.google/docs/hooks/`）で定義されている「名前付きキーによる目的別分割」および「フック単位での個別無効化（`"enabled": false`）」の機能が活用できない。
  - 4軸ドキュメントの整合性検査が `preToolHook.js` と `scripts/checkers/issueDocChecker.js` で重複実装されていたが、プラグイン化を見据えて `.agents/` 内でハンドラーを自己完結させ、プロジェクトの `scripts/` に依存させない境界設計（Self-contained Boundary Design）の確立が求められていた。
- **放置した場合のリスク**:
  - フックの修正や機能追加のたびに巨大ファイルを編集する必要があり、デッドロックや意図しない拒絶などのバグ混入リスクが高まる。
  - 将来、自律レビューループ機構を独立プラグイン（Plugin）として GitHub に切り出す際に、ハードコードされたパスや Monolithic な構造が障壁となる。
- **なぜ今解く必要があるのか**:
  - 現在 `tests/harness/hooks.test.ts`（755行）という強固な安全ネットが整っており、安全にリファクタリングを実施できる最善のタイミングである。
  - プラグイン化の前に `job-eval` 内で責務分割を完了させておくことで、プラグイン化作業時のトラブルシューティングが極めて容易になる。

## 2. 期待される成果と価値 (Desired Outcome / Value)
- `hooks.json` が AGY 公式スキーマに完全準拠し、`safety-guard`, `branch-dor-gate`, `pre-pr-audit-gate`, `review-loop-guard` に名前付き分割される。
- 各フックのロジックが独立したハンドラー（`hooks/handlers/`）にモジュール化され、単一責任の原則（SRP）が確立される。
- 既存の安全ガード（`gh pr merge` 禁止、停止ガード、DoR 検査等）の振る舞いが 100% 完全に維持され、`tests/harness/hooks.test.ts` が全件合格する。

## 3. 排除するリスク (Risks to Eliminate)
- **既存ガードレールの退行（リグレッション）リスク**:
  - 分割によって、マージ禁止や早期停止ガードが機能しなくなるリスク。
  - ➔ **対策**: 既存の 755 行の包括的単体テスト（`tests/harness/hooks.test.ts`）を Inner Loop でミリ秒反復実行し、100% PASS を確認する。
- **パス解決の齟齬によるフック例外リスク**:
  - ハンドラー分割により CWD や相対パス解決が狂い、フックがクラッシュするリスク。
  - ➔ **対策**: 共通の `projectRoot` 解決関数を一元化し、直接 CLI 実行とテストインポートの両方で正しくパスが解決されることをテストで検証する。
- **ドキュメント検査ロジックの不整合リスク**:
  - 共通化により、Git コミット時や PR 作成時の判定基準が乖離するリスク。
  - ➔ **対策**: コア検査ロジックを共通化し、`npm run check` のフル品質ゲートで完全パスを確認する。

## 4. スコープの定義 (Scope & Boundaries)
- **スコープ内 (In-Scope)**:
  - `hooks.json` の名前付きフック分割（`safety-guard`, `branch-dor-gate`, `pre-pr-audit-gate`, `review-loop-guard`）。
  - `.agents/hooks/handlers/` へのハンドラーモジュール切り出し（`safetyGuard.js`, `branchDoRGate.js`, `prePrAuditGate.js`, `postPrCreate.js`）。
  - `preToolHook.js` のファサード / 互換レイヤー化。
  - `stopHook.js` のパス解決の堅牢化。
  - `tests/harness/hooks.test.ts` の更新（新ハンドラーおよび分割フックのテスト追加・既存テスト互換維持）。
- **スコープ外 (Non-Goals)**:
  - 独立 GitHub リポジトリ（`antigravity-loop-plugin`）の作成と push（本 Issue 完了後の次フェーズ）。
  - `job-eval` アプリケーションコード（`src/`）の変更。

## 5. 受け入れ基準 (Acceptance Criteria / Definition of Done)

### 5.1. PR作成前完了基準 (Pre-PR DoD)
- [x] `hooks.json` が AGY 公式仕様に基づき 4 つの名前付きフックに分割されていること。
- [x] 各フックのハンドラーが `.agents/hooks/handlers/` に単一責任でモジュール化されていること。
- [x] `preToolHook.js` が各ハンドラーをオーケストレーションし、既存インターフェースの後方互換性を完全に保っていること。
- [x] `tests/harness/hooks.test.ts` が全件 PASS すること。
- [x] 重複・パッチワーク点検（Impact & Duplication Check）が `pre_verification.md` に記録されていること。
- [x] 4軸ドキュメント（`issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md`）が完備されていること。
- [x] フル品質ゲート（`npm.cmd run check`）が 100% PASS すること。

### 5.2. マージ前完了ゲート (Pre-Merge Gate)
- [ ] GitHub Actions CI が PASS していること。
- [ ] 2者合議レビュー（`fleet_reviewer` ＋ `fleet_completion_auditor`）による客観的再レビューで両者 LGTM を受領すること。
- [ ] 人間（ユーザー）による最終確認とマージが完了していること。

## 6. 関連ドキュメント・仕様正本 (References & SSOT)
- 事前検証記録: `docs/issues/ISSUE-072_refactor_lifecycle_hooks_separation/pre_verification.md`
- 関連 ADR: `docs/adr/0017-optimize-agent-scaffolding-and-gradual-verification.md`, `docs/adr/0020-fast-inner-loop-and-pre-impact-check.md`, `docs/adr/0021-lifecycle-hooks-modular-separation.md`
- 影響を受けるアーキテクチャ設計書: `docs/architecture_overview.md`
