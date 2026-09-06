# Issue #42: Gemini Google Search による企業・福利厚生Web調査（健保・企業型DC）と用途別モデル分離・Thinking制御

## 1. 開発の背景と課題 (Problem Statement)
- 求人票テキストには、求職者にとって極めて重要な「加入健康保険組合（ITS健保、TJK、自社単一健保、協会けんぽ等）」や「企業型確定拠出年金（企業型DC / マッチング拠出）」、「有給消化率・副業可否」などの福利厚生情報が明記されないケースが多い。
- これにより、提示年収に対する実質的な手取りメリット（健保の保険料率差や付加給付）や、中長期の資産形成機会を見落としたまま求人を比較・判断してしまう問題があった。
- さらに、Google AI Studio の従量課金オフ（Free Tier）環境下において、最新フラッグシップモデルである `gemini-3.8-flash` は **1日20回（20 RPD）** と厳しく制限されているのに対し、軽量モデル `gemini-3.5-flash-lite` は **1日500回（500 RPD）** 利用可能である。
- 全ての求人解析やWeb検索で 3.8 Flash を消費すると即座に日次上限に達してしまうため、タスクに応じたモデル分離とクォータ配慮が不可欠である。

## 2. 実装要件 (Requirements)
1. **Gemini Google Search Grounding による福利厚生Web調査**:
   - 求人詳細ペイン（PreviewPane）に「🌐 健保・企業型DCをWeb調査する」オンデマンドボタンを配置。
   - `tools: [{ googleSearch: {} }]` を有効化し、企業名・業界・ポジション情報を基にWeb検索を実行。
   - 健保名・メリット、企業型DC導入有無・マッチング拠出、WLB指標（年休・有休・副業）、参照Webページリンクを構造化抽出。
2. **用途別モデル分離アーキテクチャ (Model Separation)**:
   - **基本求人解析**: `gemini-3.5-flash-lite` (1日500回枠で日常の求人をサクサク大量スクリーニング)
   - **企業・福利厚生Web調査**: `gemini-3.5-flash-lite` (1日500回枠で安定Web検索)
   - **本命精密再評価 / キャリア展望**: `gemini-3.8-flash` (1日20回枠を本命求人にピンポイント投入)
3. **Thinking Level (思考モード) の最適化**:
   - 通常解析: `thinkingLevel: "low"`（2〜3秒で高速応答、TPM制限回避）
   - 福利厚生調査: `thinkingLevel: "minimal"`（高速・低消費）
4. **設定UI (ProfileSettingsView) の刷新**:
   - モデル選択の用途別分離、Thinking Level 選択、RPD目安バッジの表示。
5. **Obsidian連携 Markdown 出力**:
   - `generateJobMarkdown` において「## 🌐 企業・福利厚生Webリサーチ」セクションを整形出力。

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] `CorporateBenefitResearch` 型が定義され、`JobAnalysisResult` に保持・保存されること
- [ ] Gemini Provider で Google Search Grounding ツールを用いた福利厚生調査が動作すること
- [ ] プロファイル設定で通常解析、福利厚生調査、Thinking Level が分離・設定可能であること
- [ ] 従量課金オフの 500 RPD / 20 RPD に配慮したデフォルト値が設定されていること
- [ ] PreviewPane に「🌐 健保・企業型DCをWeb調査」ボタンおよび結果カードが表示されること
- [ ] Markdown 生成時に福利厚生調査結果および参照元リンクが整形出力されること
- [ ] `npm.cmd run check`（シークレット、ドキュメント、型、テスト、ビルド）が全件合格すること