# ADR-0006: クラウドデータベース（Firebase Firestore）による複数端末間双方向リアルタイム同期とオフライン耐性

- **ステータス**: Accepted
- **決定日**: 2026-09-02
- **決定者**: JobEval 開発チーム
- **関連Issue**: [Issue #4](https://github.com/yuki-yamagishi/job-eval/issues/4)

---

## 1. 背景と課題 (Context & Problem Statement)

Cloudflare Pages + Cloudflare Access により、PCおよびスマートフォン（iOS/Android）の双方向から安全に Web アプリへアクセスできるようになった。  
しかし、従来の永続化層（`LocalStorageAdapter`）はブラウザローカルストレージに依存しているため、PCで登録・解析した求人情報やプロファイル設定がスマートフォン側へ自動共有されず、端末ごとにデータが孤立する課題があった。

本アーキテクチャ改定では、PC・スマートフォンの複数デバイス間で**同一の求人ドキュメント・選考ステータス・プロファイルをミリ秒単位で双方向リアルタイム同期**しつつ、**クラウド未設定時やオフライン環境でも既存のローカル動作を一切損なわない耐障害性**を確立することを目的とする。

---

## 2. 検討された選択肢 (Considered Options)

### 選択肢 1: Firebase Firestore (Google Cloud BaaS)
- **特徴**: ドキュメント指向NoSQL、`onSnapshot` によるネイティブ双方向リアルタイム購読、広大な無料枠（Sparkプラン）、SDKの堅牢性。
- **端末連携**: 共有ルームID（Sync Room ID）またはペアリングコード（6桁 / QRコード）によるパスワードレス端末バインド。

### 選択肢 2: Supabase Realtime (PostgreSQL BaaS)
- **特徴**: リレーショナルDB、Postgres Change Subscription によるリアルタイム同期。
- **制約**: クライアント単体での初期設定・スキーマ定義のオーバーヘッドが Firestore より大きい。

### 選択肢 3: ローカル P2P / WebSocket サーバー同期
- **特徴**: クラウド契約不要で同一 Wi-Fi 内でのみ通信。
- **制約**: 外出先（モバイル通信環境）やPC電源オフ時に同期・閲覧できない。

---

## 3. 決定内容と理由 (Decision Outcome & Rationale)

### 採用: **選択肢 1: Firebase Firestore によるリアルタイム同期アダプター（`FirestoreStorageAdapter`）**

### 決定理由:
1. **ミリ秒単位の双方向リアルタイム性**:
   - Firestore の `onSnapshot` リスナーにより、PC側で求人を追加・再評価した瞬間、スマホ側のダッシュボードもリロード不要で即座に同期描画される。
2. **完全無料・高可用性**:
   - 個人利用の規模（1日あたり数万回の読み書き枠）であれば完全無料で運用可能。
3. **パスワードレス・デバイス連携（Sync Room モデル）**:
   - 複雑なアカウント管理（メール/パスワード登録）を強いることなく、PCで発行された「同期コード（Room ID）」をスマホに入力（またはQR読み取り）するだけで安全にデータルームを共有できる。
4. **プラグイン型ストレージアダプターとの親和性**:
   - 既存の `StorageAdapter` インターフェースを実装する形で `FirestoreStorageAdapter` を追加するため、純粋なコアロジック（`src/core/`）を汚染せず、クラウド未接続時は既存の `LocalStorageAdapter` に自動フォールバックする。

---

## 4. トレードオフと影響 (Consequences & Trade-offs)

### メリット (Positive Impact)
- **シームレスなマルチデバイス体験**: 外出先でスマホから求人をステータス更新（「一次面接通過」など）すると、帰宅後のPCでも同一データが最新状態で維持される。
- **ゼロ破壊・100%後方互換**: クラウド設定を入力していない環境やオフライン環境でも、全テスト・ローカル機能がこれまで通り完全に動作する。
- **Obsidian 連携の維持**: Markdown エクスポート機能はそのままローカルへダウンロード可能。

### デメリット・制約 (Negative Impact / Limitations)
- `firebase` SDK のバンドルサイズ追加（約 80KB gzip）。
- クラウド同期を利用する場合、ユーザー側で Firebase プロジェクト作成（無料）と Config 入力（または事前設定）が必要。
