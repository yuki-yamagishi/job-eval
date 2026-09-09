# JobEval アーキテクチャ概説 & システム仕様 (Architecture Overview & SSOT)

JobEval は、**Tauri v2 + React 18 (TypeScript Strict) + Vite + Tailwind CSS** で構築された、AI求人適合度評価 & Markdownドキュメント管理デスクトップ/PWAアプリケーションです。
本ドキュメントは、プロジェクト全体のアーキテクチャ決定（ADR-0001〜0019）および仕様を統合した **唯一の仕様正本（Single Source of Truth: SSOT）** です。

---

## 1. システム全体概要

転職活動において多種多様なフォーマットで送られる求人票テキストを、AI（Google Gemini API）を活用して瞬時に構造化・多軸評価し、ローカルファーストの Frontmatter 付き Markdown として永続化・管理します。

### コアバリュー
- **ローカルファースト & プライバシー保護**: 求人データや職歴プロファイルは端末内の Markdown / ローカルストレージに安全に保管。
- **客観的多軸適合度スコアリング**: 自身のスキル・希望条件に基づき、4軸（スキル40%、条件30%、成長性20%、定着リスク10%）の客観スコアを算出。
- **クロスデバイス E2EE クラウド同期**: Cloudflare D1 と Web Crypto AES-GCM によるエンドツーエンド暗号化同期により、複数端末で安全にデータを一元管理。
- **エージェント交渉支援**: 書類選考前に確認すべき「エージェントへの逆質問」や「応募時アピールポイント」を自動生成。

---

## 2. ディレクトリ構造と責務分割 (Clean Architecture)

ドメイン駆動・機能駆動のクリーンアーキテクチャ（Domain/Feature-Driven Clean Architecture）に基づいて設計されています。

```
src/
  ├── core/               # 純粋なビジネスロジック (UI/外部依存ゼロ、100%単体テスト可能)
  │   ├── scoring/        # 多軸求人適合度スコアリングエンジン (40/30/20/10% & 動的重み付け)
  │   ├── markdown/       # Markdown & Frontmatter テンプレート生成・パース・サニタイザー
  │   ├── prompt/         # プロンプトビルダー & Gemini JSON Schema
  │   └── constants/      # 初期プロファイル・デフォルト設定・システムプロンプト
  ├── services/           # 外部通信・永続化アダプター
  │   ├── storage/        # StorageAdapter (Tauri FS / ブラウザ LocalStorage デュアル対応)
  │   ├── ai/             # AIプロバイダー (GeminiAiProvider, MockAiProvider)
  │   └── cloudSync/      # Cloudflare D1 E2EE クラウド同期サービス
  ├── hooks/              # React カスタムフック (状態管理 & ストレージ同期)
  ├── features/           # 機能別 UI モジュール (input, preview, dashboard, profile, sync)
  ├── components/         # 共通 UI & レイアウトコンポーネント (shadcn/ui スタイル)
  ├── types/              # TypeScript 型定義 (厳格な型安全性を確保)
  └── lib/                # 共通ユーティリティ (cn, フォーマッター, 暗号化ヘルパー)
docs/                     # アーキテクチャ・設計・検証ログの正本
  ├── architecture_overview.md    # 本仕様書 (SSOT)
  ├── adr/                        # Architecture Decision Records (不変の設計決定記録)
  ├── issues/                     # 各Issueごとの4ファイル完結ドキュメント
  └── archive/                    # 過去の設計・フェーズ・旧仕様のアーカイブ
tests/                    # 自動テストハーネス (Vitest)
```

---

## 3. ADR（設計決定記録）統合マップ

本システムのすべての重要設計は ADR として記録・管理されています。

