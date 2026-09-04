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
