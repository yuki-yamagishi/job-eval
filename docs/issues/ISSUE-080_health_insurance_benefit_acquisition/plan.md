# Issue #80 実装計画書 (Implementation Plan)

## 1. 目的
福利厚生情報（健康保険組合：TJK、関東ITソフトウェア [ITS]、協会けんぽ、自社健保等）の精密取得・分類・可視化、求人票テキストからの即時抽出機能、および一覧画面・詳細画面でのバッジ表示・フィルター・手動編集機能を導入する。

## 2. 変更対象ファイル一覧
- `src/core/constants/healthInsurance.ts`: [NEW] 健保種別型（`HealthInsuranceType`）、メタデータマスター、および推論純粋関数 `inferHealthInsuranceType`
- `src/types/job.ts`: [MODIFY] `CorporateBenefitResearch.healthInsurance.type` 追加
- `src/core/prompt/jobAnalysisPrompt.ts`: [MODIFY] 初回求人解析スキーマ（`GEMINI_JOB_ANALYSIS_SCHEMA`）への福利厚生抽出項目追加、およびWeb調査プロンプト強化
- `src/services/ai/geminiProvider.ts`: [MODIFY] 初回解析からの福利厚生抽出反映、Webリサーチ結果の健保正規化パース
- `src/services/ai/mockAiProvider.ts`: [MODIFY] TJK / ITS / 協会けんぽ のモック判定対応
- `src/core/markdown/markdownGenerator.ts`: [MODIFY] Markdown 出力・復元における健保種別対応
- `src/components/dashboard/JobDashboard.tsx`: [MODIFY] 健保バッジ表示および健保種別フィルター追加
- `src/components/pane/PreviewPane.tsx`: [MODIFY] 健保バッジ、特長カード、手動変更セレクトボックス追加
- `docs/adr/0025-health-insurance-benefit-acquisition.md`: [NEW] ADR-0025 作成
- `docs/adr/README.md`: [MODIFY] ADR 一覧更新
- `docs/architecture_overview.md`: [MODIFY] 仕様正本同期
- `tests/core/healthInsurance.test.ts`: [NEW] 健保判定ロジック単体テスト
- `tests/services/corporateBenefitResearch.test.ts`: [MODIFY] 健保種別パース・Markdown永続化テスト
- `tests/features/JobDashboard.test.tsx`: [MODIFY] 健保フィルター・バッジ表示テスト

## 3. 実装・検証手順
1. `src/core/constants/healthInsurance.ts` を作成し、単体テスト `tests/core/healthInsurance.test.ts` で TJK、ITS、協会けんぽ等の推論・メタデータ取得を検証。
2. `src/types/job.ts` を更新し、`src/core/markdown/markdownGenerator.ts` の出力・パースを対応。
3. `src/core/prompt/jobAnalysisPrompt.ts` および `src/services/ai/geminiProvider.ts`, `mockAiProvider.ts` を更新し、初回解析での即時抽出とWebリサーチの種別分類を実装。
4. `src/components/pane/PreviewPane.tsx` に健保バッジ・特長解説・手動変更UIを実装。
5. `src/components/dashboard/JobDashboard.tsx` に健保バッジおよびフィルターを実装。
6. ADR-0025 を作成し、`docs/adr/README.md` および `docs/architecture_overview.md` を更新。
7. `npm.cmd run check` でフル品質ゲート合格を確認。
