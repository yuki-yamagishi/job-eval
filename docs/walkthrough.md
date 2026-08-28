# Walkthrough - JobEval-MD 実装成果レポート

## 完了フェーズ一覧

### Phase 1: プロジェクト基盤構築 (Setup & Scaffold)
- Tauri v2 + React 18 (TypeScript) + Vite + Tailwind CSS のスキャフォールディング
- ダークモード対応 2 ペイン画面レイアウト (Header, InputPane, PreviewPane)
- shadcn/ui スタイルの UI コンポーネント群 (Button, Card, Input, Textarea, Badge, Tabs)

### Phase 2: プロファイル設定 & ローカルストレージ実装
- 候補者プロファイル設定画面 (ProfileSettingsView)
- スキル、認定資格、希望条件マトリクス、NG条件の動的編集 UI
- LocalStorage / Tauri FS デュアルストレージアダプター (StorageAdapter)
- Antigravity 開発・検証ハーネス (Vitest, npm run check)

### Phase 3: AI解析エンジン & Gemini API プロンプト実装
- プロンプトエンジニアリング & テキストクレンジング (jobAnalysisPrompt)
- Gemini REST API クライアント (GeminiAiProvider) & 15秒タイムアウト制御
- 外部依存のない完全ローカル Mock プロバイダー (MockAiProvider)
- GitHub Actions CI パイプライン (.github/workflows/ci.yml)

### Phase 4: Markdown生成 & リッチプレビュー & Vault保存
- **Live Markdown Editor**: リッチ表示、スプリット編集（双方向同期）、生Markdownの 3 モード切替
- **ワンクリックセクションコピー**: 「エージェント逆質問のみ」「アピールポイントのみ」「Markdown全文」の即時コピー
- **Obsidian / Logseq Vault 保存**: File System Access API / UTF-8 Blob によるダイレクト書き出し
- **ファイル名サニタイザー & Frontmatter パーサー**: 禁止文字の除去および YAML メタデータの安全な更新
- **自動テスト**: 8 テストファイル / 22 テスト全件合格（100% Passed）
