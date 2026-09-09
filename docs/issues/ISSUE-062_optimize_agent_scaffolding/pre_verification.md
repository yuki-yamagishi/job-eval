# 4軸事前検証ログ: Issue #62 AI駆動開発のための補助資源最適化

## 1. 事前検証 / 技術的ボトルネック
- **課題**: `AGENTS.md` (約17KB) は毎ターン `<RULE[AGENTS.md]>` として無条件にコンテキストウィンドウへ注入され、Token Tax とレイテンシ増大を引き起こしていた。また、`issueDocChecker.js` の全4ファイル必須検証により、実装途中の中間コミットが拒否されていた。
- **検証結果**: `AGENTS.md` のうち実践 Runbook や詳細コマンドテーブルは Antigravity スキル（`.agents/skills/job-eval-harness/SKILL.md`）へ集約し、`AGENTS.md` を憲章（コアポリシー・DoD・アーキテクチャ不可侵原則）に純化することで、約 2〜3KB に圧縮可能。
- **整合性担保**: `agentSkillChecker.js` が要求する 7 つのポリシーキーワード（`Conventional Commits`, `npm run check`, `Fleet`, `docs/`, `loopState`, `resolveReview`, `DoD`）を双方に漏れなく保持させる。

## 2. UX / 開発者体験 (DX)
- **TDD・中間コミットの円滑化**: `issueDocChecker.js` に段階的検証（`--pre-commit` モード）を導入し、開発中（`walkthrough.md` 未完了）でも `issue.md` と `plan.md` さえあれば安全にコミットできるようにする。
- **クリーンなワークスペース**: ルート直下に残留していたゴミファイル（`.pr_body_18.md`, `pr_review_54.md`, `diff.txt`, `diff_utf8.txt`）を排除し、`.gitignore` で完全ブロック。

## 3. データ永続性 / 仕様 SSOT
- **仕様源の一本化**: ルートの陳腐化した旧仕様書 `requirement.md` を `docs/archive/legacy_requirement.md` へ退避し、ADR-0001〜0016 の最新アーキテクチャを体系的に俯瞰する `docs/architecture_overview.md` を新設。
- **不変性**: 既存の ADR やコアビジネスロジック（`src/core/`）の破壊・変更は一切生じない。

## 4. テスト自律性
- **品質ゲートの二重防壁**:
  - コミット時（`pre-commit`）: 高速・段階的ドキュメント検証（中間コミット可能）。
  - プッシュ・PR前（`pre-push` / `npm run check`）: 厳格フル検証（全4ファイル・ビルド・テスト・カバレッジ 100% 必須）。
- 既存の全テストスイートおよびセキュリティスキャンとの完全な互換性を維持する。
