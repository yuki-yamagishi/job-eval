# Phase 9: キャリア展望の常設深掘り・再生成とプロンプト最適化 実装計画書

## 🎯 実装目的・概要
初回一括解析時の軽快なレスポンス速度（3秒台）を保ちつつ、ユーザーが興味を持った求人に対して専用プロンプト（`buildCareerTrajectoryPrompt`）による最高精度の「キャリア展望・獲得スキル・次の転職先」へいつでもアップグレードできる「🔄 AIでキャリア展望を再生成・深掘り」ボタンを常設実装します。

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
