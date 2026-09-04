## Phase 22: PWA（Progressive Web App）オフラインキャッシュとホーム画面追加（完全圏外起動）の実装 (Issue #20)

| 検証軸 | 検出事項・考慮点 | 実装・設計での解決策 |
| :--- | :--- | :--- |
| **1. 技術・環境** | Service Worker のキャッシュ戦略（Cache-First / Stale-While-Revalidate）と、動的 API（`/api/*`）のキャッシュ除外。 | `public/sw.js` で静的アセットを自動キャッシュし、`/api/*` および WebSocket/ntfy リクエストはネットワークへ直接転送。 |
| **2. UX・エッジケース** | スマホのホーム画面に追加した際、スタンドアロンモードでアドレスバーなしのネイティブ体験が得られること。 | `public/manifest.json` と iOS 用 meta タグ（`apple-mobile-web-app-capable`）を設定。 |
| **3. 永続性・互換性** | 完全オフライン（機内モード）で起動しても、0秒でアプリが開き、既存の LocalStorage データが正常表示されること。 | HTML/JS/CSS が Service Worker キャッシュから即時提供され、Local-First ストレージと完全協調。 |
| **4. テスト容易性 & 自律性** | `manifest.json` の仕様準拠および Service Worker 構文検証の単体テストが 100% PASS すること。 | `pwaManifest.test.ts` を作成し、PWA マニフェスト設定の網羅性をテスト。 |

---
