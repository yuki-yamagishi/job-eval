# Phase 31: AI PR レビューのデフォルトモデル最適化とRPDクォータ上限回避 実装計画書 (PR #36)

## 🎯 実装目的・概要
RPDクォータ枯渇（`429 RESOURCE_EXHAUSTED`）を回避するため、日次リクエスト枠が潤沢（500〜1,500回/日）な `gemini-3.5-flash-lite` をデフォルトとし、`gemini-3.1-flash-lite` への自動フォールバックを実装。

---
