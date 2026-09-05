# Phase 14: スマートフォン向けレスポンシブUI最適化 & モバイル表示崩れの修正 実装計画書 (Issue #3)

## 🎯 実装目的・概要
Cloudflare Pages 経由でスマートフォン端末からアクセスした際、デスクトップ（Tauri/PCブラウザ）前提の固定レイアウトによって発生している「ヘッダー文字溢れ」「縦スクロール阻害」「テーブルはみ出し」等の表示崩れを解消し、モバイル環境でも快適に求人取り込み・AI評価・一覧管理を行えるレスポンシブUIを構築します。

---

## 📝 変更ファイル一覧と実装内容

### 1. ヘッダーナビゲーションのレスポンシブ化
- **`src/components/layout/Header.tsx`**:
  - モバイル画面（`< md`）では長文テキストを非表示にし、アイコン表示＋短縮ツールチップ化。
  - バッジやロゴのパディングを最適化し、幅 320px〜480px の画面でも画面外へ突き抜けないコンパクトなレイアウトへ調整。

### 2. メインコンテンツ領域のスクロール制御
- **`src/App.tsx`**:
  - `activeTab === "input"` におけるグリッドコンテナの `h-full overflow-hidden` を、モバイル画面では `overflow-y-auto` に対応。
  - 入力フォーム（`InputPane`）と評価結果（`PreviewPane`）が縦スクロールで自然に閲覧できるように設定。

### 3. ダッシュボード・プロファイル・ロードマップのレスポンシブ化
- **`src/components/dashboard/JobDashboard.tsx`**:
  - 求人ドキュメント一覧テーブルおよびマトリクス比較コンテナに `overflow-x-auto` を確実に適用。
  - フィルタボタンやアクションバーの `flex-wrap` 折り返し対応。
- **`src/features/profile/ProfileSettingsView.tsx`**:
  - 4軸重み付けスライダーや条件設定フォームの `grid-cols-1 sm:grid-cols-2` レスポンシブ化。
- **`src/features/roadmap/CareerRoadmapView.tsx`**:
  - マイルストーンマップおよび資格集約カードのモバイル幅最適化。

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check`（シークレットスキャン + ドキュメント整合性 + TypeScript型検査 + 全単体UIテスト + 本番ビルド）を実行し、全件 PASS を確認。
2. Git コミット・PR作成（`Closes #3`）を実施。

---
