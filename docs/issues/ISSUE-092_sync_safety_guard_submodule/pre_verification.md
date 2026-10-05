# Issue #92: 事前検証記録 (Pre-Verification)

## 1. 検証日時
2026-10-05

## 2. 現状の課題分析 (Problem Analysis)
- **現状のコード・アーキテクチャの振る舞い**:
  - `antigravity-review-loop` サブモジュールの最新コミット（`7b84f41`）にて、安全ガード `hooks/safetyGuard.js` の `verifyNonInteractiveTestExecution` が強化された。
  - 変更前：
    ```javascript
    function verifyNonInteractiveTestExecution(commandLine) {
      if (/\bnpm(?:\.cmd)?\s+(?:run\s+)?test\b/i.test(commandLine) && 
          !/--run\b/i.test(commandLine) && 
          !/\btest:(?:run|coverage|fast|related)\b/i.test(commandLine)) {
        return { decision: 'deny', reason: "..." };
      }
      return { decision: 'allow' };
    }
    ```
    上記では `npm test --run` を実行すると `--run` が含まれるため allow されていた。しかし npm CLI は `--` のないフラグを自設定として消費するため、Vitest に渡らず watch モードのままハングする事故が発生する。
  - 変更後（最新）：
    ```javascript
    function verifyNonInteractiveTestExecution(commandLine, config = {}) {
      const allowedCommands = Array.isArray(config.allowedTestCommands) ? config.allowedTestCommands : [];
      if (allowedCommands.some((allowed) => typeof allowed === 'string' && commandLine.trim() === allowed.trim())) {
        return { decision: 'allow' };
      }

      if (/\bnpm(?:\.cmd)?\s+(?:run\s+)?test\b/i.test(commandLine)) {
        const hasForwardedFlag = /\s--\s+(?:\S+\s+)*--(?:run|watch=false|no-watch|watchAll=false|ci)(?=\s|$)/i.test(commandLine);
        const hasNonInteractiveScript = /\bnpm(?:\.cmd)?\s+run\s+test:(?:run|coverage|fast|related)\b/i.test(commandLine);

        if (hasForwardedFlag || hasNonInteractiveScript) {
          return { decision: 'allow' };
        }

        return { decision: 'deny', reason: "..." };
      }

      return { decision: 'allow' };
    }
    ```
  - 最新ロジックでは、`npm test --run` は `hasForwardedFlag`（`--` 以降のフラグ）を満たさないため `deny` される。
  - JobEval 側の `tests/harness/hooks.test.ts`（282-289行目）は `npm test --run` に対して `expect(result.decision).toBe('allow')` を期待していたため、アサーションエラーとなった。
- **根本原因 (Root Cause)**:
  - プラグインの安全ガード強化に対して、JobEval 本体の統合ハーネステストのアサーションが未追従であったこと。

## 3. 重複・パッチワーク点検 (Impact & Duplication Check)
- **既存基盤・ユーティリティ・ASTの横断調査**:
  - `tests/harness/hooks.test.ts`:
    - JobEval プロジェクトにおける自律レビューループの各種フック（`stopHook`, `safetyGuard`, `branchDoRGate`, `prePrAuditGate`, `postPrCreate`）を直接結合してテストする専用ハーネス。
    - 他のテストファイル（`tests/core/`, `tests/features/` など）にはフック判定のテストは存在せず、責務は `tests/harness/hooks.test.ts` に一元化されている。
  - プラグイン側のテスト（`antigravity-review-loop/tests/hooks.test.ts`）:
    - プラグイン側でも同様に `verifyNonInteractiveTestExecution` の allow/deny 判定がテストされており、JobEval 側のテスト構成もこれと整合している。
  - コードベース内の他のスクリプト:
    - `package.json` のスクリプト（`test:fast`, `test:run`, `test:coverage`, `test:related`）はすべて `vitest run` を直接起動する設計であり、ハングする `npm test` コマンドは内部で使用されていない。
    - ワークフローファイル（`ci.yml`, `update-review-loop-submodule.yml`）でも `npm run check` や `npm test` が使用されているが、`npm test --run` のような危険な未フォワードフラグは使われていない。
- **車輪の再発明・パッチワークの防止方針**:
  - 安易にテスト自体を削除したり無効化（skip/todo）するのではなく、最新ガード仕様（「`npm test --run` は deny」「`npm test -- --run` は allow」）を正しく網羅的にアサートするテストケースへ更新する。
  - これにより、ゼロ・アンチパターン原則（Zero Anti-Pattern Principle）および既存テストの弱体化禁止ルール（コンテキストドリフト防止）を徹底する。

## 4. 改修方針 (Implementation Strategy)
1. **`tests/harness/hooks.test.ts` の更新**:
   - `allows non-hanging test commands` テストケース内で：
     - `npm test --run` を `npm test -- --run`（フォワード済み）および `npm.cmd test -- --run` に更新し、`allow` を検証。
   - `denies interactive test runner` テストケースに：
     - フラグ未フォワードの `npm test --run` や `npm test --watch=false` が `deny` され、適切な理由（`Interactive test runner detected`）を返すことのアサーションを追加。
2. **サブモジュール `.agents/plugins/antigravity-review-loop` の最新化**:
   - 最新コミット `7b84f41` をチェックアウト。
3. **品質ゲート検証**:
   - `npm.cmd run check` を実行し、全 27 テストファイル（244テスト以上）およびビルドが完全パスすることを確認。
