# Phase 17: 品質ゲート（docCheck.js）における ADR 一覧整合性の自動検証機能の実装計画書 (Issue #9)

## 🎯 実装目的・概要
個別 ADR 作成時に `docs/adr/README.md` への追記漏れが発生するのを防ぐため、品質ゲートスクリプト（`scripts/docCheck.js`）に **`docs/adr/` 配下の全 ADR ファイルと `docs/adr/README.md` の目次テーブルを自動突合する検証ロジック** を追加します。

---

## 📝 変更ファイル一覧と実装内容

### 1. ドキュメント検証スクリプトの拡張
- **`scripts/docCheck.js`**:
  - `docs/adr/` ディレクトリ内の全 ADR（`.md` ファイル）を取得。
  - `docs/adr/README.md` のテーブル内に各 ADR が記載されているかを機械的にチェック。
  - 未登録があれば具体的なファイル名・ADR番号と修正案内を出力してエラー終了。

---

## 🧪 検証手順
1. `node scripts/docCheck.js` を実行し、全7件の ADR 登録確認ログが出力されることを確認。
2. `cmd /c npm.cmd run check` を実行し、全ゲート（セキュリティスキャン、ドキュメント整合性、TypeScript型検査、全テスト、本番ビルド）の 100% PASS を確認。
3. Git コミット・PR作成（`Closes #9`）を実施。

---
