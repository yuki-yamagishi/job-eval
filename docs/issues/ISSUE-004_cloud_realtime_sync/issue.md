# [Issue #4] クラウドデータベースによる複数デバイス（PC ↔ スマホ）間リアルタイムデータ同期の実装

- **ステータス**: オープン (To Do)
- **優先度**: 中 (Medium)
- **カテゴリ**: アーキテクチャ, クラウド同期, データ永続化 (StorageAdapter)
- **対象プラットフォーム**: Web (Cloudflare Pages), Mobile (iOS/Android), Desktop (Tauri)
- **GitHub Issue**: https://github.com/yuki-yamagishi/job-eval/issues/4

---

## 📌 課題の概要 (Problem Description)

Phase 1 により、Cloudflare Pages + Cloudflare Access を通じて PC・スマートフォン双方から安全に Web アプリへアクセスできる基盤が構築された。  
しかし現在、データ永続化層は各端末のブラウザ `LocalStorage`（またはデスクトップのローカルファイル）に依存しているため、**PC で登録した求人データやプロファイルがスマートフォンのブラウザへ共有・同期されない** という課題が存在する。

本 Issue では、クラウドデータベース（Firebase Firestore 等）を活用し、**PC とスマートフォン間で同一の求人データ・選考ステータス・プロファイルをリアルタイムに自動同期** する機能を実装する。

---

## 🎯 要件定義 (Requirements)

### 1. クラウドストレージアダプターの実装 (CloudStorageAdapter)
- 既存の `StorageAdapter` インターフェースを拡張・実装し、クラウド DB とローカルキャッシュを統合。
- クラウド接続未設定時やオフライン時は、自動的に既存の `LocalStorageAdapter` にフォールバックする耐障害設計を維持。

### 2. 双方向リアルタイム同期 (Real-time Synchronization)
- リアルタイムリスナー（Firestore `onSnapshot` または Supabase Realtime）を採用。
- PC 側で求人の解析・保存・ステータス更新を行った場合、リロード不要でスマートフォンの画面にもミリ秒単位で即時反映。
- スマートフォン側で選考ステータス（「一次面接通過」「見送り」等）を変更した場合も、即座に PC 画面へ同期。

### 3. デバイス間ペアリング機能 (Sync Room / QRコード連携)
- 複雑なアカウント登録・パスワード管理を不要とし、PC 画面上で発行された「**同期用ルームID / 6桁コード / QRコード**」をスマートフォンで読み取るだけで端末間バインドが完了する仕組みを提供。

### 4. オフライン対応 & コンフリクト制御
- 通信切断時でもローカルキャッシュで閲覧・操作を継続可能とする。
- タイムスタンプ（`updatedAt`）ベースの Last-Write-Wins または差分マージによる整合性維持。

---

## ✅ 受け入れ基準 (Acceptance Criteria)

- [ ] `StorageAdapter` にリアルタイム購読メソッド（`subscribeJobs`, `subscribeProfile` 等）が追加されていること。
- [ ] PC とスマートフォンで同一の同期ルームに接続した際、PC で追加した求人がスマホ側に即座に表示されること。
- [ ] スマホ側で求人のステータス変更を行った際、PC 側のダッシュボードにも即座に反映されること。
- [ ] クラウド設定が未完了のスタンドアロン状態でも、全単体テストおよび既存の LocalStorage 動作が一切損なわれないこと。
- [ ] `npm run check`（シークレットスキャン、ドキュメント検査、型検査、全テスト、ビルド）がすべて警告・エラーなしでパスすること。

---

## 📐 技術論点 & 設計方針 (Technical Notes)

1. **ADR の作成**:
   - バックエンド選定（Firebase Firestore vs Supabase）、認証モデル、同期プロトコルに関する意思決定記録を `docs/adr/0002-cloud-realtime-sync.md` として作成する。
2. **純粋コアロジックの不可侵**:
   - `src/core/` 内のスコアリングエンジンや Markdown 生成ロジックには一切手を加えず、`src/services/storage/` および `src/hooks/` のレイヤーで疎結合に統合する。
