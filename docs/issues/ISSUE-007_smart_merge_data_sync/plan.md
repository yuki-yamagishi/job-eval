# Phase 16: 求人・プロファイルデータのスマートマージとコンフリクト解消 実装計画書 (Issue #7, ADR-0007)

## 🎯 実装目的・概要
複数端末（PC・スマートフォン）間でデータ同期を行う際、PC[A, C] と スマホ[A, B] のように別々の求人やプロファイル編集が存在する場合でも、データが上書き消失することなく、**IDベースで自動合体（和集合 [A, B, C]）し、重複求人は最新更新日時を優先採用するスマートマージ機能** を実装します。

---

## 📝 変更ファイル一覧と実装内容

### 1. コアスマートマージロジックの実装（純粋関数）
- **`src/core/sync/smartMerge.ts`**:
  - `mergeJobs(localJobs, remoteJobs)`: IDベースの和集合マージ、更新日時（`updatedAt` / `analysisDate`）に基づく最新版採用、評価履歴（`evaluationHistory`）の重複排除統合、ソート順維持。
  - `mergeProfile(localProfile, remoteProfile)`: タイムスタンプ比較、スキルリスト（`skills`）および資格リスト（`certifications`）のID/名称ベース和集合マージ、APIキー保持。

### 2. 同期サービス & ストレージアダプターへの統合
- **`src/services/sync/cloudSyncService.ts`**:
  - `notifyJobsChanged` および受信ハンドラーで `mergeJobs` を適用し、双方向で完全な最新データセットを保持。
  - `notifyProfileChanged` で `mergeProfile` を適用。

### 3. 単体テストの作成
- **`tests/core/smartMerge.test.ts`**:
  - [A, C] と [A, B] のマージで [A, B, C] が返ることの検証。
  - 同一求人Aのステータス変更時、最新日時の値が採用されることの検証。
  - プロファイルのスキル・資格リストの重複排除マージ検証。

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check`（シークレットスキャン + ドキュメント整合性 + TypeScript型検査 + 全単体UIテスト + 本番ビルド）を実行し、全件 PASS を確認。
2. Git コミット・PR作成（`Closes #7`）を実施。

---