| ADR 番号 | タイトル | ステータス | 概要・決定事項 |
| :--- | :--- | :--- | :--- |
| [ADR-0001](./adr/0001-four-axis-scoring-engine.md) | 40/30/20/10% 多軸求人適合度スコアリングエンジンの採用 | **Accepted** | スキル(40%)・条件(30%)・成長性(20%)・労働環境(10%)の4軸加重平均スコアリングエンジン。 |
| [ADR-0002](./adr/0002-dual-storage-and-markdown-persistence.md) | Tauri FS / Web Dual Storage と Frontmatter Markdown 永続化の採用 | **Accepted** | Tauri環境ではOSローカルファイル、Web/PWAではLocalStorageへの透過的永続化。 |
| [ADR-0003](./adr/0003-pluggable-ai-providers.md) | MockAiProvider & GeminiAiProvider のプラグイン型 AI 設計の採用 | **Accepted** | 外部通信なしで100%単体テスト可能なプラグイン型AIプロバイダー設計。 |
| [ADR-0004](./adr/0004-dynamic-weighting-scoring.md) | 動的重み付けプロファイル (Dynamic Weighting Profile) および高速再計算エンジンの採用 | **Accepted** | ユーザーが軸ごとの重み比率をカスタマイズでき、AI再推論なしで即時再スコアリング。 |
| [ADR-0005](./adr/0005-job-reevaluation-and-history-tracking.md) | 求人元データからの個別/順次バッチAI再評価および適合度評価履歴タイムラインの採用 | **Accepted** | プロファイル更新時のAI再評価履歴（スコア推移・差分）のタイムライン保持。 |
| [ADR-0006](./adr/0006-cloud-realtime-sync.md) | クラウドデータベースによる複数端末間双方向リアルタイム同期とオフライン耐性 | **Accepted** | 端末間の自動同期の基礎アーキテクチャ。 |
| [ADR-0007](./adr/0007-smart-merge-and-conflict-resolution.md) | IDベースの決定論的スマートマージとLast-Write-Winsによるコンフリクト解消 | **Accepted** | データ同期時のコンフリクト解消アルゴリズム。 |
| [ADR-0008](./adr/0008-webrtc-p2p-cross-device-realtime-sync.md) | WebRTC P2P 通信によるクロスネットワーク複数端末リアルタイム同期と本番共有URLの標準化 | **Accepted** | P2Pデータチャネルを用いたデバイス間直接通信。 |
| [ADR-0009](./adr/0009-cloudflare-d1-e2ee-persistent-cloud-sync.md) | Cloudflare D1 サーバーレスSQLとWeb Crypto E2EE暗号化による常時非同期クロスデバイス同期の採用 | **Accepted** | ゼロ知識アーキテクチャによる暗号化常時同期。 |
| [ADR-0010](./adr/0010-pwa-offline-caching-and-installability.md) | Service Worker による静的アセットのキャッシュおよび PWA スタンドアロンインストールの採用 | **Accepted** | デスクトップアプリに加え、PWAとしてのインストール・オフライン動作を支援。 |
| [ADR-0011](./adr/0011-cloud-ssot-snapshot-sync.md) | クラウド SSoT（唯一の正本）の確立とマージ機能全廃によるスナップショット同期の採用 | **Accepted** | クラウドスナップショットを唯一の正本とする決定論的同期への単純化。 |
| [ADR-0012](./adr/0012-ai-automated-pr-review-workflow.md) | GitHub Actions ＋ Gemini API による自動 AI PR レビューボットの採用 | **Superseded** | ADR-0013 に統合・刷新。 |
| [ADR-0013](./adr/0013-antigravity-fleet-pr-review-workflow.md) | Antigravity IDE Fleet 主導の最上位モデル PR レビュー＆修正・人間承認マージワークフローへの刷新 | **Accepted** | 独立思考コンテキストを持つ Fleet サブエージェントによる客観的 PR レビュー。 |
| [ADR-0014](./adr/0014-harness-refactoring-and-responsibility-separation.md) | 開発ハーネス（Agent / Skill / Hook / Docs / Checkers）の抜本的リファクタリング＆責務分割刷新 | **Accepted** | 開発ハーネスのモジュール化と責務分離。 |
| [ADR-0015](./adr/0015-corporate-benefit-research-and-model-separation.md) | Gemini Google Search Grounding による企業・福利厚生Web調査と用途別モデル分離・Thinking制御 | **Accepted** | 企業調査と求人適合度評価におけるモデル最適化（Thinking Budget 制御含む）。 |
| [ADR-0016](./adr/0016-loop-engineering-harness-refactoring.md) | ループエンジニアリング確立に向けた開発ハーネスの 6 段階リファクタリング＆責務分割 | **Accepted** | `loopState.js`, ライフサイクルフック、早期停止防止、DoDによる自律自己修復ループの確立。 |
| [ADR-0017](./adr/0017-optimize-agent-scaffolding-and-gradual-verification.md) | AI駆動開発のための補助資源最適化（憲章とスキルの分離・段階的検証・ワークスペース衛生・仕様SSOT一元化） | **Accepted** | Token Tax 削減、コミット時ドキュメント制約緩和、一時ファイル排除、仕様正本の一元化。 |
| [ADR-0018](./adr/0018-antigravity-customization-layer-refactoring.md) | Google Antigravity 公式仕様に準拠した Customization Layer への抜本的刷新 | **Accepted** | `scripts/harness/` 完全撤廃、3単一責務スキル分割、公式Subagent、自己承認物理禁止、Why-First・CI・Merge Gate、内外分離（Boundary Design）。 |
| [ADR-0019](./adr/0019-multi-agent-review-consortium.md) | Fleet レビュー体制の 2 者合議制（コード品質担当 ＋ 批判的完了性監査担当）への拡張 | **Accepted** | 2者 Fleet の責任分離（コード品質・型・セキュリティ担当 `fleet_reviewer` ＋ 批判的完了性・Why・排除リスク監査担当 `fleet_completion_auditor`）と両者合議判定ゲート（Consortium Gate）。 |

