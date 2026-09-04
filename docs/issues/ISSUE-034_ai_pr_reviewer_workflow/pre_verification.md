## Phase 30: GitHub Actions ＋ Gemini API による自動 AI PR レビューボットの導入 (Issue #34, ADR-0012)

| 検証軸 | 検出事項・考慮点 | 実装・設計での解決策 |
| :--- | :--- | :--- |
| **1. 技術・環境** | GitHub Actions 上で PR のコード差分を取得し、Gemini API を呼び出して PR コメントを自動投稿する環境の整備。 | `.github/workflows/ai-pr-reviewer.yml` にて `git diff origin/main...HEAD` を取得し、`scripts/aiPrReviewer.js` を実行。`GITHUB_TOKEN` を用いて PR コメントを投稿。 |
| **2. UX・エッジケース** | API キー未設定時や Fork リポジトリからの PR でシークレットが渡されない場合に CI が Red 失敗する問題。差分が巨大な場合のトークン溢れ。 | `GEMINI_API_KEY` 未設定時は CI を失敗させず警告ログを出して正常終了（Graceful Skip）。巨大な差分（数万行）はファイル単位・行数で適切にフィルタリング・トリミング。 |
| **3. 永続性・互換性** | 自動投稿されたレビューコメントが GitHub PR のスレッドに残り、将来の保守開発者がいつでも「なぜこの実装になったか・注意点」を参照できること。 | レビュー結果を GitHub PR Issue Comments に永続化。構造化マークダウン（概要・エッジケース・保守性・AGENTS.md整合性）で可読性を担保。 |
| **4. テスト容易性 & 自律性** | `scripts/aiPrReviewer.js` の diff 解析、プロンプト生成、API モック、コメント投稿ロジックがローカルでも 100% 単体テスト可能か。 | `tests/scripts/aiPrReviewer.test.ts` を作成し、Gemini API レスポンスや GitHub CLI コールをモックして `npm.cmd run check` で完全自動検証。 |

---
