# Phase 24: プロファイル設定で削除したスキル・資格がクラウド同期で復活する不具合の修正 実装計画書 (Issue #24)

## 🎯 実装目的・概要
ユーザーがプロファイル設定画面でスキルや保有資格（「AWS」「AZ-305」等）を削除して保存した際、古いプロファイルデータ（Cloudflare D1 や別端末）と同期された際に削除した項目が UNION 結合によって勝手に復活してしまうバグを解消します。プロファイルのマージ原則を Last-Write-Wins（最新タイムスタンプ優先）に是正し、削除操作が確実に全端末へ反映・永続化されるようにします。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/core/sync/smartMerge.ts`
- **`mergeProfile` 関数の改修**:
  - `skills` と `certifications` を古いプロファイルから UNION 結合する処理を撤廃。
  - 最新のタイムスタンプを持つ `baseProfile` の `skills`、`certifications`、`conditions`、`name`、`title`、`summary`、`yearsOfExperience` をそのまま正（Single Source of Truth）として採用。
  - `apiSettings.geminiApiKey` のみ、新しい側で空文字かつ古い側に入力がある場合のフォールバック保持を維持。

### 2. `tests/core/smartMerge.test.ts`
- スキルや資格を削除した新しいプロファイルが、古いプロファイルとマージされた際に削除状態を維持（復活しないこと）を検証するテストを追加。

---

## 🧪 検証手順
1. `npm run check` による品質ゲート（全18テストファイル86件、型検査、シークレット検査、ビルド）の 100% PASS を確認。
2. Git コミット・PR作成（`Closes #24`）を実施。
3. `main` マージ後、Cloudflare Pages へ本番デプロイ。

---
