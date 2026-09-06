# Implementation Plan: 企業・福利厚生Web調査 ＆ 用途別モデル分離・Thinking制御 (Issue #42)

## 1. 概要
求人票に明記されない詳細な福利厚生（加入健保、企業型DC、有休消化率等）を Gemini Google Search Grounding でWeb調査・提示する機能を追加し、従量課金オフ時のクォータ制約（20 RPD vs 500 RPD）に対応したモデル分離と Thinking 制御を実装する。

## 2. 実装手順
1. **型定義の拡張 (`src/types/`)**:
   - `src/types/job.ts`: `WebSourceItem`, `CorporateBenefitResearch` インターフェースの追加、`JobAnalysisResult` への統合
   - `src/types/profile.ts`: `GeminiModel`, `ThinkingLevel`, `ApiSettings` の拡張
2. **デフォルトプロファイル更新 (`src/core/constants/defaultProfile.ts`)**:
   - `apiSettings` に `geminiModel: "gemini-3.5-flash-lite"`, `researchModel: "gemini-3.5-flash-lite"`, `deepEvalModel: "gemini-3.8-flash"`, `thinkingLevel: "low"` を設定
3. **プロンプト生成 & Markdown連携 (`src/core/`)**:
   - `src/core/prompt/jobAnalysisPrompt.ts`: `buildCorporateBenefitPrompt` の追加
   - `src/core/markdown/markdownGenerator.ts`: `## 🌐 企業・福利厚生Webリサーチ` セクションの生成
4. **AIプロバイダー & サービス層 (`src/services/ai/`)**:
   - `src/services/ai/aiProvider.ts`: `researchCorporateBenefits` メソッドの追加
   - `src/services/ai/geminiProvider.ts`: `RECOMMENDED_MODELS` 最新化、Thinking 設定反映、Google Search Grounding による福利厚生調査の実装
   - `src/services/ai/mockAiProvider.ts`: モック実装
   - `src/services/ai/aiService.ts`: `researchCorporateBenefitsWithProfile` 関数のエクスポート
5. **UIコンポーネントの実装 (`src/components/`, `src/features/`)**:
   - `src/components/pane/PreviewPane.tsx`: 「🌐 健保・企業型DCをWeb調査する」オンデマンドボタン、スピナー、結果カード、参照リンクの表示
   - `src/features/profile/ProfileSettingsView.tsx`: API設定ペインの用途別モデル選択・Thinking Level選択・RPD目安バッジ表示
   - `src/App.tsx`: `handleResearchCorporateBenefits` ハンドラの実装と PreviewPane への受け渡し
6. **ADR-0015 作成 & ドキュメント整合**:
   - `docs/adr/0015-corporate-benefit-research-and-model-separation.md` の作成と `docs/adr/README.md` への登録
7. **品質ゲート検証**:
   - `npm.cmd run check`（シークレット、ドキュメント、型、テスト、ビルド）全件合格

## 3. 検証手順
- `npm.cmd run test:run`
- `npm.cmd run doc-check`
- `npm.cmd run check`