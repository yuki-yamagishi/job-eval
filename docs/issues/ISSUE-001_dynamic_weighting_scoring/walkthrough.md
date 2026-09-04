# Phase 12: 実装成果レポート (Walkthrough) - 4軸評価重み付けカスタマイズ & リアルタイム/一括再計算機能 (Issue #1, ADR-0004)

## 🎯 達成した実装概要

ユーザーからの「現在の4軸評価について、リスキリング志向やカルチャー重視などユーザーの志向性に応じて重み付けを変更し、後からまとめて点数を再計算したい」という要望に基づき、**[Issue #1](https://github.com/yuki-yamagishi/job-eval/issues/1)** および **[ADR-0004](file:///c:/Users/yukiy/.gemini/antigravity-ide/scratch/job-eval/docs/adr/0004-dynamic-weighting-scoring.md)** を策定・実装しました。

LLM API を再度呼び出すことなく、クライアントサイドで決定論的にミリ秒単位で再計算できる堅牢なアーキテクチャを実現しました。

---

## 1. 主な変更点と新機能

### ① 4軸評価の動的重み付けプロファイル & 5つの標準プリセット (`ProfileSettingsView.tsx`, `profile.ts`)
- **4軸配分**:
  - `standard` (標準バランス型): スキル 40% / 条件 30% / 成長 20% / 環境 10%
  - `reskilling` (リスキリング・成長重視): スキル 10% / 条件 20% / 成長 45% / 環境 25%
  - `wlb_culture` (カルチャー・環境重視): スキル 20% / 条件 30% / 成長 10% / 環境 40%
  - `salary_first` (待遇・条件最優先): スキル 25% / 条件 50% / 成長 15% / 環境 10%
  - `custom` (カスタム配分): スライダーで自由に調整可能（合計100%自動バランサー付き）
- **UI コンポーネント**: 視覚的なプリセット選択カード、リアルタイム合計パーセントバッジ、各軸スライダー。

### ② クライアントサイド決定論的再計算コアエンジン (`scoringEngine.ts`)
- `recalculateScoreWithWeights(breakdown, weights, hasNgPenalty)` 純粋関数を実装。
- 保存済みの 4 軸生スコア比率（`skillMatchRatio`, `conditionMatchRatio`, `careerGrowthRatio`, `environmentRiskRatio`）と重み設定から、即座に総合適合スコア（0〜100点）および判定ランク（S/A/B/C）を算出。

### ③ 保存済み全求人の一括再計算 & Markdown Frontmatter 同期 (`useJobs.ts`)
- プロファイル設定画面で「保存時に保存済みの全求人スコアを一括再計算する」にチェックを入れて保存すると、全求人の `matchScore`・`judgment`・および Markdown Frontmatter / 見出しが一括更新され、ローカルストレージへ同期。

### ④ 求人プレビュー画面での「評価視点（Lens）」リアルタイムシミュレーション (`PreviewPane.tsx`)
- プレビュー画面上部に **「🎯 評価視点 (Lens)」ピル群**（保存時基準 / リスキリング重視 / カルチャー重視 / 待遇重視）を配置。
- ピルを切り替えるだけで、総合スコア・判定ランク・各軸比率バーがリアルタイムにシミュレーション表示され、多角的な検討が可能。

### ⑤ 求人一覧ダッシュボードでの評価視点セレクター & ソート連動 (`JobDashboard.tsx`)
- フィルターバーに「評価視点」ドロップダウンを追加。
- 視点を切り替えると、全求人の表示スコア・判定ランク・並び替え（スコア順ソート）が即座に連動。

### ⑥ Gemini AI 解析プロンプトへの志向性反映 (`jobAnalysisPrompt.ts`)
- 新規求人解析時にも、プロファイルで選択されている重視方針（例: 「リスキリング・成長重視 (成長45%, 環境25%, 条件20%, スキル10%)」）をプロンプトの System Instruction および候補者情報に自動注入。

---

## 2. 自動テスト & ワンショット品質ゲート検証結果

`npm.cmd run check` を実行し、全ゲートの合格を確認しました：

```
🔒 Running Automated Security & Secret Leak Check (All Directories)...
🔍 Scanned 81 files for secrets across entire workspace.
✅ Security & Secret Check PASSED: 0 secrets found. Clean.

📝 Running Automated Document Integrity & Completeness Check...
  ✓ docs/pre_phase_verification.md: 正常・整合性確認済
  ✓ docs/implementation_plan.md: 正常・整合性確認済
  ✓ docs/walkthrough.md: 正常・整合性確認済
✅ Document Integrity Check PASSED: すべてのドキュメントの整合性が確認されました。

 ✓ tests/core/markdownGenerator.test.ts (6 tests)
 ✓ tests/services/geminiProvider.test.ts (3 tests)
 ✓ tests/core/jobAnalysisPrompt.test.ts (6 tests)
 ✓ tests/core/scoringEngine.test.ts (6 tests)
 ✓ tests/services/storageAdapter.test.ts (3 tests)
 ✓ tests/hooks/useJobComparison.test.ts (2 tests)
 ✓ tests/features/CareerRoadmapView.test.tsx (8 tests)
 ✓ tests/features/JobDashboard.test.tsx (7 tests)
 ✓ tests/features/PreviewPane.test.tsx (11 tests)
 ✓ tests/features/ProfileSettingsView.test.tsx (4 tests)
 ✓ tests/core/pipelineIntegration.test.ts (2 tests)

Test Files  11 passed (11)
     Tests  58 passed (58)
  Duration  3.60s

✓ built in 4.25s
```

---

## 3. 作成・変更ファイル一覧

| ファイルパス | 区分 | 変更概要 |
| :--- | :---: | :--- |
| `docs/adr/0004-dynamic-weighting-scoring.md` | 新規 | ADR-0004 動的重み付けプロファイルと決定論的再計算エンジンの採用決定記録 |
| `docs/adr/README.md` | 更新 | ADR-0004 をインデックスに追加 |
| `docs/pre_phase_verification.md` | 更新 | Phase 12 4軸事前検証ログの記録 |
| `docs/implementation_plan.md` | 更新 | Phase 12 実装計画書の記録 |
| `docs/walkthrough.md` | 更新 | 本成果レポート |
| `src/types/profile.ts` | 更新 | `ScoringWeights`, `ScoringPresetKey`, `SCORING_PRESETS` 型・定数定義 |
| `src/core/constants/defaultProfile.ts` | 更新 | デフォルトプロファイルへの初期重み設定追加 |
| `src/core/scoring/scoringEngine.ts` | 更新 | `recalculateScoreWithWeights`, `calculateJudgmentRank` 実装 |
| `src/hooks/useJobs.ts` | 更新 | `recalculateAllJobsWithWeights` 一括再計算 & Markdown Frontmatter 同期関数追加 |
| `src/features/profile/ProfileSettingsView.tsx` | 更新 | 4軸重み付け設定 UI（プリセット、スライダー、一括再計算保存）の実装 |
| `src/components/pane/PreviewPane.tsx` | 更新 | 評価視点（Lens）切り替えピル & リアルタイムシミュレーション表示 |
| `src/components/dashboard/JobDashboard.tsx` | 更新 | 評価視点セレクター & 一覧スコア・ソート連動 |
| `src/core/prompt/jobAnalysisPrompt.ts` | 更新 | AI プロンプトへのユーザー志向性・重み配分の反映 |
| `src/App.tsx` | 更新 | コンポーネント間 Props 配線と一括再計算ハンドラー連携 |
| `tests/core/scoringEngine.test.ts` | 更新 | 動的重み付け計算・プリセット判定テストの追加 |
| `tests/features/PreviewPane.test.tsx` | 更新 | 視点切り替えリアルタイム再計算テストの追加 |
| `tests/features/ProfileSettingsView.test.tsx` | 更新 | 4軸設定 UI & 一括再計算保存テストの追加 |
| `tests/features/JobDashboard.test.tsx` | 更新 | 視点切り替え連動テストの追加 |
