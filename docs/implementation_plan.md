# Phase 7: 自動ローカル保存・再表示・AI再評価・ドキュメントインポート・横並び比較 & 転職ロードマップ画面 実装計画

ユーザーからの追加要望（求人の自動ローカル保存、保存済み案件のブラウザ再表示、AI評価へのフィードバック＆再評価、Markdownインポート、横並び比較サマリ、選考状況・見送り理由・資格から俯瞰する転職ロードマップ画面）を網羅的に実装します。

---

## 提案する変更点 (Proposed Changes)

### 1. 型定義・ドメイン拡張
#### [MODIFY] `src/types/job.ts`
- `JobAnalysisResult` に `feedbackHistory?: Array<{ date: string; feedback: string; scoreDelta: number }>` を追加。
- `JobAnalysisResult` に `originalJobText?: string` を追加（再評価時の元テキスト保持）。

---

### 2. コアAIプロンプト & プロバイダ拡張
#### [MODIFY] `src/core/prompt/jobAnalysisPrompt.ts`
- `buildJobReEvaluationPrompt(previousResult, userFeedback, profile)` を新設。ユーザーのフィードバック（「実はAWS実務経験がある」「この年収条件は許容できる」など）を反映してスコア・判定・アピール点を再計算するプロンプトと JSON Schema を定義。

#### [MODIFY] `src/services/ai/aiProvider.ts`, `geminiProvider.ts`, `mockAiProvider.ts`, `aiService.ts`
- `reEvaluateJob(previousResult, userFeedback, profile)` メソッドを追加。

---

### 3. 自動ローカル保存 & ドキュメントインポート
#### [MODIFY] `src/services/storage/storageAdapter.ts`
- `importMarkdownFile(fileContent: string): JobAnalysisResult` を実装（Markdown Frontmatter をパースして `JobAnalysisResult` に復元）。

#### [MODIFY] `src/hooks/useJobs.ts`
- `autoSaveJob(result: JobAnalysisResult)` メソッドを追加（解析完了時に自動同期）。
- `importJobFromMarkdown(fileContent: string)` メソッドを追加。

---

### 4. UI 機能の拡充
#### [MODIFY] `src/components/pane/PreviewPane.tsx`
- **「💡 AI提案へのフィードバック & 再評価」フォーム** を新設（フィードバック入力 ➔ ワンクリックでスコア再計算・更新）。
- **「自動保存ステータス（✓ ローカル保存済み）」バッジ** を表示。

#### [MODIFY] `src/components/dashboard/JobDashboard.tsx`
- **「求人の再表示」機能**: カードまたはテーブル行をクリックすると、プレビュー画面（または詳細モーダル）で即座に再閲覧・再編集。
- **「Markdownインポート」ボタン & ドラッグ＆ドロップ**: 外部の `.md` を即時インポート。
- **「横並び比較サマリ」機能**: 選択した 2〜4 社の年収・スコア・勤務形態・必須/歓迎要件・資格アドバイス・アピール点をマトリクスで並べて比較。

#### [NEW] `src/features/roadmap/CareerRoadmapView.tsx`
- **「転職ロードマップ」画面** を新設：
  1. **選考パイプライン マイルストーン**: 「応募検討中 (N件)」「応募済 (N件)」「一次面接 (N件)」「最終面接 (N件)」「内定 (N件)」「見送り・辞退 (N件)」の進捗ボード・タイムライン。
  2. **見送り・辞退分析サマリ**: 見送りにした求人の傾向（年収不適合、NG条件、スキルギャップ等）の可視化。
  3. **資格・スキル獲得ロードマップ**: 全求人で要求・推奨された資格（AWS SAA, CKA, AZ-400 等）を目標時期・重要度順にまとめた戦略的ロードマップ。

#### [MODIFY] `src/components/layout/Header.tsx`, `src/App.tsx`
- ヘッダーに **「🗺️ ロードマップ」** タブを追加。
- 各画面間のスムーズな連携（案件クリックでプレビューへジャンプ、解析完了時の自動ローカル保存など）を配線。

---

## 検証計画 (Verification Plan)

### 自動テスト
- `tests/core/jobAnalysisPrompt.test.ts`: 再評価プロンプトの生成テスト。
- `tests/services/storageAdapter.test.ts`: Markdown インポート＆復元パーステスト。
- `tests/features/CareerRoadmapView.test.tsx`: ロードマップ集計・パイプライン表示テスト。
- `tests/features/JobDashboard.test.tsx`: 再表示・比較・インポートの UI テスト。
- `npm run check`: ワンショット総合品質 & セキュリティゲートの全件パス確認。
