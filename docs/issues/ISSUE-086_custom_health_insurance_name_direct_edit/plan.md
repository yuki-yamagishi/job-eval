# Issue #86 実装計画書: 会社独自健保の実名抽出・表示および直接編集の実装と不要な大分類フィルターの全廃

## 1. 実装概要
Issue #86 に基づき、健康保険情報における「固定カテゴリーへの丸め込み」と「不要な大分類フィルター」を全廃し、会社独自の健康保険組合（単一健保等）の実名をありのまま取得・表示・直接編集できるシンプルなアーキテクチャへと刷新します。

---

## 2. 変更ファイルと責務分割

### 2.1. コアロジック (`src/core/`)
- `src/core/constants/healthInsurance.ts`:
  - 健保名テキストからのバッジ表示用ラベル生成純粋関数 `getHealthInsuranceBadgeLabel` の実装（長大な正式名称を「〇〇健保」に短縮、または truncate ＋ title属性ツールチップ）。
  - `extractHealthInsuranceFromText` の正規表現強化（「〇〇健康保険組合」「〇〇健保組合」の実名パターンを丸めずに直接抽出）。
- `src/core/prompt/jobAnalysisPrompt.ts`:
  - `buildCorporateBenefitPrompt` において、固定カテゴリー（`type`）よりも「実際の健康保険組合の正式名称（実名）」を忠実に調査・出力するよう指示を強化。

### 2.2. AI サービス層 (`src/services/ai/`)
- `src/services/ai/geminiProvider.ts`:
  - Web調査結果のパース時、取得した実名（`rawHealthName`）を壊さずに `healthInsurance.name` へ忠実に設定。
- `src/services/ai/mockAiProvider.ts`:
  - テストおよびオフライン用モックプロバイダーにおいて、会社独自健保の実名モックデータを返却。

### 2.3. UI コンポーネント層 (`src/components/`)
- `src/components/pane/PreviewPane.tsx`:
  - 固定のドロップダウンによる名前上書きを廃止。
  - 実名（`healthInsurance.name`）を主役として大きく表示。
  - **健保名テキスト直接入力・編集UI** を新設（空文字・空白バリデーション付き、代表的健保 ITS/TJK/協会けんぽ のワンクリックチップ支援）。
  - 保存時に `healthInsurance.name` を更新し、親コンポーネント（`onUpdateJob`）経由で即座にローカル保存。
- `src/components/dashboard/JobDashboard.tsx`:
  - 不要な「全健保」ドロップダウンフィルター（`healthInsuranceFilter`）を削除。
  - フリーワード検索（`matchesQuery`）の対象に健保名（`benefitResearch.healthInsurance.name`）を追加統合。
  - 求人カード上のバッジを、固定の「自社健保」等ではなく実名（`getHealthInsuranceBadgeLabel`）で表示。

### 2.4. 仕様正本・ドキュメント (`docs/`)
- `docs/adr/0028-custom-health-insurance-name-and-direct-edit.md`: ADR 策定。
- `docs/adr/README.md`: ADR-0028 登録。
- `docs/architecture_overview.md`: 仕様正本同期。
- `docs/issues/ISSUE-086_custom_health_insurance_name_direct_edit/walkthrough.md`: 成果物記録。

---

## 3. テスト計画 (TDD Inner Loop)
- `tests/core/healthInsurance.test.ts`:
  - 独自健保名（「サイバーエージェント健康保険組合」等）のバッジ短縮名生成テスト。
  - 20文字以上の長大健保名のレイアウト保護（truncate）テスト。
  - 求人テキストからの実名抽出テスト。
- `tests/features/JobDashboard.test.tsx`:
  - フィルター削除後の検索バーによる健保名ヒットテスト（「ITS」「サイバーエージェント」でヒット）。
  - 実名バッジ表示テスト。
- `tests/features/PreviewPane.test.tsx`:
  - 健保名テキスト入力・インライン編集・保存テスト。
  - 空文字入力時のバリデーション抑止テスト。
