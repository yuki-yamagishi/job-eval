# Phase 26: 職務経歴・プロジェクト実績（1社複数プロジェクト対応・STAR法）専用画面の新設と求人評価連携 実装計画書 (Issue #11)

## 🎯 実装目的・概要
ヘッダーに第5の専用ナビゲーションタブ「📄 職務経歴・実績」を新設し、1つの会社の中に複数のプロジェクトをぶら下げて管理できる階層データ構造（`CompanyExperience` ➔ `ProjectExperience`）を提供します。各プロジェクトには「開始〜終了年月」「ポジション・役割」「チーム規模」「使用技術」「STAR法（課題・行動・成果）」を入力でき、AI文章整形、ワンクリック職務経歴書出力、および求人AI解析への実績コンテキスト自動注入を実現します。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/types/profile.ts` & `src/core/constants/defaultProfile.ts`
- `ProjectExperience`, `CompanyExperience` インターフェースを定義。
- `UserProfile` に `companies?: CompanyExperience[];` を追加。
- 初期データにリアルな会社・複数プロジェクト実績のサンプルを追加。

### 2. `src/features/career/CareerHistoryView.tsx` (新規作成)
- 会社一覧＆プロジェクト一覧（アコーディオン/カード展開）。
- STAR法構造化入力フォーム（年月、役割、チーム規模、技術タグ、S・A・R）。
- 職務経歴書（Markdown）プレビュー＆ワンタップコピー機能。
- スマホ対応 Sticky Bottom Action Bar（未保存通知 ＋ 常時固定保存ボタン）。

### 3. `src/components/layout/Header.tsx` & `src/App.tsx`
- 第5のメインナビゲーションタブ「📄 職務経歴・実績」（キー: `career`）を追加。
- `App.tsx` でタブの切り替えとデータ受け渡しを実装。

### 4. `src/core/prompt/jobAnalysisPrompt.ts`
- 求人解析時、直近の主要プロジェクト実績を `【候補者コンテキスト】` に注入。
- 過去の具体的成果と求人要件を照合した説得力ある講評を生成。

### 5. `tests/features/CareerHistoryView.test.tsx` (新規作成)
- 会社追加、プロジェクト追加、STAR入力、スキル追加、Markdownコピー、保存の単体テスト。

---

## 🧪 検証手順
1. `npx vitest run tests/features/CareerHistoryView.test.tsx` の PASS 確認。
2. `npm run check` による品質ゲート 100% PASS 確認。
3. コミット・プッシュ・PRマージ・Cloudflare Pages デプロイ。

---
