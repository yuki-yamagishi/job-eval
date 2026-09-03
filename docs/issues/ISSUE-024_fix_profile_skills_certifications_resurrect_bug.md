# [Bug] プロファイル設定で削除したスキル・資格（AWS, AZ-305等）がクラウド同期・スマートマージで復活する不具合の修正

- **ステータス**: 🔵 着手可能 (`status: ready`)
- **優先度**: 高 (High / Critical Bug)
- **カテゴリ**: `type: bug`, プロファイル, クラウド同期, E2EE, スマートマージ
- **対象プラットフォーム**: 全プラットフォーム (Web / Mobile / Desktop)

---

## 📌 課題の概要 (Problem Description)

ユーザーがプロファイル設定画面から保有資格やスキル（例: 「AWS Certified Solutions Architect - Professional」「AZ-305: Azure Solutions Architect Expert」など）を削除して保存しても、時間が経つと勝手に元の状態に戻ってしまう（削除した項目が復活する）現象が発生していた。

### 根本原因
- `src/core/sync/smartMerge.ts` の `mergeProfile` 関数において、ローカルプロファイルとリモート（Cloudflare D1 または別端末）プロファイルを統合する際、**古いプロファイルの `skills` と `certifications` を新しいプロファイルと無条件に UNION 結合（和集合）** していた。
- そのため、片方の端末でユーザーがスキルや資格を「削除」して保存（`updatedAt` が新しいプロファイルを生成）しても、クラウド D1 や別端末に残っている過去のプロファイルから削除したはずの項目がゾンビのように合体・復活してローカルストレージに上書き保存されていた。

---

## 🎯 要件定義 (Requirements)

### 1. `mergeProfile` の Last-Write-Wins (LWW) 原則への是正 (`src/core/sync/smartMerge.ts`)
- プロファイルはユーザーの単一の設定状態であるため、**タイムスタンプ（`updatedAt`）が新しいプロファイル（`baseProfile`）のスキル（`skills`）・資格（`certifications`）・希望条件（`conditions`）を正（Single Source of Truth）として完全採用**する。
- 古いプロファイル（`secondaryProfile`）から削除済み要素を復活させない。
- ただし、端末間での誤消失を防ぐため、Gemini APIキー（`apiSettings.geminiApiKey`）のみ、新しい側で未入力かつ古い側に入力がある場合に限りフォールバック保持する。

### 2. 単体テストの改修 & 回帰テストの追加 (`tests/core/smartMerge.test.ts`)
- スキルや資格の削除操作が、過去の古いプロファイルとの同期によって復活しないことを検証するテストケースを追加。
- 既存の全テスト（18ファイル 86件）がすべて合格すること。

---

## ✅ 受け入れ基準 (Acceptance Criteria)

- [ ] プロファイル設定でスキルや資格を削除して保存した後、古いプロファイルとマージされても削除した項目が復活しないこと。
- [ ] Gemini APIキーは引き続き端末間で適切に保護・引き継ぎされること。
- [ ] `npm run check`（シークレットスキャン、ドキュメント検査、TypeScript型検査、全単体UIテスト、本番ビルド）がすべて 100% PASS すること。
- [ ] Cloudflare Pages にデプロイされ、本番環境で修正が稼働すること。
