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

# Phase 12: 4軸評価の動的重み付けカスタマイズ＆保存済求人の一括・リアルタイム再計算機能 実装計画書 (Issue #1)

## 🎯 実装目的・概要
ユーザーの転職志向（リスキリング重視、カルチャー重視、待遇重視、即戦力重視など）に応じて4軸の重み付け（％）を自由に変更可能にし、保存済みの全求人および閲覧中求人の適合度スコア（0〜100点）および判定ランク（S/A/B/C）をクライアント側で瞬時に再計算・一括更新できる機能を提供します。

---

## 📝 変更ファイル一覧と実装内容

### 1. 型定義の拡張
- **`src/types/profile.ts`**:
  - `ScoringWeights` インターフェース（`skill`, `condition`, `growth`, `environment` 各 %、合計100）
  - `ScoringPresetKey` 型（`"standard"` | `"reskilling"` | `"wlb_culture"` | `"salary_first"` | `"custom"`）
  - `DEFAULT_SCORING_WEIGHTS` 定数（40/30/20/10%）
  - `SCORING_PRESETS` 辞書定義
  - `ConditionMatrix.scoringWeights`（オプショナル、後方互換性担保）
- **`src/core/constants/defaultProfile.ts`**:
  - デフォルトプロファイルに `scoringWeights: DEFAULT_SCORING_WEIGHTS` を追加

### 2. コア再計算エンジンの実装
- **`src/core/scoring/scoringEngine.ts`**:
  - `recalculateScoreWithWeights(breakdown, weights, ngTriggered?)` 純粋関数
  - `getJudgmentRank(totalScore, hasNgTriggered?)` 判定ロジック

### 3. UI コンポーネントの実装
- **`src/features/profile/ProfileSettingsView.tsx`**:
  - 重み付けプリセット選択ボタン（5種類）
  - 4軸重みスライダー＆合計100%自動バランサー
  - 「保存時に既存の全求人に新しい重みを適用して一括再計算する」機能
- **`src/components/pane/PreviewPane.tsx`**:
  - 評価視点切り替えピル（🎯標準 / 🚀リスキリング / 🌿カルチャー / 💰待遇）
  - クリックによる即座のスコア再計算＆判定ランク連動プレビュー
- **`src/components/dashboard/JobDashboard.tsx`**:
  - 評価視点（プリセット）切り替えによる一覧スコア・ソート順の即時連動

### 4. フック & プロンプト連携
- **`src/hooks/useJobs.ts`**:
  - `recalculateAllJobsWithWeights(weights)` 一括更新関数
  - Markdown Frontmatter の `match_score` / `judgment` 同期更新
- **`src/core/prompt/jobAnalysisPrompt.ts`**:
  - ユーザーの選択重み付け方針（リスキリング重視等）を Gemini System Instruction に反映

### 5. 自動テストの拡充
- **`tests/core/scoringEngine.test.ts`**: 各プリセットでの再計算ロジック、合計100%バランサーテスト
- **`tests/features/PreviewPane.test.tsx`**: 視点切り替えピルの動作テスト
- **`tests/features/ProfileSettingsView.test.tsx`**: 重み付け設定UIテスト
- **`tests/features/JobDashboard.test.tsx`**: ダッシュボードでの視点連動テスト

---

## 🧪 検証手順
1. `npm.cmd run check`（シークレット + ドキュメント整合性 + 型検査 + 全単体UIテスト + 本番ビルド）を実行し、全件 PASS を確認。
2. Git Pre-commit Hook & Pre-push Hook による自動検査を経てコミットし、`gh pr create` で PR を起票。

---
JobEval を GitHub 上で外部に公開し、自身のスキル（AI統合力、フロントエンド/デスクトップアーキテクチャ設計力、開発ハーネス・テスト駆動品質担保力、UX設計力）を証明するための洗練された `README.md` を作成・反映します。

---

## 📝 変更ファイル一覧と実装内容

