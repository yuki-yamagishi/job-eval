# 4軸事前検証ログ (Pre-Phase Verification)

> [!NOTE]
> 本ファイルは最新の進行中フェーズの事前検証ログを保持します。
> 過去のフェーズ（Phase 4〜33, Issue #40等）は docs/issues/ および docs/archive/phases/ に個別に保全されています。

## 現在進行中: Issue #42 (企業・福利厚生Web調査 ＆ 用途別モデル分離・Thinking制御)
詳細は [docs/issues/ISSUE-042_corporate_benefits_and_model_separation/pre_verification.md](./issues/ISSUE-042_corporate_benefits_and_model_separation/pre_verification.md) を参照。

### 4軸事前検証サマリー
1. **事前検証 / 技術的ボトルネック**: Gemini 3.x Google Search Grounding による健保・企業型DCのリアルタイム調査。従量課金オフ時における 20 RPD (3.8 Flash) vs 500 RPD (3.5 Flash Lite) の実態を特定し、用途別モデル分離で枠枯渇を完全回避。
2. **UX / 開発者体験**: オンデマンド実行で求人解析の高速性を維持。ITS健保の保険料率メリットや企業型DC（マッチング拠出）の可視化。設定画面でのRPD目安バッジ表示。
3. **データ永続性 / 互換性**: `benefitResearch` オプショナル型による既存保存求人との完全後方互換性。Obsidian連携 Markdown 整形出力。ADR-0015による意思決定記録。
4. **テスト自律性**: MockAiProvider によるオフライン・CI完全自律動作。`npm.cmd run check` 一括自動検証。