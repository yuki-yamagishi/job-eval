# Phase 32: AI レビュー指摘への重要度プレフィックス（[must], [should], [imo]等）義務化 実装計画書 (PR #37)

## 🎯 実装目的・概要
AI レビューボットの各指摘事項について、対応必須度・重要度を一目で判別可能にするため、標準レビュー接頭辞（Conventional Comments スタイル）を義務化し、コメント冒頭に凡例ガイドを表示します。

---

## 📝 変更ファイル一覧と実装内容
- `scripts/aiPrReviewer.js`: プロンプトに `[must]`, `[should]`, `[imo]`, `[nits]`, `[ask]` 必須化ルールを追加し、PRコメント冒頭に凡例ガイドを挿入。
- `tests/scripts/aiPrReviewer.test.ts`: 接頭辞および凡例ガイドの出力アサーションを追加。

---