### 1. `README.md`
- **プロジェクトヘッダー & バッジ**: プロジェクト名、キャッチコピー、技術スタックバッジ（Tauri v2, React 18, TypeScript, Gemini 2.5, Vitest, Zero Secrets）。
- **Problem & Solution（開発背景と提供価値）**: 散乱する求人票の適合度を多軸AIで客観判定し、Obsidian管理と転職ロードマップまでを一気通貫で支援。
- **主要機能ハイライト（Features）**:
  - 4軸適合度スコアリング (40/30/20/10%)
  - 4画面の直観的UI（入力・プレビュー・ドキュメント一覧・ロードマップ・プロファイル設定）
  - 中長期キャリア展望 & Next Exit AI推論（オンデマンド深掘り生成）
  - AIフィードバック＆再評価（インクリメンタル学習）
  - デュアルストレージ（Tauri FS / LocalStorage / Markdown Import）
- **アーキテクチャ設計（Architecture）**: クリーンアーキテクチャ構成図、プラグイン型 AI Provider。
- **品質・セキュリティ・開発ハーネス（Engineering Excellence）**:
  - シークレット自動遮断 (`securityCheck.js`)
  - ドキュメント整合性検査 (`docCheck.js`)
  - Git Pre-commit & Pre-push Hook
  - Vitest 50テスト全件パス
- **クイックスタート（Getting Started）**: インストール・起動・テスト手順。

---

## 🧪 検証手順
1. `npm run check`（シークレット + ドキュメント整合性 + 型検査 + 全50件テスト + 本番ビルド）を実行し、全件パスを確認。
2. Git Pre-commit Hook & Pre-push Hook による自動検査を経てコミットし、`git push origin main` で GitHub へ即時反映。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/features/roadmap/CareerRoadmapView.tsx`
- **「🔄 データを再集計・更新」ボタンをヘッダー右上に新設**:
  - クリック時にストレージから最新求人一覧を再取得し、集計をリフレッシュ。更新完了のフィードバック（スピナー＋トースト）を表示。
- **資格名・スキルのスマート名寄せ正規化（Normalization & Deduplication）**:
  - AWS (SAA, SAP, SOA等), Azure (AZ-305, AZ-400等), GCP, CKA, LPIC, 応用情報 などの主要資格の表記ゆれを統一名称にマッピング。
  - 同一求人・同一企業からの重複カウントを厳密に排除。
- **出所企業・指定文脈（必須 vs 推奨）の個別明記**:
  - 各資格カード内に「🏢 企業ごとの指定状況」セクションを新設。
  - `【A社】: 必須要件として指定`、`【B社】: スキル補強のため推奨` のように、どの会社がどう言っているかを明確に表示。

### 2. `src/App.tsx`
- `CareerRoadmapView` に最新求人リスト再読み込み用の `onRefreshJobs` コールバックを連携。

### 3. 自動テストの拡充 (`tests/features/CareerRoadmapView.test.tsx`)
- 表記ゆれ資格の名寄せ集計テスト、企業別指定文脈の表示テスト、および更新ボタンの押下テストを追加。

---

## 🧪 検証手順
1. `npm run check`（シークレット + ドキュメント整合性 + 型検査 + 全単体UIテスト + 本番ビルド）の全件パスを確認。
2. Pre-commit Hook & Pre-push Hook による二重防御を経てコミット & GitHub リモートへ即時反映。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/components/pane/PreviewPane.tsx`
- キャリア展望カードのヘッダー右上に **「🔄 AIでキャリア展望を再生成・深掘り」ボタン** を常設。
- 生成中のスピナー・ローディング表示（`isGeneratingTrajectory`）をサポート。
- 過去求人の「未生成」状態だけでなく、「生成済み」状態からの深掘り再生成にもシームレスに対応。

### 2. `src/App.tsx`
- `isGeneratingTrajectory` ステートを追加し、再生成処理中の UI ロック・フィードバックを制御。
- `handleGenerateCareerTrajectory` 実行時に Markdown を自動更新し、ローカルストレージへ即時自動保存。

### 3. `src/core/prompt/jobAnalysisPrompt.ts`
- `buildCareerTrajectoryPrompt` のプロンプト指示をさらに深掘りし、2〜3年の技術進化や具体的な職種・年収根拠を強化。

