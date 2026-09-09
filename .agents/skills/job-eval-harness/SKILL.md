---
name: job-eval-harness
description: JobEval 開発ガイドライン、AIアシスト Issue/PR 連携、ADR設計決定記録、Issueフォルダ完結型ドキュメント管理、独立Fleetレビュー、品質・セキュリティゲート、および完全日本語ドキュメント標準化スキル。JobEval プロジェクトの機能追加・改修・検証時に必ず使用する。
---

# JobEval 開発・自己修復実践 Runbook (job-eval-harness)

このスキルは、**JobEval (AI求人適合度評価 & Markdown管理デスクトップアプリ)** において、エージェントがタスクを自律完走するための **「実践 Runbook（実行手順書・コマンド集・安全規約）」** です。
基本規約・アーキテクチャ原則・完了定義（DoD）の憲章はリポジトリ直下の **`AGENTS.md`** を参照してください。

---

## 1. Issue ライフサイクル規定とエージェント自律判断ルール

Issue はプレフィックス付きラベル（`status:*`, `type:*`, `priority:*`）によって管理し、AI エージェントは機械的に着手可否を判定します：

### ① 進行ステータス (`status:*`)【OPEN中の一時的な状態】
| ステータス / ラベル | 意味・状態 | AIエージェントの行動基準 |
| :--- | :--- | :--- |
| **🟡 `status: backlog`** | **「アイデア・要件の保管」**<br>価値はあるが、今すぐは着手しない。 | **着手禁止**。<br>ユーザーから明示的に「Issue #X を着手して」と指示されるまで待機。 |
| **🟠 `status: todo`** | **「直近の実施候補」**<br>方向性は合意したが、要件詳細化中。 | 要件・設計の整理・対話を優先。 |
| **🔵 `status: ready`** | **「着手準備完了」**（Definition of Ready 達成）<br>要件・受入基準・設計論点が100%確定。 | **自律的に開発開始可能**。<br>トピックブランチを作成して実装を進めてよい。 |
| **🟣 `status: in-progress`** | **「開発中」**<br>トピックブランチで作業中。 | コミット・テスト・PR作成を実行中。 |
| **State: `CLOSED`** | **「完了」**（ラベル不要）<br>PRマージ＆品質ゲート合格完了。 | GitHub 標準機能で自動クローズ（statusラベルは剥がす）。 |

### ② Issue の種類 (`type:*`)【恒久的な分類】
- 🟢 **`type: feature`**: 新機能・機能拡張
- 🔴 **`type: bug`**: 不具合・バグ修正
- 🟡 **`type: refactor`**: リファクタリング（機能変更なし）
- 🧪 **`type: test`**: テスト作成・拡充
- 🤖 **`type: harness`**: AIエージェント開発環境・ガードレール・検査スクリプト
- 🚀 **`type: ci`**: CI/CD・GitHub Actions・ビルド・デプロイ設定
- 📘 **`type: docs`**: 設計書・ADR・仕様書
- ⚪ **`type: chore`**: 依存関係更新・軽微な雑務

> **エージェント着手プロトコル**:
> 1. `status: backlog` ラベルが付いている Issue は、指示がない限り勝手に実装を進めてはならない。
> 2. `status: backlog` や `status: ready` から着手する際は、まず `gh issue edit <id> --remove-label "status: backlog,status: ready" --add-label "status: in-progress"` でラベルを更新してからブランチを作成する。
> 3. PR 作成時は `Closes #<Issue番号>` を含め、マージ時に Issue が自動クローズされるようにする。クローズ後は `status:*` ラベルを外す。

---

## 2. 実践 Runbook: タスク着手から完了までの 7 フェーズ

```
[ Phase 1: 着手・ブランチ ] ➔ [ Phase 2: 実装・ドキュメント ] ➔ [ Phase 3: 検証・コミット ]
                                                                       │
[ Phase 7: 承認マージ ]  [ Phase 6: 自己修復・解決報告 ]  [ Phase 5: Fleetレビュー ]  [ Phase 4: PR作成 ]
```

### Phase 1: Issue 着手 & トピックブランチ作成
1. **着手判定**: `status: backlog` の場合はユーザー指示を待つ。指示または `status: ready` の場合は自律着手。
2. **Issue ラベル更新**:
   ```bash
   gh issue edit <id> --remove-label "status: backlog,status: ready" --add-label "status: in-progress"
   ```
