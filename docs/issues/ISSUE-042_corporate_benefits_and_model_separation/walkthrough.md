# Walkthrough: 企業・福利厚生Web調査 ＆ 用途別モデル分離・Thinking制御 (Issue #42)

## 1. 実装成果サマリー
- **企業・福利厚生Web調査機能の実装**:
  - Gemini の Google Search Grounding ツール（`tools: [{ googleSearch: {} }]`）を活用し、求人詳細からワンクリックで「加入健康保険組合（ITS健保、TJK、協会けんぽ等）」「企業型確定拠出年金 (DC) / マッチング拠出」「有給消化率・副業可否」等をリアルタイムWeb調査し、参照元リンク付きでカード表示する機能を新設。
- **用途別モデル分離アーキテクチャの導入**:
  - 従量課金オフ時の厳しい利用枠（3.8 Flash = 20 RPD / 3.5 Flash Lite = 500 RPD）に対応。
  - 通常の求人取り込みおよびWeb調査には 500 RPD 枠の `gemini-3.5-flash-lite` を割り当て、最高峰推論モデル `gemini-3.8-flash` は本命求人の精密再評価用に温存する構成を実現。
- **Thinking Level 制御機能**:
  - API呼び出し時に `thinkingLevel: "low"`（通常）および `"minimal"`（Web調査）を指定可能とし、思考トークン浪費による TPM 上限エラーやタイムアウトを防止。
- **ADR-0015 の策定**:
  - 本アーキテクチャの意思決定理由を不変レコードとして `docs/adr/0015-corporate-benefit-research-and-model-separation.md` に記録。

## 2. 自動検証結果
- `npm.cmd run doc-check`: PASS（ADR整合性、エージェントスキル整合性、Issue完結性）
- `npm.cmd run test:run`: PASS（全件通過）
- `npm.cmd run check`: PASS（シークレット検査、型検査、テスト、本番バンドルビルド全件合格）