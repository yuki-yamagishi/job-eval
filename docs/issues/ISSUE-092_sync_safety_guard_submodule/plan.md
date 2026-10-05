# Issue #92: 実装計画書 (Implementation Plan)

## 1. 改修の目的・概要
- `antigravity-review-loop` サブモジュールの最新コミット（`7b84f41`）で導入された非対話テスト実行ガード強化に `tests/harness/hooks.test.ts` を追従させる。
- サブモジュールを最新コミットに同期し、フル品質ゲート `npm.cmd run check` を全項目パスさせる。

## 2. タスク分解と実装ステップ

### Step 1: テストコード改修 (TDD Inner Loop)
- **対象ファイル**: `tests/harness/hooks.test.ts`
- **作業内容**:
  1. `denies interactive test runner` テストケース（243-271行目付近）に以下のアサーションを追加：
     - `npm test --run`（未フォワード）が `deny` され、理由に `'Interactive test runner detected'` が含まれること。
     - `npm test --watch=false`（未フォワード）が `deny` されること。
     - `npm.cmd test --watch=false`（未フォワード）が `deny` されること。
  2. `allows non-hanging test commands` テストケース（273-337行目付近）を更新：
     - 古い `npm test --run` の期待値を削除。
     - フラグフォワードされた `npm test -- --run` および `npm.cmd test -- --run`、`npm test -- --watch=false` が `allow` と判定されることをアサート。
     - 既存の専用スクリプト（`npm run test:run`, `npm run test:fast`, `npm run test:coverage`, `npm run test:related` 等）の `allow` 検証を維持。

### Step 2: サブモジュールの最新化
- **対象**: `.agents/plugins/antigravity-review-loop`
- **作業内容**:
  - `git submodule update --remote --merge .agents/plugins/antigravity-review-loop` を実行し、コミット `7b84f41` に同期。

### Step 3: Inner Loop 高速反復検証
- **コマンド**: `npm.cmd run test:run`（または `npm.cmd run test:fast`）
- **確認事項**:
  - `tests/harness/hooks.test.ts` が 100% PASS すること。
  - 全単体テストがグリーンになること。

### Step 4: 成果物ドキュメントの記録
- **対象**: `docs/issues/ISSUE-092_sync_safety_guard_submodule/walkthrough.md`
- **作業内容**:
  - 改修内容、差分、テスト結果、排除されたリスクを詳細に記録。

### Step 5: Outer Loop 包括的品質ゲート検証
- **コマンド**: `npm.cmd run check`
- **検証項目**:
  - シークレットスキャン (`securityCheck.js`)
  - ドキュメント & スキル整合性検査 (`docCheck.js`, `agentSkillChecker.js`)
  - TypeScript 厳格型検査 (`tsc --noEmit`)
  - 全単体テスト & カバレッジ (`vitest run --coverage`)
  - Vite 本番ビルド (`vite build`)

### Step 6: コミット & PR 作成
- Conventional Commits に準拠して段階的コミット。
- `gh pr create` を実行して PR を作成。
- `fleet_reviewer` および `fleet_completion_auditor` による客観的合議レビューを受領。