---

## 4. AI 駆動開発 Customization Layer と多層ガバナンス

本リポジトリは、Google Antigravity 公式仕様に準拠した **Customization Layer（カスタマイズ層）** を備えています。

1. **憲章とスキルの分離 (Progressive Disclosure)**:
   - `AGENTS.md`: 毎ターン読み込まれるコア憲章（DoD・絶対遵守事項・アーキテクチャ不可侵原則）。
   - `.agents/skills/`: 各フェーズに応じた 3 つの単一責務スキル（`issue-lifecycle`, `dev-lifecycle`, `review-self-healing`）をオンデマンドで段階的開示。
2. **多重物理ガードレール (Mechanism)**:
   - `preToolHook.js`: `gh pr merge` の直接実行禁止、およびブランチ作成時の DoR 検査（dirtyツリー禁止、前タスク完了確認、Why / 排除リスク記載確認）、PR作成時の Pre-PR 最終監査（4軸ドキュメント、DoD未チェック残存ゼロ、SSOT同期）。
   - `loopState.js`: CI 未通過時のレビュー依頼ブロック（CI Gate）、および PR 未マージ時の勝手なリセット阻止（Merge Verification Gate）。
   - `stopHook.js`: レビュー指摘の解消と Fleet の Re-review（LGTM）を受領するまで早期停止をブロック。
3. **2者 Fleet 並行合議レビュー (Review Consortium)**:
   - 公式仕様の独立サブエージェント 2 体（`fleet_reviewer` と `fleet_completion_auditor`）を並行起動。
   - コード品質（How）と批判的完了性（Why / What）を完全に分離し、両者が共に `LGTM` を出した場合のみマージ依頼を許可する合議制ゲートを配備。
4. **内外分離 (Boundary Design)**:
   - 人間向け（意思決定・承認）は完全日本語で記述し、エージェント向け（内部制御・修復指示）は英語に完全統一してトークン効率と指示追従性を最大化。