3. **トピックブランチ作成**:
   ```bash
   git checkout -b feature/issue-<番号>-<概要>
   ```

### Phase 2: コア実装 & 4軸ドキュメント整備 (`docs/` 配下)
1. **設計原則**: クリーンアーキテクチャに基づき、`src/core/`（純粋ロジック）から実装。
2. **Issue フォルダ完結型ドキュメントの作成**:
   `docs/issues/ISSUE-XXX_<slug>/` 配下に以下の 4 ファイルを完全日本語で作成：
   - `issue.md`: 要件定義・受入基準
   - `pre_verification.md`: 4軸事前検証ログ（技術的ボトルネック、UX、データ永続性、テスト自律性）
   - `plan.md`: 実装計画書（変更ファイル一覧、実装内容、検証手順）
   - `walkthrough.md`: 実装成果レポート（Phase 6/7で成果を記録）
3. **ルートポインタの更新**:
   `docs/pre_phase_verification.md`, `docs/implementation_plan.md`, `docs/walkthrough.md` を対象 Issue フォルダを指すよう更新。
4. **ADR（設計決定記録）の作成**:
   - スコアリング計算式や永続化フォーマット、アーキテクチャの変更を伴う場合は、必ず `docs/adr/000X-xxx.md` を作成して意思決定理由を記録。
   - `docs/adr/README.md` の一覧テーブルにも該当 ADR を必ず登録する（`scripts/docCheck.js` で自動検証）。

### Phase 3: 自動品質検証 & コミット & リモートプッシュ
1. **開発中の高速反復**:
   ```bash
   npm.cmd run check:fast
   ```
2. **段階的ドキュメント検証（コミット時）**:
   - コミット時は `issue.md` と `plan.md` さえあれば中間コミット可能（`pre-commit` フックにより `docCheck.js --pre-commit` が自動実行）。
3. **Conventional Commits 規約に準拠したコミット**:
   - `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `ci:`
4. **コミット・プッシュ前のフル品質ゲート**:
   ```bash
   npm.cmd run check
   ```
5. **リモートプッシュ**:
   ```bash
   git push origin <ブランチ名>
   ```

### Phase 4: Pull Request 作成 & 早期停止ガード発動
1. **PR 作成**:
   ```bash
   gh pr create --title "<タイトル>" --body-file <一時ファイル>
   ```
   - PR 本文には `Closes #<Issue番号>` を必ず含める。
   - **【最重要】PR 作成直後の自動マージは厳禁。PR は必ず OPEN 状態を維持すること。**
2. **早期停止ガードの発動**:
   - `postToolHook.js` が PR 作成を自動検知し、`loopState.js` の状態が `PR_CREATED` に遷移します。
   - この時点でエージェントが作業終了（会話終了）しようとすると、Stop フック（`stopHook.js`）により物理的にブロックされます。

### Phase 5: Antigravity Fleet（独立サブエージェント）客観レビュー
1. **レビュー待機状態への遷移**:
   ```bash
   node scripts/harness/loopState.js review-requested --active-subagents
   ```
2. **Fleet サブエージェントの起動**:
   - `invoke_subagent` で `fleet_reviewer`（最上位モデル Gemini 3.8 Flash）を起動。
   - Fleet は `git diff` を読み取り、Conventional Comments 接頭辞（`[must]`, `[should]`, `[imo]`, `[nits]`, `[ask]`, `[good]`）を付与したレビューを作成。
   - Fleet は作成したレビュー Markdown を親エージェントへ返却し、親エージェントが `node scripts/harness/postPrComment.js <PR番号> <一時ファイル>` で GitHub PR スレッドに公式コメントとして永続記録。
3. **Reactive Wakeup 待機**:
   - 親エージェントはツールを呼ばずに待機し、Fleet の完了通知を受け取ります。

### Phase 6: レビュー結果パース & 手元自己修復 & 解決報告（DoD 達成）
1. **レビュー結果のパース & loopState 更新**:
   ```bash
   node scripts/harness/parseReviewResult.js <レビュー本文ファイル> --update-state
   ```
   - ブロッキング指摘（`[must]`, `[should]`）がある場合、状態は `STATUS.NEEDS_FIX` となります。
2. **手元自己修復コミット**:
   - 指摘事項を修正し、単体テストを追加。
   - `npm.cmd run check` で 100% PASS を確認後、追加コミット＆プッシュ。
