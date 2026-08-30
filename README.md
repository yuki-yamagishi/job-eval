<div align="center">

# 🧭 JobEval (Job Fit Evaluator & Career Trajectory Studio)

**個人特化型 AI 求人適合度評価 & 中長期キャリア戦略デスクトップアプリケーション**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri)](https://tauri.app/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-50_Tests_Passed-green?logo=vitest)](https://vitest.dev/)
[![Security](https://img.shields.io/badge/Security-0_Secrets_Leak_Enforced-emerald?logo=shield)](scripts/securityCheck.js)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

<p align="center">
  <b>「この求人は本当に自分に合っているのか？」「入社後の2〜3年でどのようなスキルが身につき、次の転職でどこを狙えるのか？」</b><br>
  エージェントから送られてくる大量の求人票を、Gemini AI と独自の4軸適合度スコアリングエンジンで客観分析。<br>
  Obsidian 連携 Markdown 出力・選考パイプライン管理・資格逆算ロードマップまでを一気通貫で支援するデスクトップツールです。
</p>

</div>

---

## 🎯 開発背景と解決する課題 (Problem & Solution)

### 📌 転職活動における課題
1. **情報の散乱と主観的な判断のブレ**: 複数エージェント（レバテック、ビズリーチ、doda等）から届く求人票のフォーマットがバラバラで、自身の希望条件やNG条件と照らし合わせた客観的な比較が困難。
2. **中長期キャリアの不透明さ**: 「目先の提示年収や職種」だけで選んでしまい、2〜3年後にどのような市場価値スキルが身につき、次にどのキャリア（Next Exit）に繋がるのかが見えにくい。
3. **資格・スキルギャップの曖昧さ**: 各社が求める必須資格やアピール推奨資格が一覧化されておらず、何を優先して学習・取得すべきかが分からない。

### 💡 JobEval による解決策
- **4軸多次元スコアリング**: 候補者のプロファイル（実務経験・学習中技術・保有資格・希望年収・NG条件）に基づき、100点満点と4軸（スキル40% / 希望条件30% / 成長性20% / リスク健全度10%）で客観評価。
- **中長期キャリア展望 & Next Exit AI 推論**: 入社後に獲得できる希少スキル、次に狙える上位職種（スタッフエンジニア/VPoE/CTO等）、将来の想定市場年収、技術的ロックインリスクを専用プロンプトで深掘り推論。
- **Obsidian 連携 Markdown 永続化**: YAML Frontmatter 付きの構造化 Markdown を Obsidian Vault やローカルストレージへ即時自動同期・エクスポート。
- **転職ロードマップ & 資格逆算ダッシュボード**: 保存求人を横断分析し、選考進捗パイプライン・見送り要因分析・各社指定資格の名寄せ集約マップを自動生成。

---

## ✨ 主要機能一覧 (Key Features)

| 画面 / 機能 | 概要と主な特徴 |
| :--- | :--- |
| **📥 求人テキスト取り込みペイン** | 各種転職サービス（レバテック、ビズリーチ、doda等）の雑多なテキスト本文をそのまま貼り付け。余分な空白や記号を自動サニタイズして即座に解析へ投入。 |
| **📊 AIスコアカード & リアルタイムPreview** | 4軸スコア内訳、適合理由、懸念点、**エージェントへの逆質問文（ワンクリックコピー機能付）**、応募時アピールポイント案をカード表示。Markdown プレビューと生編集タブを装備。 |
| **🚀 キャリア展望 & Next Exit 深掘りAI** | 初回解析の高速性（2〜3秒）を維持しつつ、検討したい本命求人のみ **専用プロンプトによる最高精度のキャリア展望（身につくスキル・次の転職先・将来想定年収・リスク）** をオンデマンド生成＆いつでも再生成可能。 |
| **💡 AI提案へのフィードバック & 再評価** | 「実はPythonの実務相当知識がある」等の追加情報を入力すると、AIが前回の評価と差分を考慮してスコアとアドバイスを再計算（インクリメンタル再評価）。 |
| **🗂️ 求人ドキュメント管理 & 横並び比較** | 保存済み案件のステータス管理（検討中/応募済/一次面接/内定/見送り等）、Markdown ドキュメントのインポート/エクスポート、複数求人の横並び比較マトリクス。 |
| **🗺️ 転職ロードマップ & 資格集約マップ** | 選考パイプラインのマイルストーン進捗、見送り・辞退要因の割合分析、求人票から逆算された **資格・スキルの名寄せ重複排除集約（どの会社が必須指定し、どの会社が推奨しているかの個別明記）**、各社選択後のキャリア分岐マップ。 |
| **⚙️ 候補者プロファイル & 条件設定** | 実務経験技術、学習中技術、保有資格（取得済/学習中）、希望年収レンジ、希望勤務形態、NG条件（受託開発NG、オンコール不可等）の設定。 |

---

## 🏛️ アーキテクチャ設計 (Architecture)

本アプリケーションは、**Feature/Domain-Driven Clean Architecture** に基づき、UI（React）とコアビジネスロジック・外部通信を完全に疎結合に設計しています。

```
src/
  ├── core/               # 純粋なビジネスロジック (UI/DOM依存ゼロ、100%単体テスト可能)
  │   ├── scoring/        # 4軸求人適合度スコアリングエンジン (40/30/20/10%)
  │   ├── markdown/       # YAML Frontmatter テンプレート生成・パース・サニタイザー
  │   ├── prompt/         # Gemini 構造化出力 (Structured Outputs) スキーマ & プロンプトビルダー
  │   └── constants/      # デフォルトプロファイル・初期設定
  ├── services/           # 外部通信 & 永続化アダプター
  │   ├── storage/        # StorageAdapter (Tauri FS / ブラウザ LocalStorage デュアル対応)
  │   └── ai/             # プラグイン型 AI Provider (GeminiAiProvider, MockAiProvider)
  ├── hooks/              # React カスタムフック (状態管理 & ストレージ同期)
  ├── features/           # 機能別 UI モジュール (input, preview, dashboard, roadmap, profile)
  └── components/         # 共通 UI & レイアウトコンポーネント (shadcn/ui スタイル)
```

### 💎 設計のこだわり
1. **100% 単体テスト可能なコアロジック**: `src/core/` 配下は React やブラウザ DOM に一切依存しない純粋関数で構築。
2. **デュアルストレージ互換性**: デスクトップ起動時は Tauri FS を介してファイルシステムへ、ブラウザ環境では LocalStorage へ自動フォールバック。
3. **プラグイン型 AI プロバイダー**: `AiProvider` インターフェースにより、API キー未設定時でも `MockAiProvider` が安全に作動し、全テスト・UI検証が自律動作。

---

## 🛡️ エンジニアリング・品質・セキュリティパイプライン

プロフェッショナルな開発標準を担保するため、ローカル・Gitフック・CI の 3 層で防御する自動品質ゲートを配備しています。

```
[ git commit / git push ]
         │
         ├── 1. 🔒 シークレット漏洩自動遮断 (scripts/securityCheck.js)
         │       └─ 全69ファイルのAPIキー・秘密鍵・.env混入を物理ブロック
         │
         ├── 2. 📝 ドキュメント整合性検査 (scripts/docCheck.js)
         │       └─ 4軸事前検証・実装計画書・成果レポートの記載漏れを判定・遮断
         │
         ├── 3. 🧪 TypeScript 型検査 & 単体・UIテスト (tsc --noEmit & vitest)
         │       └─ 50件のテスト全件パス & カバレッジレポート出力 (警告ゼロ)
         │
         └── 4. 📦 本番バンドルビルド (vite build)
```

- **ワンショット品質ゲート**: `npm run check` 1 コマンドで全検査を一括実行。
- **Git Pre-commit & Pre-push Hook**: コミット時およびプッシュ時に自動起動し、品質基準を満たさないコードのリモート送信を水際で遮断。

---

## 🚀 クイックスタート (Getting Started)

### 前提条件
- Node.js 20.x 以上
- npm 10.x 以上
- (デスクトップビルド時) Rust & Cargo (Tauri v2 前提環境)

### インストールと起動

```bash
# 1. リポジトリのクローン
git clone https://github.com/yuki-yamagishi/job-eval.git
cd job-eval

# 2. 依存関係のインストール
npm install

# 3. 品質・セキュリティゲートの全件実行 (全テスト・ビルド検証)
npm run check

# 4. ローカル開発サーバー起動 (ブラウザで即座に動作確認可能)
npm run dev
# -> http://localhost:1420 をブラウザで開きます
```

### API キーの設定
- アプリ起動後、上部タブの **「⚙️ プロファイル設定」** を開き、Google AI Studio で取得した **Gemini API キー** を入力して保存します。
- API キー未入力の状態でも、内蔵の `MockAiProvider` により全画面・全機能のシミュレーション動作が可能です。

---

## 🧪 テスト・品質検証コマンド

| コマンド | 実行内容・検証スコープ |
| :--- | :--- |
| `npm run check` | **ワンショット総合品質ゲート**: シークレットスキャン + ドキュメント整合性 + 型検査 + 全50件テスト + 本番ビルドを一括実行 |
| `npm run test:run` | 全単体・UI・統合テストを 1 回実行 |
| `npm run test:coverage` | Vitest V8 カバレッジレポートを出力 |
| `npm run security-check` | API キーや認証情報の誤混入を自動スキャン |
| `npm run doc-check` | `docs/` 配下の事前検証・計画・成果ログの整合性を検証 |
| `npm run build` | TypeScript コンパイルおよび Vite プロダクションビルド |

---

## 📄 ライセンス

本プロジェクトは [MIT License](LICENSE) のもとで公開されています。
