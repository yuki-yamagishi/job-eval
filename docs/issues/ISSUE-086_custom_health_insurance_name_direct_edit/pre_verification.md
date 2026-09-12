# Issue #86 事前検証記録 (Pre-Phase Verification & Impact Check)

## 1. 重複・パッチワーク点検 (Impact & Duplication Check)

### 1.1. 既存コード・機能の横断調査
- **`src/types/job.ts`**:
  - `CorporateBenefitResearch.healthInsurance` にはすでに `name: string` プロパティが存在する。
  - 現在は `type: HealthInsuranceType` に引きずられて `name` がマスター定型文で上書きされる問題があるが、型自体の構造（`name: string`）は独自健保の実名をそのまま保持できる設計になっている。
- **`src/core/constants/healthInsurance.ts`**:
  - `inferHealthInsuranceType`: 固定 Enum（`its`, `tjk`, `corporate`, `other`, `unknown`）への分類を行っている。
  - 後方互換性のため `inferHealthInsuranceType` は維持しつつ、独自健保の実名（「〇〇健康保険組合」）が入力された場合は、それを壊さずに実名テキストをそのまま `name` として保持・活用する純粋関数を追加・拡張する。
- **`src/components/pane/PreviewPane.tsx`**:
  - 現在は `<select>` による 6 択のみで、選択時に `info.label` で実名が上書きされている。
  - ここに **「健保名の直接テキスト入力・インライン編集」** を追加し、ユーザーが実名を自由に入力・更新できるようにする。
- **`src/components/dashboard/JobDashboard.tsx`**:
  - `healthInsuranceFilter` ドロップダウンが存在するが、ユーザーフィードバックに基づきこれを削除し、UI を簡素化する。
  - 求人カードのバッジ表示は、`healthInsurance.name` または `shortLabel` を用いて、実名（例: `[サイバーエージェント健保]`, `[ITS健保]`）で表示する。
- **`src/services/ai/geminiProvider.ts` & `src/core/prompt/jobAnalysisPrompt.ts`**:
  - `buildCorporateBenefitPrompt` の出力指示において、「固定カテゴリー」ではなく「実際の企業が加入する正確な健康保険組合名」の抽出を最優先とするようにプロンプトを改修。

### 1.2. 既存設計・ADR との整合性
- **ADR-0015 (Web調査とモデル分離)**: Gemini Search Grounding を用いた企業・福利厚生調査の基盤と完全に整合。
- **ADR-0025 (福利厚生情報取得・可視化)**: Issue #80 で策定された ADR-0025 の「固定カテゴリーへの丸め込み」という過剰設計の反省に基づき、実名優先化と手動直接編集へと前進させる。

---

## 2. 変更影響範囲 (Blast Radius Analysis)

| 対象ファイル | 変更種別 | 影響内容 |
| :--- | :--- | :--- |
| `src/types/job.ts` | 参照 | 既存の `healthInsurance.name` を主役として活用（破壊的変更なし） |
| `src/core/constants/healthInsurance.ts` | 修正 | 実名バッジ名生成ユーティリティ（`getHealthInsuranceBadgeLabel`）の追加、抽出正規表現の強化 |
| `src/core/prompt/jobAnalysisPrompt.ts` | 修正 | Web調査プロンプトで会社独自の正式健保名を抽出するよう指示強化 |
| `src/services/ai/geminiProvider.ts` | 修正 | 独自健保の実名を忠実に `healthInsurance.name` へセット |
| `src/components/pane/PreviewPane.tsx` | 修正 | 健保名の直接テキスト入力・編集UIの新設、実名優先表示 |
| `src/components/dashboard/JobDashboard.tsx` | 修正 | 不要な「全健保」ドロップダウンの削除、検索バー（`matchesQuery`）への健保名追加、カードバッジの実名表示化 |
| `tests/core/healthInsurance.test.ts` | 修正・追加 | 会社独自健保の実名抽出・バッジ名生成・直接編集のテスト |
| `tests/features/PreviewPane.test.tsx` | 修正・追加 | 健保名テキスト入力・インライン編集・保存のコンポーネントテスト |
| `tests/features/JobDashboard.test.tsx` | 修正 | フィルター削除に伴うテスト更新、実名バッジ表示テスト |

---

## 3. 結論
既存のアーキテクチャを壊すことなく、過剰な大分類カテゴリーによる制約を解消し、実名優先・直接編集・UI簡素化を安全に実現可能と確認。
