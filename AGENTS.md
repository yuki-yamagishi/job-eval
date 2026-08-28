# JobEval エージェント開発ガイドライン & 開発ハーネス

JobEval は、**Tauri v2 + React 18 (TypeScript) + Vite + Tailwind CSS** で構築された、AI求人適合度評価 & Markdownドキュメント管理デスクトップアプリケーションです。

---

## 1. アーキテクチャ構成

本コードベースは、ドメイン駆動・機能駆動のクリーンアーキテクチャ（Domain/Feature-Driven Clean Architecture）に基づいて構築されています。

```
src/
  ├── core/               # 純粋なビジネスロジック (UI/外部依存ゼロ、100%単体テスト可能)
  │   ├── scoring/        # 多軸求人適合度スコアリングエンジン (40/30/20/10%)
  │   ├── markdown/       # Markdown & Frontmatter テンプレート生成・パース・サニタイザー
  │   ├── prompt/         # プロンプトビルダー & Gemini JSON Schema
  │   └── constants/      # 初期プロファイル・デフォルト設定
  ├── services/           # 外部通信・永続化アダプター
  │   ├── storage/        # StorageAdapter (Tauri FS / ブラウザ LocalStorage デュアル対応)
  │   └── ai/             # AIプロバイダー (AiProvider: GeminiAiProvider, MockAiProvider)
  ├── hooks/              # React カスタムフック (状態管理 & ストレージ同期)
  │   ├── useProfile.ts   # プロファイル管理フック
  │   └── useJobs.ts      # 保存済み求人・ステータス管理フック
  ├── features/           # 機能別 UI モジュール
  │   ├── input/          # 求人テキスト取り込みペイン
  │   ├── preview/        # AIスコアカード & Markdownプレビューペイン
  │   ├── dashboard/      # 求人ドキュメント管理 & パイプライン・比較マトリクス
  │   └── profile/        # 候補者プロファイル & 条件設定画面
  ├── components/         # 共通 UI & レイアウトコンポーネント (shadcn/ui スタイル)
  │   ├── ui/             # アトミックコンポーネント (ボタン, カード, 入力欄, バッジ, タブ等)
  │   └── layout/         # ヘッダー, ナビゲーション
  ├── types/              # TypeScript 型定義
  │   ├── job.ts
  │   ├── profile.ts
  │   └── storage.ts
  └── lib/                # 共通ユーティリティ (cn, フォーマッター)
docs/                     # アーキテクチャ・設計・検証ログの唯一の正本 (Single Source of Truth)
  ├── pre_phase_verification.md   # 各フェーズ開始前の4軸事前検証ログ
  ├── implementation_plan.md      # フェーズごとの簡潔な作業計画書
  └── walkthrough.md              # フェーズ完了・成果レポート
tests/                    # 自動テストハーネス
  ├── fixtures/           # サンプル求人票 (レバテック, ビズリーチ, doda, NG条件), テストプロファイル
  ├── core/               # コアロジック (スコアリング, Markdown生成, 総合パイプライン) テスト
  ├── services/           # ストレージアダプター & AIプロバイダー テスト
  └── features/           # React UI コンポーネント テスト
```

---

## 2. 標準フェーズ事前検証 & 計画プロトコル

各フェーズに着手する前に、必ず `docs/` 配下の 2 ドキュメント分離ルールに従ってください：

1. **事前検証ログ (`docs/pre_phase_verification.md`)**:
   - 4つの検証軸（1. 技術的ボトルネック, 2. UX & エッジケース, 3. 永続性 & フォーマット互換性, 4. テスト自律性）を評価し記録します。
2. **実装計画書 (`docs/implementation_plan.md`)**:
   - 事前検証の議論は含めず、純粋な変更ファイル一覧、実装内容、検証手順のみを簡潔に記載します。

---

## 3. 開発 & 検証コマンド一覧

エージェントおよび開発者は以下のコマンドを使用して変更を検証します：

| コマンド | 目的・実行内容 |
| :--- | :--- |
| `npm run check` | **ワンショット総合品質 & セキュリティゲート**: シークレット・個人情報スキャン (`security-check`) + `tsc --noEmit`（型検査）+ `vitest run --coverage`（全単体テスト & カバレッジ）+ `vite build`（プロダクションビルド）を一括実行 |
| `npm run security-check` | API キーやシークレットの誤混入を自動スキャン |
| `npm run test:run` | 全単体テストを 1 回実行 |
| `npm run test:coverage` | 単体テストを実行し、V8 カバレッジレポートを出力 |
| `npm run test` | テストをウォッチモードで実行 |
| `npm run dev` | Vite ローカル開発サーバーを起動 (ポート 1420) |
| `npm run build` | TypeScript コンパイルおよびフロントエンドのプロダクションビルド |

---

## 4. エージェントの重要開発ルール

1. **純粋なコアロジック**: `src/core/` 内で React や UI コンポーネントを絶対にインポートしないでください。コアロジックは DOM 依存ゼロで 100% 単体テスト可能でなければなりません。
2. **デュアルストレージ互換性**: すべてのデータ永続化は `StorageAdapter` を経由してください。デスクトップ起動時は Tauri FS を、ブラウザプレビュー時は LocalStorage / File System Access API を自動使用します。
3. **プラグイン型 AI プロバイダー**: `AiProvider` インターフェースを使用してください。テスト時は `MockAiProvider` が安全に動作するため、API キーがなくてもテストが 100% パスします。
4. **厳格な型安全性**: `any` 型の使用を禁止し、常に `src/types/` で定義された型を使用してください。
5. **検証 & コミットの徹底**: フェーズ完了時は必ず `npm run check` で全件合格を確認し、Conventional Commits 形式（`feat:`, `ci:`, `chore:`, `docs:`, `fix:` 等）の接頭辞をつけてコミット・プッシュしてください。
