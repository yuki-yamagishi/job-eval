# Pre-Phase Verification: 企業・福利厚生Web調査 ＆ 用途別モデル分離・Thinking制御 (Issue #42)

## 1. 技術的ボトルネック & 実現可能性の検証 (Technical Feasibility)
- **Google Search Grounding の仕様**: Gemini 3.x API において、`tools: [{ googleSearch: {} }]` を渡すことで Google 検索グラウンディングが実行可能。従量課金オフ（Free Tier）であっても、Flash / Flash-Lite モデルでは「1日500リクエスト（500 RPD）」まで無料利用可能であることを確認済。
- **構造化出力とツールの両立**: 検索ツールと JSON Schema の併用によるエラー・精度低下を防ぐため、福利厚生調査専用の独立したプロンプト・抽出ロジック（`buildCorporateBenefitPrompt`）を策定し、返却テキストおよび `groundingMetadata` から堅牢にパースする。
- **モデル分離の必要性**: `gemini-3.8-flash` は従量課金オフ環境下で 1日わずか20回（20 RPD）に制限されている。一方、`gemini-3.5-flash-lite` は 1日500回（500 RPD）利用可能であるため、日常の大量解析およびWeb調査には 3.5 Flash Lite を割り当て、3.8 Flash は本命求人の精密再評価・キャリア展望用に温存する構成とする。
- **Thinking Level 制御**: `thinkingLevel` パラメータ（`low` / `medium` / `high`）を付与することで、3.8 Flash の知能を活かしつつ不要な思考トークン（TPM上限・タイムアウト）を抑制。

## 2. UX & 開発者・転職者体験の検証 (User & Developer Experience)
- **オンデマンド実行による高速性の担保**: 初回の求人解析は 2〜3 秒で完了させ、気になる求人のみ「🌐 健保・企業型DCをWeb調査する」ボタンを押下して 3〜5 秒で調査するUXとし、テンポ良い求人比較を阻害しない。
- **手取り・将来資産形成の可視化**: ITS健保（保険料率の優遇・保養所・付加給付）や企業型DC（マッチング拠出）の有無が一目で分かり、求人票に書かれていない隠れた企業価値を評価可能。
- **RPD上限の可視化**: プロファイル設定画面に `[500 RPD / 快適]`, `[20 RPD / 本命用]` のバッジを表示し、知らぬ間に日次上限に達して利用停止になる事態を防止。

## 3. データ永続性 & 互換性の検証 (Data Integrity & Backward Compatibility)
- **後方互換性**: 既存の保存求人（LocalStorage / Tauri FS / Cloudflare D1）には `benefitResearch` フィールドが存在しないが、オプショナル型（`benefitResearch?: CorporateBenefitResearch`）とすることで破損なく読み書き可能。
- **Markdown 連携**: Obsidian 出力時に福利厚生情報と参照Webリンクを整形出力し、ローカルVaultでも情報が永続化される。

## 4. テスト自律性 & 自動検証の検証 (Test Autonomy & Quality Gate)
- モックプロバイダー（`MockAiProvider`）に福利厚生調査メソッドを追加し、APIキー未設定時や CI 環境でも完全自律して全単体テスト・UIテストがパスすること。
- `npm.cmd run check` が 100% 合格すること。