3. **公式解決報告の投稿（収束）**:
   ```bash
   node scripts/harness/resolveReview.js --commit <コミットハッシュ> --summary "<修正概要>"
   ```
   - PR スレッドに公式解決コメントが投稿され、全ブロッキング指摘解消時に状態が `STATUS.RESOLVED_LGTM` に収束します。
   - `RESOLVED_LGTM` に達して初めて、Stop フックの停止ガードが解除されます。

### Phase 7: 人間（ユーザー）承認によるマージ & 完了
1. **人間（ユーザー）への報告**:
   - レビュー指摘の解消と総合判定 `[LGTM (All Resolved)]` を確認し、ユーザーにマージの可否を伺う。
2. **承認マージ**:
   - **人間（ユーザー）の明示的な指示または承認を得てからのみマージを実行する。**
3. **状態リセット**:
   ```bash
   node scripts/harness/loopState.js reset
   ```
4. **Issue クローズ & ラベルクリーンアップ**:
   - PR マージにより Issue は自動クローズされるため、`status:*` ラベルを外す：
   ```bash
   gh issue edit <id> --remove-label "status: in-progress"
   ```

---

## 3. 開発 & ハーネス コマンドリファレンス

| コマンド | 用途・実行内容 |
| :--- | :--- |
| `npm run check` | **ワンショット総合品質 & セキュリティゲート**: シークレットスキャン + ドキュメント検査 + 型検査 + 全単体テスト & カバレッジ + 本番ビルドを一括実行 |
| `npm run check:fast` | **高速型・単体テスト検査**: `tsc --noEmit` + `vitest run`（2〜3秒で完了） |
| `npm run security-check` | API キーやシークレットの誤混入を自動スキャン |
| `npm run doc-check` | ドキュメント & ハーネス整合性自動検査 (`scripts/docCheck.js`) |
| `npm run test:run` | 全単体テストを実行 |
| `npm run test:coverage` | 単体テストを実行し、V8 カバレッジレポートを出力 |
| `npm run dev` | Vite ローカル開発サーバーを起動 (ポート 1420) |
| `npm run build` | TypeScript コンパイルおよびフロントエンドのプロダクションビルド |
| `node scripts/harness/loopState.js status` | 現在の自己修復ループ状態を確認 |
| `node scripts/harness/loopState.js can-stop` | Stop フックによる終了可否を判定 |
| `node scripts/harness/parseReviewResult.js <file> --update-state` | レビュー結果 Markdown をパースし loopState を更新 |
| `node scripts/harness/resolveReview.js --commit <hash> --summary "<概要>"` | 修正コミット紐付け解決報告コメントを投稿し loopState を収束 |
| `node scripts/harness/loopState.js reset` | ループ状態を IDLE にリセット |

---

## 4. ガードレール & 安全規約

1. **ウォッチモード（常駐プロセス）の実行厳禁**:
   - エージェントは対話シェルではないため、`npm test`（ウォッチモード）を絶対に実行してはならない。必ず単発終了コマンド（`npm.cmd run test:run` または `npm.cmd run check`）を使用すること。
2. **単一コマンド実行規約**:
   - PowerShell のセミコロン（`;`）や `&&`、パイプ（`|`）を用いた複数コマンド連結は禁止。1 回のツール呼び出しで 1 コマンドを実行すること。
3. **Windows PowerShell 環境での実行規約**:
   - スクリプト実行ポリシーを回避するため、必ず `npm.cmd` を使用すること。
4. **文字化け・クォート破損防止**:
   - PR コメント投稿時は生文字列渡しを避け、必ず一時ファイル経由の `--body-file`（`postPrComment.js`）を使用すること。
5. **自律的サブエージェント（並列実行）安全規約**:
   - **最大並列数**: 同時に起動するサブエージェントは **最大 4 体まで**（レート制限防止）。
   - **品質ゲートの一元化**: 各サブエージェントはコード作成・テスト作成のみを行い、一括品質ゲート（`npm run check`）およびコミット・プッシュは親エージェントが全体の完了後に 1 回のみ実行（ファイルロック・ビルド競合防止）。
   - **スタイル統一**: 既存の類似テストやコンポーネントを参考例として各サブエージェントに渡し、実装のブレを防ぐ。
   - **PR マージの人間承認**: PR の自動マージは厳禁。必ず人間の承認を得てから親エージェントが実行する。
