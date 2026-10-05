# Issue #92: safetyGuard の非対話テスト実行ガード強化へのハーネステスト追従とサブモジュール同期

## 1. 解決すべき課題・背景 (Why)
- **現在の問題点**:
  - `antigravity-review-loop` サブモジュールの最新コミット（`7b84f41` / PR #6）において、安全ガード `safetyGuard.js` にプロセスハング防止の強化（Issue #5）が導入された。
  - npm のコマンドライン解釈仕様上、`npm test --run` のフラグは npm 自身の設定として消費され、テストランナー（Vitest / Jest）に対話的解除フラグがフォワードされず、結果として watch モードでプロセスが永久ハングする重大リスクが存在した。
  - プラグイン側ではこれを防ぐため、`--` で引数をフォワードする形式（例: `npm test -- --run`, `npm test -- --watch=false`）または専用スクリプト（`npm run test:run`, `npm run test:fast` 等）のみを許可（`allow`）し、フラグ未フォワードの `npm test --run` を拒絶（`deny`）するよう強化された。
  - しかし、JobEval 側の統合テスト `tests/harness/hooks.test.ts` には古い仕様のアサーション（`npm test --run` が `allow` であることの期待値）が残っていた。
  - そのため、定期自動更新ワークフロー `Update antigravity-review-loop Submodule`（Run 37257227481）において、サブモジュール更新後の検証ゲート `npm run check` が `AssertionError: expected 'deny' to be 'allow'` で失敗し、同期 PR 起票がブロックされている。
- **放置した場合のリスク**:
  - `antigravity-review-loop` の定期自動更新ワークフローが毎回失敗し続け、今後のセキュリティ修正・ガード改善が自動同期されなくなる。
  - JobEval 側でエージェントが誤って `npm test --run` を実行した場合に、テストハング防止ガードが意図通り機能しているかをハーネステストで正しく保証できない。
- **なぜ今解く必要があるのか**:
  - ワークフロー障害により自動同期パイプラインが停止しており、早急に JobEval のテストをアップストリームの最新ガード仕様に整合させ、サブモジュールを最新コミットに同期して自動化ループを正常復帰させる必要がある。

## 2. 期待される成果と価値 (Desired Outcome / Value)
- `tests/harness/hooks.test.ts` がアップストリームの最新ガード仕様と完全に整合し、`npm test --run` の拒絶と `npm test -- --run` の許可が正しくテスト検証される。
- サブモジュール `.agents/plugins/antigravity-review-loop` が最新コミット（`7b84f41`）に同期される。
- フル品質ゲート `npm.cmd run check` が全件 100% PASS し、自動同期ワークフローの健全性が回復する。

## 3. 排除するリスク (Risks to Eliminate)
- **テストランナー対話的ハングリスク**:
  - `npm test --run` が安全ガードによって確実に `deny` され、エージェントに対話ハングを防止する Remediation（`npm test -- --run` または `npm run test:run` の使用）が案内されることをテストで恒久保証する。
- **プラグインとホストリポジトリの仕様乖離リスク**:
  - プラグインの最新ガード挙動と JobEval 側のテスト期待値の乖離を解消し、サブモジュール更新時の回帰・品質ゲート破損を防止する。
- **テスト弱体化・安易な削除の排除**:
  - テストを単純に削除するのではなく、アップストリームの強化理由（npm の引数フォワード仕様）に合致するよう「未フォワードは拒絶」「フォワード済みは許可」という双方向の厳格な検証ケースとして再構築する。

## 4. スコープの定義 (Scope & Boundaries)
- **スコープ内 (In-Scope)**:
  - `tests/harness/hooks.test.ts` の `safetyGuard` テストケース更新（`npm test -- --run` の許可確認、`npm test --run` の拒絶確認）。
  - サブモジュール `.agents/plugins/antigravity-review-loop` の最新コミット（`7b84f41`）への更新。
  - フル品質ゲート `npm.cmd run check` の完全合格。
- **スコープ外 (Non-Goals)**:
  - プラグイン内部コードの再改修（プラグイン側ですでに Issue #5 / PR #6 として実装・テスト検証済み）。
  - JobEval 本体のアプリケーション機能（JobDashboard 等）の変更。

## 5. 受け入れ基準 (Acceptance Criteria / Definition of Done)

### 5.1. 機能受け入れシナリオ (Feature-specific Acceptance Criteria: Given-When-Then)
- **シナリオ 1: フォワードフラグおよび専用スクリプトの許可（正常系）**
  - **Given (前提)**: `CommandLine` に `npm test -- --run`, `npm.cmd test -- --run`, `npm test -- --watch=false`, `npm run test:run`, `npm run test:fast`, `npm run test:coverage` 等の非対話テスト実行コマンドが指定される。
  - **When (操作・入力)**: `handleSafetyGuard` が実行される。
  - **Then (期待結果)**: `result.decision` が `'allow'` を返すこと。
- **シナリオ 2: 未フォワードフラグの拒絶（異常系・防護）**
  - **Given (前提)**: `CommandLine` に `npm test --run`, `npm test --watch=false`, `npm.cmd test --no-watch`, `npm test` 等の未フォワードまたは対話的テストコマンドが指定される。
  - **When (操作・入力)**: `handleSafetyGuard` が実行される。
  - **Then (期待結果)**: `result.decision` が `'deny'` を返し、`result.reason` に `'Interactive test runner detected'` および `--` を用いたフラグフォワードの案内が含まれること。
- **シナリオ 3: サブモジュール最新化後のフル品質ゲート合格（統合検証）**
  - **Given (前提)**: サブモジュールが `7b84f41` に更新され、`tests/harness/hooks.test.ts` が修正されている。
  - **When (操作・入力)**: `npm.cmd run check` が実行される。
  - **Then (期待結果)**: セキュリティ検査、ドキュメント検査、型検査、全単体テスト（27ファイル 244件以上）、プロダクションビルドがすべて exit code 0 でパスすること。

### 5.2. PR作成前プロセス完了基準 (Pre-PR Process DoD)
- [x] `tests/harness/hooks.test.ts` が修正され、非対話テストコマンドの allow/deny 判定が最新仕様通り検証されていること。
- [x] サブモジュール `.agents/plugins/antigravity-review-loop` が最新コミット（`7b84f41`）に更新されていること。
- [x] 重複・パッチワーク点検（Impact & Duplication Check）が `pre_verification.md` に記録されていること。
- [x] 4軸ドキュメント（`issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md`）が完備されていること。
- [x] フル品質ゲート（`npm.cmd run check`）が 100% PASS すること。

### 5.3. マージ前完了ゲート (Pre-Merge Gate)
- [ ] GitHub Actions CI が PASS していること。
- [ ] 2者合議レビュー（`fleet_reviewer` ＋ `fleet_completion_auditor`）による客観的レビューを受領し両者 LGTM となること。
- [ ] 人間（ユーザー）による最終確認とマージが完了していること。

## 6. 関連ドキュメント・仕様正本 (References & SSOT)
- 事前検証記録: `docs/issues/ISSUE-092_sync_safety_guard_submodule/pre_verification.md`
- 関連 PR: `yuki-yamagishi/antigravity-review-loop` PR #6 (`7b84f41`)
- 関連 ワークフロー: `.github/workflows/update-review-loop-submodule.yml`
- 仕様正本: `docs/architecture_overview.md`
