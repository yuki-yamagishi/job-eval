# 実装計画書 (Implementation Plan)

> [!NOTE]
> 本ファイルは最新の進行中フェーズの実装計画書を保持します。
> 過去のフェーズ（Phase 4〜33, Issue #40等）は `docs/issues/` および `docs/archive/phases/` に個別に保全されています。

## 現在進行中: Issue #42 (企業・福利厚生Web調査 ＆ 用途別モデル分離・Thinking制御)
詳細は [docs/issues/ISSUE-042_corporate_benefits_and_model_separation/plan.md](./issues/ISSUE-042_corporate_benefits_and_model_separation/plan.md) を参照。

### 変更ファイル一覧
- `src/types/job.ts` (型拡張: `CorporateBenefitResearch`, `WebSourceItem`)
- `src/types/profile.ts` (型拡張: `GeminiModel`, `ThinkingLevel`, `ApiSettings`)
- `src/core/constants/defaultProfile.ts` (モデル設定更新)
- `src/core/prompt/jobAnalysisPrompt.ts` (プロンプトビルダー `buildCorporateBenefitPrompt`)
- `src/core/markdown/markdownGenerator.ts` (Markdown出力対応)
- `src/services/ai/aiProvider.ts` (インターフェース拡張)
- `src/services/ai/geminiProvider.ts` (Google Search Grounding & Thinking制御)
- `src/services/ai/mockAiProvider.ts` (モック実装)
- `src/services/ai/aiService.ts` (サービス関数エクスポート)
- `src/components/pane/PreviewPane.tsx` (UIカード・調査ボタン追加)
- `src/features/profile/ProfileSettingsView.tsx` (モデル分離・RPD目安バッジ)
- `src/App.tsx` (ハンドラ統合)
- `docs/adr/0015-corporate-benefit-research-and-model-separation.md` (新規ADR)
- `docs/adr/README.md` (ADR一覧更新)

### 検証手順
- `npm.cmd run doc-check`
- `npm.cmd run test:run`
- `npm.cmd run check`