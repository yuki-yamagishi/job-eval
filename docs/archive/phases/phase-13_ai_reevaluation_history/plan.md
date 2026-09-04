# Phase 13: 求人元データからの個別/順次バッチAI再評価 & 評価履歴タイムライン保持機能 実装計画書

## 🎯 実装目的・概要
求職者プロファイル（スキル、資格、希望条件など）を更新した際、過去に評価・保存した求人ドキュメントを、元の求人票テキスト（`originalJobText`）を用いて最新プロファイル基準で高精度にAI再評価できる機能を提供します。
1求人1リクエストの独立推論で精度を担保し、ダッシュボードでの複数選択（最大5件上限）による安全な順次バッチ実行、および過去の評価内容を保持する評価履歴タイムライン（UI & Markdown）を実現します。

---

## 📝 変更ファイル一覧と実装内容

### 1. 型定義の拡張
- **`src/types/job.ts`**:
  - `EvaluationHistoryItem` 型の追加（`id`, `date`, `triggerReason`, `score`, `judgment`, `scoreBreakdown`, `positives`, `concerns`, `summaryNote`）
  - `JobAnalysisResult.evaluationHistory?: EvaluationHistoryItem[]` の追加

### 2. コアロジック & AIサービスの拡張
- **`src/services/ai/aiService.ts`**:
  - `reEvaluateJobFromOriginalText(previousJob, profile, reason?)` の新設（元テキストからの独立再評価と履歴スナップショット蓄積マージ）
- **`src/services/ai/mockAiProvider.ts` / `geminiProvider.ts`**:
  - 再評価時の履歴スナップショット自動生成
- **`src/core/markdown/markdownGenerator.ts`**:
  - `## 📜 適合度評価履歴 (Evaluation History)` セクションの出力およびパース処理

### 3. フック & 順次バッチ実行キューの実装
- **`src/hooks/useJobs.ts`**:
  - `reEvaluateJob(jobId, profile, reason?)`: 個別求人の再評価とストレージ即時更新
  - `reEvaluateBatchJobs(jobIds, profile, onProgress, reason?)`: 最大5件の順次キュー実行とプログレス制御

### 4. UI コンポーネントの実装
- **`src/components/dashboard/JobDashboard.tsx`**:
  - 複数選択上限（最大5件）のチェックボックス制御とトースト警告
  - 「🔄 選択した求人を再評価 (X件)」ボタン
  - 再評価進捗モーダル（進行プログレスバー、各求人の状態インジケーター、中止ボタン）
  - 各求人行のメニューに「最新プロファイルで再評価」アクション追加
- **`src/components/pane/PreviewPane.tsx`**:
  - ヘッダー右上に「🔄 最新プロファイルで再評価」ボタン
  - スコア推移バッジ（例: `88点 (+16pt ↗ 前回 72点)`）
  - 「📜 評価・更新履歴タイムライン」アコーディオンUIの追加

### 5. 自動テストの拡充
- **`tests/services/aiReevaluation.test.ts`**: 元テキストからの再評価ロジックと履歴蓄積の単体テスト
- **`tests/features/JobDashboardReeval.test.tsx`**: バッチ再評価キューとプログレス表示のUIテスト
- **`tests/features/PreviewPane.test.tsx`**: 個別再評価トリガーと履歴タイムライン表示のUIテスト

---

## 🧪 検証手順
1. `npm.cmd run check`（シークレットスキャン + ドキュメント整合性 + TypeScript型検査 + 全単体UIテスト + 本番ビルド）を実行し、全件 PASS を確認。
2. Git コミット・マージを実施。

---
