## Phase 17: 品質ゲート（docCheck.js）における ADR 一覧整合性の自動検証機能の追加 (Issue #9)

| 検証軸 | 検出事項・考慮点 | 実装・設計での解決策 |
| :--- | :--- | :--- |
| **1. 技術・環境** | `scripts/docCheck.js` が Node.js の `fs` / `path` で Windows / macOS / Linux 環境を問わず安全に動作すること。 | `path.resolve` / `path.join` によるクロスプラットフォームパス解決と、正規表現によるファイル名・ADR番号（`ADR-XXXX`）突合ロジックを実装。 |
| **2. UX・エッジケース** | 開発者やAIエージェントが ADR の目次登録を忘れた場合、どのファイルが未登録かをわかりやすくコンソールに出力すること。 | 未登録の ADR 一覧を `console.error` で具体的に箇条書き出力し、対処手順（`docs/adr/README.md への追記`）を明示。 |
| **3. 永続性・互換性** | 既存のドキュメント検査（`pre_phase_verification.md` 等）やビルドプロセスを破壊しないこと。 | 既存の3ファイル検査フローをそのまま維持し、ADR ディレクトリ検査を第2ステップとして安全に追加。 |
| **4. テスト容易性 & 自律性** | `scripts/docCheck.js` 単体実行および `npm run check` 全体で確実に検証が自律実行されること。 | `node scripts/docCheck.js` を実行し、全7件の ADR が正常認識されることを確認。 |

---
