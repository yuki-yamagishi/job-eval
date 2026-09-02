# ADR-0008: WebRTC P2P 通信によるクロスネットワーク複数端末リアルタイム同期と本番共有URLの標準化

- **ステータス**: Accepted
- **決定日**: 2026-09-02
- **決定者**: JobEval 開発チーム
- **関連Issue**: [Issue #14](https://github.com/yuki-yamagishi/job-eval/issues/14)

---

## 1. 背景と課題 (Context & Problem Statement)

1. **ローカル環境における連携URLの不整合**:
   - PCでローカル開発サーバー（`localhost:5173`）やデスクトップアプリ（`tauri://`）として起動している際、同期モーダルで生成される連携URLが `http://localhost:5173?sync=JE-XXXX` となり、スマートフォン等の外部端末からアクセスできない問題があった。
2. **クロスネットワーク・クロスオリジン同期の未達**:
   - 既存の `BroadcastChannel` は同一ブラウザ内（同一オリジン）のタブ間通信に限定されるため、PC（ローカルネットワーク）とスマートフォン（インターネット上の `https://job-eval.pages.dev`）のように異なる環境間ではリアルタイム同期メッセージが到達しない課題があった。

---

## 2. 検討された選択肢 (Considered Options)

### 選択肢 1: 外部中央集権データベース（Firebase / Supabase）への全データ常時格納
- **特徴**: クラウドDBに全データを書き込み、各端末が購読。
- **制約**: Local-First 哲学に反し、個人情報（職歴・年収・応募状況）が外部DBに残り、利用者のAPIキー設定やDB料金管理が必要。

### 選択肢 2: WebRTC P2P DataChannel（PeerJS / シグナリング）による直接通信
- **特徴**: ルームコード（`JE-XXXX`）でシグナリングを行い、PC ↔ スマホ間で直接 P2P 接続（WebRTC DataChannel）を確立。
- **メリット**: 外部サーバーに個人データが一切保存されず、完全無料・ゼロ設定でミリ秒単位の双方向同期が可能。

### 選択肢 3: リアルタイム WebSocket PubSub メッセージリレー
- **特徴**: 暗号化されたルームIDトピックでメッセージを一時中継。
- **メリット**: NAT越えに強く、P2P が遮断されるファイアウォール環境でも確実に届く。

---

## 3. 決定内容と理由 (Decision Outcome & Rationale)

### 採用: **選択肢 2 & 3 のハイブリッド（WebRTC P2P / WebSocket PubSub リレー） ＋ 本番共有URLの固定標準化**

### 決定理由:
1. **Local-First & プライバシー保護の絶対遵守**:
   - 外部データベースに転職・個人情報を保存せず、端末間でエンドツーエンド直接通信を行うため、情報漏洩リスクがゼロ。
2. **完全無料・ゼロ設定**:
   - ユーザー側で Firebase や クラウドの設定を一切行うことなく、ルームコードを入力（またはURLを開く）だけで即座に接続可能。
3. **本番共有URLの標準化**:
   - どの環境（`localhost`, `tauri://`, `pages.dev`）で起動していても、スマホ連携リンクは常に **`https://job-eval.pages.dev?sync=JE-XXXX`** を生成し、スマホから確実にアクセスできるようにする。

---

## 4. トレードオフと影響 (Consequences & Trade-offs)

### メリット (Positive Impact)
- PCがローカル起動（localhost / Tauriアプリ）であっても、スマホ（job-eval.pages.dev）とリアルタイムに相互同期が可能になる。
- 接続時に `smartMerge` が自動発火し、双方の既存データが完全統合される。

### デメリット・制約 (Negative Impact / Limitations)
- 初期接続時のシグナリング確立に 1〜2 秒程度のハンドシェイク時間が必要。
