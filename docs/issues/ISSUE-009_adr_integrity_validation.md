# [Issue] 品質ゲート（docCheck.js）における ADR 一覧（docs/adr/README.md）整合性の自動検証機能の追加

- **ステータス**: オープン (To Do)
- **優先度**: 中 (Medium)
- **カテゴリ**: 開発ハーネス, CI/CD, 品質ゲート
- **対象プラットフォーム**: 全プラットフォーム

---

## 📌 課題の概要 (Problem Description)

現在の品質ゲート（`scripts/docCheck.js`）は、`docs/pre_phase_verification.md`, `docs/implementation_plan.md`, `docs/walkthrough.md` の3ファイルのみを検証対象としており、`docs/adr/` 配下に新しく作成された個別 ADR ファイル（`0006-...md`, `0007-...md` など）が `docs/adr/README.md` の一覧テーブルに登録されているかを検証する仕組みが存在しなかった。

そのため、開発プロセス中に個別 ADR を作成しても、親ディレクトリのインデックス目次（`docs/adr/README.md`）への追記が漏れてしまうリスクがある。

---

## 🎯 要件定義 (Requirements)

### 1. `scripts/docCheck.js` の検証対象拡張
- `docs/adr/` 配下に存在するすべての ADR ファイル（`0000-template.md` および `README.md` を除く）を取得。
- `docs/adr/README.md` の内容に、各 ADR のファイル名または ADR 番号（例: `ADR-0001`, `ADR-0007`）が記載されているかを機械的に突合。
- 未登録の ADR が存在する場合、エラー詳細を出力してビルド/コミットを中断（`process.exit(1)`）。
- 全件登録されている場合は検証成功ログを出力。

---

## ✅ 受け入れ基準 (Acceptance Criteria)

- [ ] `docs/adr/` 配下の ADR ファイルと `docs/adr/README.md` のテーブルが 100% 一致していることを自動検証できること。
- [ ] 万が一 `README.md` への記載が漏れた場合、`npm run check` が失敗してブロックすること。
- [ ] `npm run check` が正常に PASS すること。
