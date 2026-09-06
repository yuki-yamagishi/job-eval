# ADR-0015: Gemini Google Search Grounding による企業・福利厚生Web調査と用途別モデル分離・Thinking制御

- **ステータス**: Accepted
- **決定日**: 2026-09-06
- **関連Issue**: Issue #42

---

## 1. コンテキスト (Context)

求人票テキストには、求職者にとって極めて重要な「加入健康保険組合（ITS健保、TJK、協会けんぽ等）」や「企業型確定拠出年金（企業型DC / マッチング拠出）」、「有給消化率・副業可否」などの福利厚生情報が明記されないことが多く、手取りメリットや資産形成機会を見落としたまま求人を比較・判断してしまう課題がありました。

また、Google AI Studio の従量課金オフ（Free Tier）環境において、最新フラッグシップモデル `gemini-3.8-flash` は **1日20回（20 RPD）** と厳しく制限されているのに対し、軽量モデル `gemini-3.5-flash-lite` は **1日500回（500 RPD）** 利用可能です。
すべての解析やWeb検索で 3.8 Flash を消費すると、わずか20件でその日の利用枠が枯渇しシステムが停止してしまうため、用途ごとのモデル分離とクォータ配慮が不可欠でした。

---

## 2. 決定事項 (Decisions)

### ① Gemini Google Search Grounding による福利厚生Web調査の導入
- 外部のスクレイピングサーバーや常駐型MCPサーバーを自作するのではなく、Gemini API 標準の Google Search Grounding（`tools: [{ googleSearch: {} }]`）を採用。
- 求人詳細画面のオンデマンドボタン（「🌐 健保・企業型DCをWeb調査する」）から発火し、初回の求人解析速度（2〜3秒）を一切犠牲にしないUXとする。
- 参照元Webページリンク（グラウンディングURL）をカード上に明記し、事実の検証性を担保。

### ② 用途別モデル分離アーキテクチャ (Model Separation)
- 従量課金オフ時の 20 RPD vs 500 RPD の格差を踏まえ、用途ごとにモデルを分離：
  - **基本求人解析**: `gemini-3.5-flash-lite`（1日500回枠で日常の求人をサクサク大量スクリーニング）
  - **企業・福利厚生Web調査**: `gemini-3.5-flash-lite`（1日500回枠で安定Web検索）
  - **本命精密再評価 / キャリア展望**: `gemini-3.8-flash`（1日20回枠を本命求人にピンポイント投入）
- プロファイル設定画面（`ProfileSettingsView`）で用途別にモデル選択を可能にし、`[500 RPD / 快適]`, `[20 RPD / 本命用]` のバッジを表示。

### ③ Thinking Level (思考モード) の最適化
- 通常解析には `thinkingLevel: "low"` を指定し、Thinking トークン消費による TPM 上限超過エラー（429）やタイムアウトを抑制。
- 福利厚生調査には `thinkingLevel: "minimal"` を指定し、Web検索結果の最速要約を実現。

### ④ データ永続性と Obsidian 連携
- `CorporateBenefitResearch` 型を新設し、`JobAnalysisResult` にオプショナルとして保持。
- Obsidian 連携 Markdown 生成時にも「## 🌐 企業・福利厚生Webリサーチ」セクションとして整形出力。

---

## 3. 結果・影響 (Consequences)

- **ポジティブ**:
  - 求人票に書かれない「ITS健保の手取り優遇」や「企業型DCマッチング拠出」が可視化され、求人評価の精度が飛躍的に向上。
  - 500 RPD 枠を最大活用することで、日次20回上限に怯えることなく日常の大量求人比較が可能に。
  - 外部サーバーや追加APIキー不要で、既存の Gemini API キー1つで完結。
- **留意点**:
  - Free Tier キーでの Google Search Grounding は Flash / Flash-Lite モデルでのみ利用可能（Proモデルは不可）。