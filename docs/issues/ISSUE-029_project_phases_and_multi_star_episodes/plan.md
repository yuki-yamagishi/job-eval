# Phase 27: プロジェクト実績の解像度向上: 担当開発工程選択 ＆ 複数STARエピソード管理 実装計画書 (Issue #29)

## 🎯 実装目的・概要
1つのプロジェクト内で複数の成果や課題解決（例: DB負荷改善、CI/CD自動化、若手育成等）を独立して管理できるよう「複数STARエピソード」に対応し、さらに日本のIT転職市場で極めて重視される「担当システム開発工程（要件定義、基本設計、詳細設計、実装、テスト、運用保守、PMなど）」のワンタップ選択機能を提供します。職務経歴書Markdown出力および求人AI解析プロンプトへもこれらを完全連動させます。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/types/profile.ts` & `src/core/constants/defaultProfile.ts`
- `StarEpisode` インターフェース（`id`, `theme`, `situation`, `action`, `result`）を新設。
- `ProjectExperience` に `phases: string[];` と `starEpisodes: StarEpisode[];` を追加。
- サンプル初期データに担当工程と複数STARエピソードを反映。

### 2. `src/features/career/CareerHistoryView.tsx`
- プロジェクト編集モーダルに「担当開発工程（フェーズ）」のバッジトグル選択UIを新設。
  - `要件定義` `基本設計` `詳細設計` `実装・コーディング` `テスト・QA` `リリース・CI/CD` `運用・保守` `PM / 進捗管理`
- プロジェクト編集モーダルに「＋ 実績エピソード(STAR)を追加」機能とエピソードカードリストを実装。
- エピソードごとの「✨ AI文章整形」ボタン対応。
- 職務経歴書（Markdown）出力に「- **担当工程**: ...」および複数エピソードの構造化出力を反映。

### 3. `src/core/prompt/jobAnalysisPrompt.ts`
- 求人AI解析プロンプトの `【候補者コンテキスト】` に担当工程および全STARエピソードを注入。

### 4. `tests/features/CareerHistoryView.test.tsx`
- 担当工程バッジの選択、複数STARエピソードの追加、Markdown出力の単体テストを拡充。

---

## 🧪 検証手順
1. `npx vitest run tests/features/CareerHistoryView.test.tsx` の PASS 確認。
2. `npm run check` による品質ゲート 100% PASS 確認。
3. コミット・プッシュ・PRマージ・Cloudflare Pages デプロイ。

---
