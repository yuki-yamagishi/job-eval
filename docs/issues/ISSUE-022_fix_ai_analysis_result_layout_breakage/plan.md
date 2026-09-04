# Phase 23: AI解析後プレビュー画面（PreviewPane）における表示レイアウト崩れの修正 実装計画書 (Issue #22)

## 🎯 実装目的・概要
AI 解析後または保存済み求人のプレビュー画面（`PreviewPane.tsx`）において、2 ペイン分割時やモバイル幅で発生していた「ヘッダーアクションのはみ出し・重なり」「スコアサマリーとスコア内訳バーの折り返し崩れ」「ポジティブ/懸念点カードの幅不足」を解消し、あらゆる画面幅で快適・美麗に閲覧・操作できるようにします。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/components/pane/PreviewPane.tsx`
- **Top Bar アクションヘッダーの最適化**:
  - `h-12` 固定から `min-h-12 py-1.5 px-3 sm:px-4 flex flex-wrap items-center justify-between gap-2` に改修。
  - 左側（ランクバッジ、企業名、ファイル名）の `truncate` 最大幅をレスポンシブに調整。
  - 右側（表示切替トグル、全文コピー、再評価ボタン、Obsidian保存ボタン）の余白とボタンサイズを整理し、自然に折り返されるように調整。
- **AI サマリーヘッダーカードの改善**:
  - タイトル・企業名エリアとスコア表示エリアを `flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3` に改修。
  - スコア内訳バーを `grid grid-cols-2 sm:grid-cols-4 gap-2` に改修。
- **ポジティブ要素 & 懸念点カードの改善**:
  - `grid-cols-2` から `grid grid-cols-1 md:grid-cols-2 gap-3` に改修。
- **スプリット編集モードの高さ最適化**:
  - 固定高さから `flex-1 min-h-[500px]` に調整し、多重スクロールバーの発生を防止。

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check` を実行し、全ゲート（シークレットスキャン、ドキュメント検査、TypeScript型検査、全単体テスト 18 ファイル 86 件、ビルド）の 100% PASS を確認。
2. Git コミット・PR作成（`Closes #22`）を実施。
3. `main` マージ後、Cloudflare Pages へ本番デプロイ。

---
