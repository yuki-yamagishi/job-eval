# [Feature] PWA（Progressive Web App）オフラインキャッシュとホーム画面追加（完全圏外起動）の実装

- **ステータス**: 🔵 着手可能 (Ready / To Do)
- **優先度**: 高 (High / Enhancement)
- **カテゴリ**: PWA, オフライン対応, Service Worker, モバイル体験, UX
- **対象プラットフォーム**: Web / Mobile (iOS Safari / Android Chrome) / Desktop PWA

---

## 📌 課題の概要 (Problem Description)

現在の JobEval はデータ自体がローカルストレージ（Local-First）に保存されているものの、ブラウザアプリ（Cloudflare Pages）であるため、**完全な圏外（機内モードや地下鉄）でブラウザを開いた際に HTML/JS の読み込みに失敗し、アプリが起動できない** 場合があった。

スマホの「ホーム画面に追加」を行うことで、ネイティブアプリのように **完全オフライン・電波ゼロでも 0 秒で即座にアプリを起動し、過去の求人閲覧やスコアの確認・編集を行える PWA（Progressive Web App）機能** を導入する。

---

## 🎯 要件定義 (Requirements)

### 1. Web App Manifest (`public/manifest.json`) の整備
- アプリ名（`JobEval - 転職求人適合度AI評価`）、短縮名（`JobEval`）、テーマカラー（`#4f46e5`）、背景色（`#0f172a`）、表示モード（`standalone`）を定義。
- iOS / Android 双方に対応するアプリアイコン（192x192, 512x512, maskable icon, apple-touch-icon）を配置。

### 2. Service Worker (`public/sw.js`) によるオフラインキャッシュ戦略
- **Cache-First / Stale-While-Revalidate 戦略**:
  - 静的アセット（HTML, JS, CSS, アイコン, フォント）を Service Worker に自動キャッシュ。
  - 完全オフライン時でもキャッシュから即座に応答し、0 秒でアプリを起動。
  - オンライン復帰時にバックグラウンドで最新版を自動取得・キャッシュ更新。
- **API 通信（`/api/*` / `ntfy.sh`）の除外**:
  - 動的同期 API はキャッシュせず、ネットワークへ直接リクエスト。

### 3. `index.html` への PWA メタタグ & Service Worker 登録
- `<meta name="theme-color">`, `<link rel="manifest">`, `<link rel="apple-touch-icon">` を設定。
- 本番環境（Pages / HTTPS）で Service Worker を自動登録。

### 4. PWA インストールガイド UI (`src/components/sync/SyncModal.tsx`)
- 同期モーダルまたはヘッダー等に、スマホ利用時の「📲 ホーム画面に追加してオフラインでも利用」の案内を表示。

---

## ✅ 受け入れ基準 (Acceptance Criteria)

- [ ] スマホ（Safari / Chrome）で「ホーム画面に追加」が可能になり、独立したアプリウィンドウ（スタンドアロン）で起動すること。
- [ ] 機内モード（完全オフライン・電波ゼロ）の状態でアプリを起動しても、エラーにならず 0 秒で画面が開き、求人データが閲覧できること。
- [ ] `npm run check`（シークレットスキャン、ドキュメント検査、TypeScript型検査、全単体テスト、ビルド）がすべて PASS すること。
