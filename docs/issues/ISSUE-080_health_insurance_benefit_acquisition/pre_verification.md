# Issue #80: 事前検証記録 (Pre-Verification)

## 1. 検証日時
2026-09-11

## 2. 現状の課題分析 (Problem Analysis)
- **現状のコード・アーキテクチャの振る舞い**:
  - ADR-0015 にて `CorporateBenefitResearch` 型が導入され、PreviewPane からオンデマンドで Gemini Google Search Grounding による福利厚生調査（`researchCorporateBenefits`）を実行できる。
  - しかし、`healthInsurance` は `{ name: string, confidence: "high" | "medium" | "low", benefits: string[], notes?: string }` という構造であり、健保名が非正規化なフリーテキスト文字列に過ぎない。
  - 初回の求人票解析（`buildJobAnalysisPrompt`, `GEMINI_JOB_ANALYSIS_SCHEMA`）では福利厚生項目が一切抽出対象に含まれておらず、求人票に明記があっても見落とされる。
  - 求人一覧（`JobDashboard.tsx`）には健保情報が表示されず、絞り込み機能もない。
- **根本原因 (Root Cause)**:
  - 健保種別（ITS、TJK、協会けんぽ、自社健保等）の列挙型およびマスター定義が存在せず、求人解析パイプラインと福利厚生リサーチが分離したまま統合されていなかったこと。

## 3. 重複・パッチワーク点検 (Impact & Duplication Check)
- **既存基盤・ユーティリティ・ASTの横断調査**:
  - `src/types/job.ts`: `CorporateBenefitResearch` インターフェースが既に存在。これをゼロから作り直すのではなく、オプショナルプロパティ `type?: HealthInsuranceType` を追加して下位互換を維持しつつ拡張する。
  - `src/core/prompt/jobAnalysisPrompt.ts`: `buildJobAnalysisPrompt` と `buildCorporateBenefitPrompt` の2箇所が存在。重複したプロンプトを乱立させるのではなく、共通の健保判定キーワード（ITS、TJK、協会けんぽ等）を `src/core/constants/healthInsurance.ts` に集約して一貫性を保持する。
  - `src/core/markdown/markdownGenerator.ts`: `generateJobMarkdown` および `parseJobMarkdownToJobResult` に福利厚生セクションの読み書きロジックが存在。既存の記法（`## 🌐 企業・福利厚生Webリサーチ (健保・企業型DC等)`）を活かし、健保種別行を追加・復元可能とする。
  - `src/components/pane/PreviewPane.tsx`: 健保カード描画ロジックが既に存在。既存のカード構造を破壊せず、健保バッジと手動変更ドロップダウンをスマートに組み込む。
- **車輪の再発明・パッチワークの防止方針**:
  - 新規に別の福利厚生管理ストアや外部ライブラリを導入するようなパッチワークは行わず、既存の `JobAnalysisResult` および `CorporateBenefitResearch` の正統進化として統合する。
  - 健保の判別ロジック（文字列からの推論）を `inferHealthInsuranceType(name: string): HealthInsuranceType` として純粋関数化し、`src/core/constants/healthInsurance.ts` に配置。これにより、UI、サービスレイヤー、Markdownパーサー、テストコードのすべてで同一ロジックを再利用可能にし、コード重複を根絶する。

## 4. 改修方針 (Implementation Strategy)
1. `src/core/constants/healthInsurance.ts` を新設し、`HealthInsuranceType`、メタデータマスター、および `inferHealthInsuranceType` 純粋関数を定義。
2. `src/types/job.ts` の `CorporateBenefitResearch.healthInsurance` に `type?: HealthInsuranceType` を追加。
3. `src/core/prompt/jobAnalysisPrompt.ts` の `GEMINI_JOB_ANALYSIS_SCHEMA` にオプショナルの `benefit_info` を追加し、求人票に明記がある場合は初回解析時に即時抽出できるようにする。
4. `src/services/ai/geminiProvider.ts` および `src/services/ai/mockAiProvider.ts` で健保種別判定と `CorporateBenefitResearch` の初期構築ロジックを更新。
5. `src/core/markdown/markdownGenerator.ts` で健保種別の出力と正規化パースをサポート。
6. `src/components/dashboard/JobDashboard.tsx` に健保バッジと健保フィルターを追加。
7. `src/components/pane/PreviewPane.tsx` に健保バッジ、特長解説カード、手動変更セレクトボックスを追加。
8. 単体テスト（`tests/core/healthInsurance.test.ts`, `tests/services/corporateBenefitResearch.test.ts`, `tests/features/JobDashboard.test.tsx`）を網羅し、`npm.cmd run check` で品質ゲート合格を検証。
