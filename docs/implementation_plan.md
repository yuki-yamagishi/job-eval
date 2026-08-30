# Phase 6: スキル・資格ステータス管理 & 資格推薦AI & 状態同期・接続テスト 計画

ユーザーからの追加要件（保有資格と学習中・目標資格の分離、求人に応じた必要資格・追加取得推奨資格のアドバイスAI）および、プロファイル保存時の状態同期不具合の解消、API接続テスト機能の実装を行います。

---

## 提案する変更点 (Proposed Changes)

### 1. 型定義・デフォルトプロファイルの拡張
#### [MODIFY] `src/types/profile.ts`
- `CertificationItem` に `status: "acquired" | "studying" | "planned"`、`targetPeriod?: string` を追加。
- `SkillItem` に `status: "experienced" | "learning" | "interested"` を追加。

#### [MODIFY] `src/types/job.ts`
- `JobAnalysisResult` に `qualificationAdvice: { requiredCertifications: string[]; recommendedCertifications: string[]; advice: string }` を追加。

#### [MODIFY] `src/core/constants/defaultProfile.ts`
- 初期プロファイルに新ステータスを反映。

---

### 2. コアAIプロンプト & プロバイダ & Markdown生成の拡張
#### [MODIFY] `src/core/prompt/jobAnalysisPrompt.ts`
- プロンプト生成時に「取得済み資格/スキル」と「学習中・目標資格」を分けて注入。
- AIに対し、求人票で求められる資格・実務経験不足を補うための推奨資格やアピール戦略を生成するよう指示。
- `GEMINI_JOB_ANALYSIS_SCHEMA` に `qualification_advice` を追加。

#### [MODIFY] `src/services/ai/geminiProvider.ts`
- `qualification_advice` のパース・マッピング処理。
- `testGeminiConnection(apiKey, model)` 関数を追加（APIキーの疎通・有効性テスト）。

#### [MODIFY] `src/services/ai/mockAiProvider.ts`
- `qualificationAdvice` のモックデータ生成処理を追加。

#### [MODIFY] `src/core/markdown/markdownGenerator.ts`
- Frontmatter に `recommendedCertifications` を追加。
- Markdown 本文に「### 🎯 資格・スキルギャップ補強アクション」セクションを追加。

---

### 3. UI・状態管理の改修
#### [MODIFY] `src/App.tsx`
- `profile` および `saveProfile` を `ProfileSettingsView` に渡し、プロファイル保存時のグローバル同期を実現（即座に `✨ Gemini API 有効` に切り替わるよう修正）。

#### [MODIFY] `src/features/profile/ProfileSettingsView.tsx`
- Props として `profile`, `saveProfile` を受け取り同期。
- スキル設定：ステータス選択（実務経験あり / 学習中・独学）とバッジ表示。
- 資格設定：「取得済み資格」タブと「学習中・取得目標資格」タブの切り替え登録、目標時期（例: 2026年Q3）の入力。
- Gemini API 設定：「接続テスト」ボタンを追加（ローディング・成功・失敗エラーメッセージ表示）。

#### [MODIFY] `src/components/pane/PreviewPane.tsx`
- リッチプレビューに「🎯 資格・スキルギャップ補強アドバイス」カードを追加（求人必要資格、推奨取得資格、戦略アドバイスの表示）。

---

### 4. テストハーネスの更新
#### [MODIFY] `tests/core/jobAnalysisPrompt.test.ts`
- 資格ステータス分離プロンプトのテスト。

#### [MODIFY] `tests/core/markdownGenerator.test.ts`
- 資格アドバイスセクションを含むMarkdown生成テスト。

#### [MODIFY] `tests/services/geminiProvider.test.ts`
- `qualification_advice` の変換テスト。

#### [MODIFY] `tests/features/ProfileSettingsView.test.tsx`
- 資格ステータス切り替え、API接続テストボタンのUIテスト。

---

## 検証計画 (Verification Plan)

### 自動テスト
- `npm.cmd run check` (シークレット検査 + tsc 型検査 + Vitest 全テスト & カバレッジ + Vite ビルド) による一括検証。

### 手動検証
- プロファイル設定画面で API キーを入力し、「接続テスト」ボタンを押下して疎通を確認。
- プロファイルを保存し、求人入力画面上部のバッジが即座に `✨ Gemini API 有効` になることを確認。
- 求人解析を実行し、プレビュー画面に「資格・スキルギャップ補強アドバイス」が表示され、Markdown にも反映されることを確認。
