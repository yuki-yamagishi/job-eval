# Phase 22: PWA（Progressive Web App）オフラインキャッシュとホーム画面追加の実装計画書 (Issue #20)

## 🎯 実装目的・概要
地下鉄や機内モードなどの完全オフライン環境であっても 0 秒で即座にアプリを起動し、過去の求人データ閲覧や操作を行えるようにするため、Web App Manifest、Service Worker オフラインキャッシュ、アプリアイコン、PWA ガイド UI を導入します。

---

## 📝 変更ファイル一覧と実装内容

### 1. Web App Manifest と アプリアイコンの作成
- **`public/manifest.json`**:
  - `name`: "JobEval - 転職求人適合度AI評価"
  - `short_name`: "JobEval"
  - `start_url`: "/"
  - `display`: "standalone"
  - `theme_color`: "#4f46e5"
  - `background_color`: "#0f172a"
  - `icons`: 192x192, 512x512
- **`public/icons/icon-192.png`**, **`public/icons/icon-512.png`**, **`public/icons/icon.svg`**:
  - PWA 用の美麗なアプリアイコンアセットを作成。

### 2. Service Worker の実装
- **`public/sw.js`**:
  - Cache-First / Stale-While-Revalidate による静的アセット自動キャッシュ。
  - 完全圏外（オフライン）時でもキャッシュから即時返却。
  - `/api/*` および WebSocket/ntfy リクエストのバイパス。

### 3. `index.html` への PWA メタタグ & Service Worker 登録
- **`index.html`**:
  - `<link rel="manifest" href="/manifest.json">`
  - `<meta name="theme-color" content="#4f46e5">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<link rel="apple-touch-icon" href="/icons/icon-192.png">`
  - Service Worker 登録スクリプトの追加。

### 4. 単体テストの追加
- **`tests/core/pwaManifest.test.ts`**:
  - マニフェスト設定とアイコン定義の単体テスト。

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check` を実行し、全ゲートの 100% PASS を確認。
2. Git コミット・PR作成（`Closes #20`）を実施。
3. `main` マージ後、Cloudflare Pages へ本番デプロイ。

---
