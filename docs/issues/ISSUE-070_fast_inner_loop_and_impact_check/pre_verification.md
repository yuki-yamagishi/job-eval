# Issue #70: 事前検証記録 (Pre-Verification)

## 1. 検証日時
2026-09-09

## 2. 現状の課題分析 (Problem Analysis)
- **問題 1: Inner Loop の全量テスト実行による鈍化**
  - `package.json` の `"check:fast": "tsc --noEmit && vitest run"` は 200 テストすべてを実行しており、単一機能の反復に適していない。
  - Git Pre-Push Hook (`.githooks/pre-push`) と GitHub Actions CI で `npm run check` が全量（セキュリティ、ドキュメント、型、全テストカバレッジ、本番ビルド）を保証しているため、Inner Loop で毎回全量を走らせる必要はない。
  - Inner Loop では `vitest run <target>` や `vitest related`、または高速単体テスト用スクリプトを提供するのが望ましい。
- **問題 2: 着手前 Impact & Duplication Check の物理強制の欠如**
  - エージェントが実装に着手する際、既存コードベースや共通基盤の調査をスキップして場当たり的なパッチワーク改修を行うリスクがある。
  - `preToolHook.js` の Block 3 では `issue.md` の Why / Risk の存在は検証しているが、`pre_verification.md` の存在および「Impact & Duplication Check（重複・パッチワーク点検）」の完了までは検証していない。

## 3. 重複・パッチワーク点検 (Impact & Duplication Check)
- **既存基盤・ユーティリティの調査**:
  - `preToolHook.js`: Block 3（ブランチ作成前検査）に 3A (dirty検査), 3B (LoopState検査), 3C (Why/Risk検査) が実装されている。ここに `3D (Impact & Duplication Check 検査)` を追加するのが自然かつ最も堅牢。
  - `package.json`: 既に `test:run` (`vitest run`), `test` (`vitest`) が存在。`check:fast` を真の fast（型検査＋ターゲットテスト案内、または変更関連テスト）に整理し、Runbook (`dev-lifecycle/SKILL.md`) での推奨を明確化。
  - `docs/issues/`: `template_issue.md` に加えて `template_pre_verification.md` を新設し、Impact Check のフォーマットを標準化。
- **車輪の再発明・パッチワーク防止**:
  - 新規に別のフックを作るのではなく、既存の `preToolHook.js` の Block 3 内に論理的に統合する。
  - 判定メッセージと Remediation Guidance は内外分離規約（Boundary Design）に従い英語で記述。

## 4. 改修方針 (Implementation Strategy)
1. `preToolHook.js` に Block 3D を追加：
   - `docs/issues/ISSUE-XXX/pre_verification.md` の存在を検証。
   - `## (?:3\.\s+)?(?:重複・パッチワーク点検|Impact & Duplication Check)` セクションの存在を検証。
   - 不足時はブランチ作成（`git checkout -b` / `git switch -c`）を物理拒絶し、英語ガイダンスを表示。
2. `template_pre_verification.md` を作成し、`template_issue.md` と連動させる。
3. `package.json` のスクリプト適正化と `dev-lifecycle/SKILL.md` の Inner Loop Runbook 更新。
4. `tests/harness/hooks.test.ts` に Block 3D の単体テストを追加。
5. ADR-0020 の制定と SSOT 同期。
