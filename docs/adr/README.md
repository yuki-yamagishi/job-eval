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
| [ADR-0005](file:///docs/adr/0005-job-reevaluation-and-history-tracking.md) | 求人元データからの個別/順次バッチAI再評価および適合度評価履歴タイムラインの採用 | **Accepted** | 2026-08-31 |
| [ADR-0006](file:///docs/adr/0006-cloud-realtime-sync.md) | クラウドデータベースによる複数端末間双方向リアルタイム同期とオフライン耐性 | **Accepted** | 2026-09-02 |
| [ADR-0007](file:///docs/adr/0007-smart-merge-and-conflict-resolution.md) | IDベースの決定論的スマートマージとLast-Write-Winsによるコンフリクト解消 | **Accepted** | 2026-09-02 |
| [ADR-0008](file:///docs/adr/0008-webrtc-p2p-cross-device-realtime-sync.md) | WebRTC P2P 通信によるクロスネットワーク複数端末リアルタイム同期と本番共有URLの標準化 | **Accepted** | 2026-09-02 |
| [ADR-0009](file:///docs/adr/0009-cloudflare-d1-e2ee-persistent-cloud-sync.md) | Cloudflare D1 サーバーレスSQLとWeb Crypto E2EE暗号化による常時非同期クロスデバイス同期の採用 | **Accepted** | 2026-09-03 |
| [ADR-0010](file:///docs/adr/0010-pwa-offline-caching-and-installability.md) | Service Worker による静的アセットのキャッシュおよび PWA スタンドアロンインストールの採用 | **Accepted** | 2026-09-03 |
| [ADR-0011](file:///docs/adr/0011-cloud-ssot-snapshot-sync.md) | クラウド SSoT（唯一の正本）の確立とマージ機能全廃によるスナップショット同期の採用 | **Accepted** | 2026-09-04 |
| [ADR-0012](file:///docs/adr/0012-ai-automated-pr-review-workflow.md) | GitHub Actions ＋ Gemini API による自動 AI PR レビューボットの採用 | **Superseded (by ADR-0013)** | 2026-09-05 |
| [ADR-0013](file:///docs/adr/0013-antigravity-fleet-pr-review-workflow.md) | Antigravity IDE Fleet 主導の最上位モデル PR レビュー＆修正・人間承認マージワークフローへの刷新 | **Accepted** | 2026-09-05 |