### 4. 自動テストの拡充
- `tests/features/PreviewPane.test.tsx`: キャリア展望が既に存在する場合の再生成ボタン押下・コールバック呼び出しテストを追加。

---

## 🧪 検証手順
1. `npm run check`（シークレットスキャン + ドキュメント整合性検査 + 型検査 + 全単体UIテスト + 本番ビルド）を実行し、全件パスを確認。
2. Pre-commit Hook & Pre-push Hook による二重防御の確認。
3. Conventional Commits 形式でコミットし、`git push origin main` で GitHub へ即時反映。


# Phase 8: 中長期キャリア展望・獲得スキル・次の転職先 (Career Trajectory) AI & 可視化 実装計画

ユーザーからの追加要望（「このキャリアを選択した後の展望・得られるスキル・さらなる転職や方向性についても知っておきたい」）に応え、求人票を起点とした 2〜3 年後の中長期キャリアパス、獲得スキル、次の転職先候補（Exit Strategy）、市場年収展望を AI で自動分析・可視化する機能を実装します。

---

## 提案する変更点 (Proposed Changes)

### 1. 型定義・ドメイン拡張
#### [MODIFY] `src/types/job.ts`
- `CareerTrajectory` インターフェースを新設：
  ```ts
  export interface CareerTrajectory {
    acquiredSkills: string[];          // 2〜3年で身につく市場価値の高いスキル
    nextCareerOptions: string[];       // 次の転職で狙えるポジション・キャリアパス
    marketValueProjection: string;     // 2〜3年後の想定市場価値・年収レンジ
    careerRisksOrLockin?: string;      // 技術的ロックインやキャリア上の留意点
    overallOutlook: string;            // 中長期キャリア展望の総括アドバイス
  }
  ```
- `JobAnalysisResult` に `careerTrajectory?: CareerTrajectory` を追加。

---

### 2. コアAIプロンプト & プロバイダ拡張
#### [MODIFY] `src/core/prompt/jobAnalysisPrompt.ts`
- `buildJobAnalysisPrompt` および `buildJobReEvaluationPrompt` に「中長期キャリア展望（得られるスキル・次のキャリアパス・想定市場年収・ロックインリスク）」の推論指示を追加。
- `GEMINI_JOB_ANALYSIS_SCHEMA` に `career_trajectory` オブジェクトを定義。

#### [MODIFY] `src/services/ai/geminiProvider.ts`, `mockAiProvider.ts`
- Gemini Raw レスポンスから `careerTrajectory` へのパース・マッピングを実装。
- `MockAiProvider` にも業種・職種・ポジションに応じたキャリア展望シミュレーション生成を実装。

---

### 3. Markdown 生成 & パース拡張
#### [MODIFY] `src/core/markdown/markdownGenerator.ts`
- Markdown 出力テンプレートに **`## 🚀 キャリア展望・獲得スキル・次の転職先 (Career Trajectory)`** セクションを追加。
- インポート時（`parseJobMarkdownToJobResult`）にもキャリア展望セクションを復元。

---

### 4. UI 画面でのリッチ可視化
#### [MODIFY] `src/components/pane/PreviewPane.tsx`
- **「🚀 入社後のキャリア展望 & 次のキャリアパス」** リッチカードを新設：
  - 身につくスキルバッジ群
  - 次の転職で狙えるポジション・職種カード
  - 将来の市場価値・年収レンジ展望
  - キャリア上の留意点（ロックインリスク・留意事項）

#### [MODIFY] `src/features/roadmap/CareerRoadmapView.tsx`
- 保存された全求人のキャリア展望を集約し、**「将来のキャリア分岐マップ & 次の転職先候補集約」** を表示。

---

## 検証計画 (Verification Plan)

### 自動テスト
- `tests/core/jobAnalysisPrompt.test.ts`: キャリア展望プロンプトと JSON Schema の検証
- `tests/core/markdownGenerator.test.ts`: キャリア展望 Markdown の生成・パース検証
- `tests/features/PreviewPane.test.tsx`: キャリア展望リッチカードの描画検証
- `tests/features/CareerRoadmapView.test.tsx`: 全求人横断キャリア展望の表示検証
- `npm run check`: ワンショット総合品質・セキュリティゲートの全件合格
