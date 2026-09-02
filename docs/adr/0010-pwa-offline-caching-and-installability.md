# ADR-0010: Service Worker による静的アセットのキャッシュおよび PWA スタンドアロンインストールの採用

- **ステータス**: Accepted
- **決定日**: 2026-09-03
- **決定者**: JobEval 開発チーム
- **関連Issue**: [Issue #20](https://github.com/yuki-yamagishi/job-eval/issues/20)

---

## 1. 背景と課題 (Context & Problem Statement)

1. **完全圏外時の起動不可問題**:
   - JobEval のデータは Local-First（LocalStorage）に保存されているが、Web アプリケーションであるため、初回起動時やブラウザキャッシュがない状態で地下鉄や機内モードなどの完全圏外（オフライン）になると、HTML/JS の読み込みに失敗して画面が開かない問題があった。
2. **スマホにおけるネイティブアプリ体験**:
   - アドレスバーやブラウザ枠を表示させず、スマホのホーム画面アイコンから 1 タップでフルスクリーン（スタンドアロン）起動できるネイティブ同等の UX が求められていた。

---

## 2. 検討された選択肢 (Considered Options)

### 選択肢 1: 通常の HTTP ブラウザキャッシュのみに依存
- **デメリット**: キャッシュの生存期間がブラウザ依存であり、機内モードやキャッシュクリア時に起動できない。

### 選択肢 2: PWA (Progressive Web App) + Service Worker (Cache-First / Stale-While-Revalidate)
- **メリット**:
  - Service Worker が静的アセット（HTML, JS, CSS, アイコン）を確実にローカルキャッシュ。
  - **完全圏外（電波ゼロ）であっても 0 秒で即座にアプリが起動**。
  - 「ホーム画面に追加」することで、独立したスタンドアロンアプリとして利用可能。
  - 同期 API（`/api/*`）はキャッシュ対象外とし、リアルタイム同期とオフライン起動を完全に両立。

---

## 3. 決定内容と理由 (Decision Outcome & Rationale)

### 採用: **選択肢 2（PWA ＋ Service Worker キャッシュ戦略 ＋ Web App Manifest）**

### 決定理由:
1. **100% オフライン耐性**:
   - 電波が一切届かない場所でも、スマホを開いて過去の求人分析結果や選考状況、プロファイル設定を快適に閲覧・操作可能。
2. **Local-First との完全な親和性**:
   - アプリ本体（Service Worker キャッシュ）とアプリデータ（LocalStorage）の双方が端末内に完結するため、最強のポータビリティを実現。

---

## 4. トレードオフと影響 (Consequences & Trade-offs)

### メリット (Positive Impact)
- iOS Safari および Android Chrome で「ホーム画面に追加」が可能。
- 機内モードでも 0 秒起動。
- アセットのバージョン更新（`CACHE_NAME`）により、新バージョンが自動適用される。

### デメリット・注意点 (Negative Impact / Considerations)
- 新バージョンのデプロイ時、Service Worker がバックグラウンドで更新を取得するため、2 回目のアクセスまたはリロード時に最新版が反映される。
