# Architecture Decision Records (ADR / 設計決定記録)

本ディレクトリは、**JobEval (AI求人適合度評価 & Markdown管理デスクトップアプリ)** において決定された重要なアーキテクチャ・スコアリングアルゴリズム・データ設計の理由とトレードオフを不変のログとして記録・保守する場所です。

---

## 📌 ADR の運用ルール

1. **不変性 (Immutability)**:
   - 一度合意され `Accepted` となった ADR は原則として上書き修正しません。
   - スコア計算式や永続化構造を変更する場合は、新しい番号の ADR を起票し「`Supercedes ADR-0001`」のように後継レコードとして記録します。
2. **AI エージェントの遵守義務**:
   - AI エージェントは開発・改修前に必ず本ディレクトリの ADR を読み込み、**「既存の ADR に反する変更」および「既存テストの安易な弱体化・削除」を行ってはなりません**。

---

## 📚 ADR 一覧

| 番号 | タイトル | ステータス | 決定日 |
| :--- | :--- | :--- | :--- |
| [ADR-0001](file:///docs/adr/0001-four-axis-scoring-engine.md) | 40/30/20/10% 多軸求人適合度スコアリングエンジンの採用 | **Accepted** | 2026-08-30 |
| [ADR-0002](file:///docs/adr/0002-dual-storage-and-markdown-persistence.md) | Tauri FS / Web Dual Storage と Frontmatter Markdown 永続化の採用 | **Accepted** | 2026-08-30 |
| [ADR-0003](file:///docs/adr/0003-pluggable-ai-providers.md) | MockAiProvider & GeminiAiProvider のプラグイン型 AI 設計の採用 | **Accepted** | 2026-08-30 |
| [ADR-0004](file:///docs/adr/0004-dynamic-weighting-scoring.md) | 動的重み付けプロファイル (Dynamic Weighting Profile) および高速再計算エンジンの採用 | **Accepted** | 2026-08-30 |
