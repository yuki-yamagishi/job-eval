# Phase 32: AI レビュー指摘への重要度プレフィックス（[must], [should], [imo]等）義務化 実装計画書 (PR #37)

## 🎯 実装目的・概要
AI レビューボットの各指摘事項について、対応必須度・重要度を一目で判別可能にするため、標準レビュー接頭辞（Conventional Comments スタイル）を義務化し、コメント冒頭に凡例ガイドを表示します。

---

## 📝 変更ファイル一覧と実装内容
- `scripts/aiPrReviewer.js`: プロンプトに `[must]`, `[should]`, `[imo]`, `[nits]`, `[ask]` 必須化ルールを追加し、PRコメント冒頭に凡例ガイドを挿入。
- `tests/scripts/aiPrReviewer.test.ts`: 接頭辞および凡例ガイドの出力アサーションを追加。

---

# Phase 31: AI PR レビューのデフォルトモデル最適化とRPDクォータ上限回避 実装計画書 (PR #36)

## 🎯 実装目的・概要
RPDクォータ枯渇（`429 RESOURCE_EXHAUSTED`）を回避するため、日次リクエスト枠が潤沢（500〜1,500回/日）な `gemini-3.5-flash-lite` をデフォルトとし、`gemini-3.1-flash-lite` への自動フォールバックを実装。

---

# Phase 30: GitHub Actions ＋ Gemini API による自動 AI PR レビューボットの導入 実装計画書 (Issue #34, ADR-0012)

## 🎯 実装目的・概要
プルリクエスト（PR）が発行・更新された際、GitHub Actions をトリガーとして独立した AI レビュアー（Gemini API）が自動でコード差分（diff）およびアーキテクチャ規約（`AGENTS.md`）を解析し、客観的な指摘・エッジケース検出・保守メモを PR コメントとして自動投稿するレビュー自動化基盤を構築します。

---

## 📝 変更ファイル一覧と実装内容

### 1. ガバナンス・設計ドキュメント
- `docs/issues/ISSUE-034_ai_pr_reviewer_workflow.md` 起票
- `docs/adr/0012-ai-automated-pr-review-workflow.md` 起票 & `docs/adr/README.md` 登録
- `docs/pre_phase_verification.md` & `docs/walkthrough.md` 更新

### 2. レビュー自動化スクリプト (`scripts/aiPrReviewer.js`)
- PR の Git 差分（`git diff origin/main...HEAD` 等）または GitHub Actions context から変更内容を取得。
- Gemini API（`gemini-2.5-flash` または利用可能なモデル）を呼び出し、コード差分・コンテキスト・`AGENTS.md` 規約をプロンプトに注入。
- エッジケース・保守メモ・アーキテクチャ整合性にフォーカスした構造化レビュー結果を生成。
- `GITHUB_TOKEN` を用いて GitHub REST API または `gh pr comment` で PR にコメントを投稿。
- `GEMINI_API_KEY` 未設定時や外部 PR での Graceful Skip 機構。

### 3. GitHub Actions ワークフロー (`.github/workflows/ai-pr-reviewer.yml`)
- `pull_request` イベント（`opened`, `synchronize`, `reopened`）でトリガー。
- 権限: `pull-requests: write`, `contents: read`。
- Node.js 環境で `scripts/aiPrReviewer.js` を実行。

### 4. 単体テスト (`tests/scripts/aiPrReviewer.test.ts`)
- diff パース、プロンプト構築、Gemini API レスポンス解析、コメント投稿の各関数の単体テストを作成。

---

## 🧪 検証手順
1. `npm.cmd run test:run` の全テスト PASS 確認。
2. `npm.cmd run check` による全品質ゲート（セキュリティ、ドキュメント、型、テストカバレッジ、ビルド）100% PASS 確認。
3. PR を起票し、GitHub Actions ワークフローとスクリプトが正しくコミットされていることを確認。

---

# Phase 29: クラウド SSoT アーキテクチャ刷新とマージ機能全廃 実装計画書 (Issue #32)

## 🎯 実装目的・概要
これまで「差分最小化」として機能追加を重ねた結果、中途半端な分散マージ（`smartMerge`）が残り、初期プロファイルの現在時刻タイムスタンプによるクラウドデータの上書き破壊や、削除求人のゾンビ復活といった致命的な構造的矛盾が発生していました。
本フェーズでは、Cloudflare D1 を唯一の正本（Single Source of Truth: SSoT）と定め、不要な分散マージロジックを全廃し、完全スナップショット同期（上書き・ミラーリング）アーキテクチャへと刷新します。

---

## 📝 変更ファイル一覧と実装内容

### 1. ガバナンス・設計ドキュメント
- `docs/issues/ISSUE-032_cloud_ssot_architecture_and_merge_removal.md` 起票
- `docs/adr/0011-cloud-ssot-snapshot-sync.md` 起票 & `docs/adr/README.md` 登録

### 2. バックエンド API 層 (`functions/api/sync.ts`)
- PUSH 時に求人リストのスナップショットを受信し、含まれない旧求人を D1 から一括削除（`DELETE FROM sync_jobs WHERE room_id = ? AND job_id NOT IN (...)`）。
- PULL 時に D1 の最新全求人スナップショットを返却。

### 3. コアロジック層 (`src/core/`)
- `src/core/constants/defaultProfile.ts`: `DEFAULT_USER_PROFILE.updatedAt` を最古固定値 `1970-01-01` に変更。
- `src/core/sync/smartMerge.ts`: 複雑な配列合体マージを廃止し、クラウド正本スナップショット適用エンジン `applyJobsSnapshot` / `applyProfileSnapshot` に刷新。

### 4. サービス層 (`src/services/sync/cloudSyncService.ts`)
- D1 から取得したプロファイル・求人をそのまま完全上書きでローカルストレージに展開。
- WebSocket（ntfy.sh）を大容量データ送信から軽量シグナル `{ type: "DATA_UPDATED", roomId }` に限定し、データ本体取得を D1 Pull に統一。

### 5. テスト層 (`tests/`)
- `tests/core/smartMerge.test.ts` を SSoT スナップショット仕様のテストに改修。
- `tests/services/cloudSync.test.ts` をシグナル駆動 D1 スナップショット取得テストに改修。

---

## 🧪 検証手順
1. `npm.cmd run test:run` の全 19 テストファイル PASS 確認。
2. `npm.cmd run check` による全品質ゲート（セキュリティ、ドキュメント、型、テストカバレッジ、ビルド）100% PASS 確認。

---

# Phase 28: プロジェクト使用技術・スキルスタックの保存消失バグ修正 ＆ 資格・スキル設定準拠UI刷新 実装計画書 (Issue #31)

## 🎯 実装目的・概要
職務経歴・プロジェクト実績の編集モーダルにおいて、入力途中のスキル名が Enter 未押下で「プロジェクトを保存」を押した際に消去されてしまう不具合を根本修正し、さらにプロファイル設定の「認定資格 & 目標資格」UIに準拠した高品質なUI（一覧表示エリア、独立した「＋ 追加」ボタン、カンマ区切り一括登録、自身の保有スキルからの候補チップ選択）へと刷新します。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/features/career/CareerHistoryView.tsx`
- **未追加スキルの自動保存ガード**:
  - `handleSaveProjectModal` 時に、`projectSkillInput` に未空文字があれば、カンマで分割して `skills` に自動合流させてから保存。
- **資格設定準拠のUIへの刷新**:
  - スキル一覧表示エリア（枠付きボックス、最大高さスクロール、×削除ボタン）。
  - 下部に `Input`（プレースホルダー: `追加するスキル (例: Go, AWS, Docker / カンマ区切り可)...`）と独立した `Button`（「＋ 追加」アイコン）を横並びで配置。
  - Enter キー押下時および「＋」ボタン押下時の両方で `handleAddSkillTag` を実行。
  - カンマや読点（`,`, `、`, ` `）で区切られた複数スキルの一括追加対応。
  - **保有スキルからのクイック候補チップ**: `profile.skills` のうちまだプロジェクトに未追加の技術を候補バッジとして表示し、タップするだけで一発追加できる機能。

### 2. `tests/features/CareerHistoryView.test.tsx`
- 未追加の入力文字が「プロジェクトを保存」時に自動的に保存されるテスト。
- 「＋ 追加」ボタンおよびカンマ区切り入力によるスキル追加テスト。

---

## 🧪 検証手順
1. `npx vitest run tests/features/CareerHistoryView.test.tsx` の PASS 確認。
2. `npm run check` による全品質ゲート 100% PASS 確認。
3. コミット・プッシュ・PRマージ・Cloudflare Pages 本番デプロイ。

---

# Phase 27: プロジェクト実績の解像度向上: 担当開発工程選択 ＆ 複数STARエピソード管理 実装計画書 (Issue #29)

## 🎯 実装目的・概要
1つのプロジェクト内で複数の成果や課題解決（例: DB負荷改善、CI/CD自動化、若手育成等）を独立して管理できるよう「複数STARエピソード」に対応し、さらに日本のIT転職市場で極めて重視される「担当システム開発工程（要件定義、基本設計、詳細設計、実装、テスト、運用保守、PMなど）」のワンタップ選択機能を提供します。職務経歴書Markdown出力および求人AI解析プロンプトへもこれらを完全連動させます。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/types/profile.ts` & `src/core/constants/defaultProfile.ts`
- `StarEpisode` インターフェース（`id`, `theme`, `situation`, `action`, `result`）を新設。
- `ProjectExperience` に `phases: string[];` と `starEpisodes: StarEpisode[];` を追加。
- サンプル初期データに担当工程と複数STARエピソードを反映。

### 2. `src/features/career/CareerHistoryView.tsx`
- プロジェクト編集モーダルに「担当開発工程（フェーズ）」のバッジトグル選択UIを新設。
  - `要件定義` `基本設計` `詳細設計` `実装・コーディング` `テスト・QA` `リリース・CI/CD` `運用・保守` `PM / 進捗管理`
- プロジェクト編集モーダルに「＋ 実績エピソード(STAR)を追加」機能とエピソードカードリストを実装。
- エピソードごとの「✨ AI文章整形」ボタン対応。
- 職務経歴書（Markdown）出力に「- **担当工程**: ...」および複数エピソードの構造化出力を反映。

### 3. `src/core/prompt/jobAnalysisPrompt.ts`
- 求人AI解析プロンプトの `【候補者コンテキスト】` に担当工程および全STARエピソードを注入。

### 4. `tests/features/CareerHistoryView.test.tsx`
- 担当工程バッジの選択、複数STARエピソードの追加、Markdown出力の単体テストを拡充。

---

## 🧪 検証手順
1. `npx vitest run tests/features/CareerHistoryView.test.tsx` の PASS 確認。
2. `npm run check` による品質ゲート 100% PASS 確認。
3. コミット・プッシュ・PRマージ・Cloudflare Pages デプロイ。

---

# Phase 26: 職務経歴・プロジェクト実績（1社複数プロジェクト対応・STAR法）専用画面の新設と求人評価連携 実装計画書 (Issue #11)

## 🎯 実装目的・概要
ヘッダーに第5の専用ナビゲーションタブ「📄 職務経歴・実績」を新設し、1つの会社の中に複数のプロジェクトをぶら下げて管理できる階層データ構造（`CompanyExperience` ➔ `ProjectExperience`）を提供します。各プロジェクトには「開始〜終了年月」「ポジション・役割」「チーム規模」「使用技術」「STAR法（課題・行動・成果）」を入力でき、AI文章整形、ワンクリック職務経歴書出力、および求人AI解析への実績コンテキスト自動注入を実現します。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/types/profile.ts` & `src/core/constants/defaultProfile.ts`
- `ProjectExperience`, `CompanyExperience` インターフェースを定義。
- `UserProfile` に `companies?: CompanyExperience[];` を追加。
- 初期データにリアルな会社・複数プロジェクト実績のサンプルを追加。

### 2. `src/features/career/CareerHistoryView.tsx` (新規作成)
- 会社一覧＆プロジェクト一覧（アコーディオン/カード展開）。
- STAR法構造化入力フォーム（年月、役割、チーム規模、技術タグ、S・A・R）。
- 職務経歴書（Markdown）プレビュー＆ワンタップコピー機能。
- スマホ対応 Sticky Bottom Action Bar（未保存通知 ＋ 常時固定保存ボタン）。

### 3. `src/components/layout/Header.tsx` & `src/App.tsx`
- 第5のメインナビゲーションタブ「📄 職務経歴・実績」（キー: `career`）を追加。
- `App.tsx` でタブの切り替えとデータ受け渡しを実装。

### 4. `src/core/prompt/jobAnalysisPrompt.ts`
- 求人解析時、直近の主要プロジェクト実績を `【候補者コンテキスト】` に注入。
- 過去の具体的成果と求人要件を照合した説得力ある講評を生成。

### 5. `tests/features/CareerHistoryView.test.tsx` (新規作成)
- 会社追加、プロジェクト追加、STAR入力、スキル追加、Markdownコピー、保存の単体テスト。

---

## 🧪 検証手順
1. `npx vitest run tests/features/CareerHistoryView.test.tsx` の PASS 確認。
2. `npm run check` による品質ゲート 100% PASS 確認。
3. コミット・プッシュ・PRマージ・Cloudflare Pages デプロイ。

---

# Phase 25: プロファイル設定変更中の同期リセット防止、スマホ向け常時固定保存バー導入、および同期シンプル化 実装計画書 (Issue #26)

## 🎯 実装目的・概要
ユーザーがプロファイル設定画面で編集作業中にバックグラウンド同期によって変更が上書き・リセットされる不具合を防止（`isDirty` ガード導入）し、スマートフォンで画面下部に常時固定される「プロファイルを保存」バー（Sticky Bottom Bar）を導入してスクロール操作の負担を解消します。また、プロファイル同期において複雑なマージを完全撤廃し、クラウドD1を正とするシンプルな最新優先モデルへ統一します。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/features/profile/ProfileSettingsView.tsx`
- **編集中（isDirty）ガード**:
  - `isDirty` ステートを導入。スキル・資格・条件・プロファイル情報の編集時に `isDirty = true` に設定。
  - `useEffect([profile])` において、`isDirty` が true の間は `draft` を上書きしないようにブロック。保存またはリセット完了時に `isDirty = false` にリセット。
- **常時固定保存バー（Sticky Bottom Bar）の配備**:
  - 画面最下部に `fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800 p-3 sm:hidden`（または全画面対応）のフローティングバーを設置。
  - `isDirty` のときは「● 未保存の変更があります」と明示。
  - 保存ボタンを画面下部に常時配置し、長いプロファイルをスクロールしても親指ワンタップで即座に保存可能に。
  - 既存のヘッダー保存ボタンも引き続き連動。

### 2. `src/core/sync/smartMerge.ts` & `src/services/sync/cloudSyncService.ts`
- プロファイルの「スマートマージ」ロジックの完全シンプル化。
- 最新タイムスタンプのプロファイルをそのまま採用（LWW）。

---

## 🧪 検証手順
1. `npm run check` による品質ゲート（全18テストファイル87件、型検査、シークレット検査、ビルド）の 100% PASS を確認。
2. Git コミット・PR作成（`Closes #26`）を実施。
3. `main` マージ後、Cloudflare Pages へ本番デプロイ。

---

# Phase 24: プロファイル設定で削除したスキル・資格がクラウド同期で復活する不具合の修正 実装計画書 (Issue #24)

## 🎯 実装目的・概要
ユーザーがプロファイル設定画面でスキルや保有資格（「AWS」「AZ-305」等）を削除して保存した際、古いプロファイルデータ（Cloudflare D1 や別端末）と同期された際に削除した項目が UNION 結合によって勝手に復活してしまうバグを解消します。プロファイルのマージ原則を Last-Write-Wins（最新タイムスタンプ優先）に是正し、削除操作が確実に全端末へ反映・永続化されるようにします。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/core/sync/smartMerge.ts`
- **`mergeProfile` 関数の改修**:
  - `skills` と `certifications` を古いプロファイルから UNION 結合する処理を撤廃。
  - 最新のタイムスタンプを持つ `baseProfile` の `skills`、`certifications`、`conditions`、`name`、`title`、`summary`、`yearsOfExperience` をそのまま正（Single Source of Truth）として採用。
  - `apiSettings.geminiApiKey` のみ、新しい側で空文字かつ古い側に入力がある場合のフォールバック保持を維持。

### 2. `tests/core/smartMerge.test.ts`
- スキルや資格を削除した新しいプロファイルが、古いプロファイルとマージされた際に削除状態を維持（復活しないこと）を検証するテストを追加。

---

## 🧪 検証手順
1. `npm run check` による品質ゲート（全18テストファイル86件、型検査、シークレット検査、ビルド）の 100% PASS を確認。
2. Git コミット・PR作成（`Closes #24`）を実施。
3. `main` マージ後、Cloudflare Pages へ本番デプロイ。

---

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

# Phase 21: Cloudflare D1 ＋ E2EE 暗号化による常時非同期クラウド同期の実装計画書 (Issue #18)

## 🎯 実装目的・概要
PC の電源を切った後でもスマホを開くだけで最新データが自動復元・同期されるようにするため、Cloudflare D1（1日10万回書き込み無料）と Web Crypto（AES-GCM-256）による E2EE 暗号化常時クラウド同期エンジンを導入・統合します。

---

## 📝 変更ファイル一覧と実装内容

### 1. D1 データベース & SQL スキーマの作成
- **`schema.sql`**:
  - `sync_rooms`: ルーム管理・暗号化プロファイル
  - `sync_jobs`: 1求人 = 1行の暗号化求人データ
- **`wrangler.jsonc`** / **`wrangler.toml`**:
  - D1 データベースバインディング `DB` の定義。

### 2. Cloudflare Pages Functions 同期 API の実装
- **`functions/api/sync.ts`**:
  - `POST /api/sync`: `action: "pull"`（差分取得）および `action: "push"`（差分アップロード）を処理。

### 3. クライアント側 E2EE 暗号化エンジンの実装
- **`src/core/crypto/e2eeCrypto.ts`**:
  - Web Crypto API による AES-GCM-256 暗号化・復号、PBKDF2 鍵導出。

### 4. `cloudSyncService.ts` への D1 常時同期統合
- **`src/services/sync/cloudSyncService.ts`**:
  - D1 への自動 Push/Pull と、既存の `smartMerge`（決定論的マージ）の完全統合。
  - P2P リアルタイム同期（同一起動時）と D1 常時同期（非同期起動時）のハイブリッド化。

### 5. 単体テストの追加
- **`tests/core/e2eeCrypto.test.ts`**: 暗号化・復号の単体テスト。

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check` を実行し、全ゲート（セキュリティ、ドキュメント、TypeScript型、単体テスト、ビルド）の 100% PASS を確認。
2. Git コミット・PR作成（`Closes #18`）を実施。
3. `main` マージ後、Cloudflare Pages & D1 へ本番デプロイ。

---

# Phase 20: 大容量求人データ同期時の ntfy.sh アタッチメント対応とスマホワンタップURL自動接続の修正 実装計画書 (Issue #16)

## 🎯 実装目的・概要
求人データや Markdown などの大容量データ（4KB超）を同期する際、ntfy.sh がファイルをアタッチメント化して送信する仕様に対応し、受信端末（スマホ/PC）側でアタッチメント URL から自動フェッチしてデータを完全復元・スマートマージできるようにします。また、`App.tsx` における URL クエリパラメータ自動接続処理を確実に動作させます。

---

## 📝 変更ファイル一覧と実装内容

### 1. アタッチメント自動フェッチとパースの実装
- **`src/services/sync/cloudSyncService.ts`**:
  - `ws.onmessage` 内で `raw.attachment?.url` を検知した場合、`fetch(raw.attachment.url)` で JSON をダウンロードし、`handleIncomingPacket(packet)` に渡す非同期処理を実装。

### 2. URL 自動接続処理の確実化
- **`src/App.tsx`**:
  - `useEffect` の依存関係を整理し、マウント時に URL クエリパラメータ（`?sync=JE-XXXX`）が存在する場合に確実に `updateSyncConfig` を呼び出す。

### 3. 単体テストの拡充
- **`tests/services/cloudSync.test.ts`**:
  - アタッチメント付きパケットの自動フェッチ＆マージ処理の単体テストを追加。

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check` を実行し、全ゲート（セキュリティ、ドキュメント、TypeScript型、単体テスト、ビルド）の 100% PASS を確認。
2. Git コミット・PR作成（`Closes #16`）を実施。
3. `main` マージ後、Cloudflare Pages へデプロイ。

---

# Phase 19: PC（ローカル起動）↔ スマホ（クラウド起動）間のWebRTC P2Pリアルタイム同期と本番共有URL生成の修正 実装計画書 (Issue #14)

## 🎯 実装目的・概要
PCローカル開発環境（`localhost:5173`）やデスクトップアプリから発行した同期用ルームコードをスマホ（`https://job-eval.pages.dev`）で開いても同期できるようにするため、スマホ連携リンクの生成先を本番クラウドURLで標準化し、別ネットワーク・別端末間でインターネット越しにリアルタイム P2P データ同期（WebRTC / WebSocket リレー）を実現します。

---

## 📝 変更ファイル一覧と実装内容

### 1. 共有URL生成の修正
- **`src/components/sync/SyncModal.tsx`**:
  - `window.location.origin` が `localhost`, `127.0.0.1`, `tauri://` 等のローカル環境である場合でも、スマホ連携リンクには常に本番公開ドメイン `https://job-eval.pages.dev?sync=JE-XXXX` を生成。

### 2. インターネット越しリアルタイム同期エンジンの導入
- **`src/services/sync/cloudSyncService.ts`**:
  - `BroadcastChannel`（同一ブラウザ内用）に加え、インターネット経由でメッセージを双方向中継する P2P / リアルタイムリレー機構を統合。
  - ルームコード（`JE-XXXX`）をキーとして、接続確立時に `smartMerge`（求人・プロファイル）を自動実行。

### 3. 単体テストの追加
- **`tests/services/peerSync.test.ts`**:
  - クロス端末メッセージング、URL生成、`smartMerge` 統合の単体テスト。

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check` を実行し、全ゲート（セキュリティ、ドキュメント、TypeScript型、単体テスト、ビルド）の 100% PASS を確認。
2. Git コミット・PR作成（`Closes #14`）を実施。
3. `main` マージ後、Cloudflare Pages へデプロイ。

---

# Phase 18: AGENTS.md における Issue ライフサイクル管理規定とエージェント自律判断ルールの明文化 実装計画書 (Issue #12)

## 🎯 実装目的・概要
AI エージェントが勝手にバックログのタスクを開発開始してしまう事故を防ぎ、どの Issue が着手可能（Ready）かを自律的に正しく判定・処理できるように、`AGENTS.md` に Issue ライフサイクル（Backlog / To Do / Ready / In Progress / Done）の定義とエージェントの行動プロトコルを明文化します。

---

## 📝 変更ファイル一覧と実装内容

### 1. エージェント開発ガイドラインの改修
- **`AGENTS.md`**:
  - 第2章に「Issue ライフサイクル（Backlog / To Do / Ready / In Progress / Done）と判定プロトコル」セクションを新設。
  - 各ステータスのラベル、意味、エージェントの着手可否ルールを明確に定義。

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check` を実行し、全ゲート（セキュリティスキャン、ドキュメント整合性、TypeScript型検査、全テスト、本番ビルド）の 100% PASS を確認。
2. Git コミット・PR作成（`Closes #12`）を実施。

---

# Phase 17: 品質ゲート（docCheck.js）における ADR 一覧整合性の自動検証機能の実装計画書 (Issue #9)

## 🎯 実装目的・概要
個別 ADR 作成時に `docs/adr/README.md` への追記漏れが発生するのを防ぐため、品質ゲートスクリプト（`scripts/docCheck.js`）に **`docs/adr/` 配下の全 ADR ファイルと `docs/adr/README.md` の目次テーブルを自動突合する検証ロジック** を追加します。

---

## 📝 変更ファイル一覧と実装内容

### 1. ドキュメント検証スクリプトの拡張
- **`scripts/docCheck.js`**:
  - `docs/adr/` ディレクトリ内の全 ADR（`.md` ファイル）を取得。
  - `docs/adr/README.md` のテーブル内に各 ADR が記載されているかを機械的にチェック。
  - 未登録があれば具体的なファイル名・ADR番号と修正案内を出力してエラー終了。

---

## 🧪 検証手順
1. `node scripts/docCheck.js` を実行し、全7件の ADR 登録確認ログが出力されることを確認。
2. `cmd /c npm.cmd run check` を実行し、全ゲート（セキュリティスキャン、ドキュメント整合性、TypeScript型検査、全テスト、本番ビルド）の 100% PASS を確認。
3. Git コミット・PR作成（`Closes #9`）を実施。

---

# Phase 16: 求人・プロファイルデータのスマートマージとコンフリクト解消 実装計画書 (Issue #7, ADR-0007)

## 🎯 実装目的・概要
複数端末（PC・スマートフォン）間でデータ同期を行う際、PC[A, C] と スマホ[A, B] のように別々の求人やプロファイル編集が存在する場合でも、データが上書き消失することなく、**IDベースで自動合体（和集合 [A, B, C]）し、重複求人は最新更新日時を優先採用するスマートマージ機能** を実装します。

---

## 📝 変更ファイル一覧と実装内容

### 1. コアスマートマージロジックの実装（純粋関数）
- **`src/core/sync/smartMerge.ts`**:
  - `mergeJobs(localJobs, remoteJobs)`: IDベースの和集合マージ、更新日時（`updatedAt` / `analysisDate`）に基づく最新版採用、評価履歴（`evaluationHistory`）の重複排除統合、ソート順維持。
  - `mergeProfile(localProfile, remoteProfile)`: タイムスタンプ比較、スキルリスト（`skills`）および資格リスト（`certifications`）のID/名称ベース和集合マージ、APIキー保持。

### 2. 同期サービス & ストレージアダプターへの統合
- **`src/services/sync/cloudSyncService.ts`**:
  - `notifyJobsChanged` および受信ハンドラーで `mergeJobs` を適用し、双方向で完全な最新データセットを保持。
  - `notifyProfileChanged` で `mergeProfile` を適用。

### 3. 単体テストの作成
- **`tests/core/smartMerge.test.ts`**:
  - [A, C] と [A, B] のマージで [A, B, C] が返ることの検証。
  - 同一求人Aのステータス変更時、最新日時の値が採用されることの検証。
  - プロファイルのスキル・資格リストの重複排除マージ検証。

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check`（シークレットスキャン + ドキュメント整合性 + TypeScript型検査 + 全単体UIテスト + 本番ビルド）を実行し、全件 PASS を確認。
2. Git コミット・PR作成（`Closes #7`）を実施。

---

# Phase 15: クラウドデータベースによる複数デバイス間リアルタイムデータ同期の実装 (Issue #4, ADR-0006)

## 🎯 実装目的・概要
Cloudflare Pages 経由で PC・スマホから利用する際、ブラウザの LocalStorage に閉じていた求人データおよびプロファイル設定を、**クラウドデータベース（Firebase Firestore）およびリアルタイムリスナー（`onSnapshot`）** を用いて、複数デバイス間でミリ秒単位で双方向リアルタイム同期できるように拡張します。
同期コード / QRコードによるペアリング機能を提供し、未接続時・オフライン時でも既存の `LocalStorageAdapter` に完全フォールバックする耐障害設計を確立します。

---

## 📝 変更ファイル一覧と実装内容

### 1. 型定義 & ストレージインターフェースの拡張
- **`src/types/storage.ts`**:
  - リアルタイム購読メソッド（`subscribeJobs?: (cb: (jobs: JobAnalysisResult[]) => void) => () => void`）
  - プロファイル購読メソッド（`subscribeProfile?: (cb: (profile: UserProfile) => void) => () => void`）
  - 同期ルーム設定メソッド（`setSyncRoom?: (roomId: string) => void`, `getSyncStatus?: () => SyncStatus`）の追加
- **`src/types/sync.ts`**:
  - 同期状態（`SyncStatus`: `idle`, `connected`, `syncing`, `error`, `offline`）および同期設定（`CloudSyncConfig`）の型定義

### 2. クラウド同期ストレージアダプターの実装
- **`src/services/storage/cloudStorageAdapter.ts`**:
  - Firebase Firestore（または汎用クラウドREST/Realtime）を用いた双方向リアルタイム同期アダプターの実装
  - 未設定時はローカルキャッシュ（LocalStorage）に透過的にフォールバック
- **`src/services/storage/index.ts`**:
  - シングルトンストレージアダプターの切り替え管理と同期マネージャー

### 3. フックのリアルタイムリスナー対応
- **`src/hooks/useJobs.ts`**:
  - `storageAdapter.subscribeJobs` を検知し、外部（他端末）からの更新を即座に React State に反映
- **`src/hooks/useProfile.ts`**:
  - `storageAdapter.subscribeProfile` を検知し、プロファイル変更を即座に React State に反映

### 4. UI コンポーネントの実装
- **`src/components/sync/SyncModal.tsx`**:
  - 同期ルームIDの作成・QRコード表示・ペアリングコード入力・接続テスト
- **`src/components/layout/Header.tsx`**:
  - 同期ステータスアイコン（🟢 クラウド同期中 / ☁️ ローカル動作）および「端末間同期」ボタンの配置

---

## 🧪 検証手順
1. `cmd /c npm.cmd run check`（シークレットスキャン + ドキュメント整合性 + TypeScript型検査 + 全単体UIテスト + 本番ビルド）を実行し、全件 PASS を確認。
2. Git コミット・PR作成（`Closes #4`）を実施。

---

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

# Phase 13: 求人元データからの個別/順次バッチAI再評価 & 評価履歴タイムライン保持機能 実装計画書

## 🎯 実装目的・概要
求職者プロファイル（スキル、資格、希望条件など）を更新した際、過去に評価・保存した求人ドキュメントを、元の求人票テキスト（`originalJobText`）を用いて最新プロファイル基準で高精度にAI再評価できる機能を提供します。
1求人1リクエストの独立推論で精度を担保し、ダッシュボードでの複数選択（最大5件上限）による安全な順次バッチ実行、および過去の評価内容を保持する評価履歴タイムライン（UI & Markdown）を実現します。

---

## 📝 変更ファイル一覧と実装内容

### 1. 型定義の拡張
- **`src/types/job.ts`**:
  - `EvaluationHistoryItem` 型の追加（`id`, `date`, `triggerReason`, `score`, `judgment`, `scoreBreakdown`, `positives`, `concerns`, `summaryNote`）
  - `JobAnalysisResult.evaluationHistory?: EvaluationHistoryItem[]` の追加

### 2. コアロジック & AIサービスの拡張
- **`src/services/ai/aiService.ts`**:
  - `reEvaluateJobFromOriginalText(previousJob, profile, reason?)` の新設（元テキストからの独立再評価と履歴スナップショット蓄積マージ）
- **`src/services/ai/mockAiProvider.ts` / `geminiProvider.ts`**:
  - 再評価時の履歴スナップショット自動生成
- **`src/core/markdown/markdownGenerator.ts`**:
  - `## 📜 適合度評価履歴 (Evaluation History)` セクションの出力およびパース処理

### 3. フック & 順次バッチ実行キューの実装
- **`src/hooks/useJobs.ts`**:
  - `reEvaluateJob(jobId, profile, reason?)`: 個別求人の再評価とストレージ即時更新
  - `reEvaluateBatchJobs(jobIds, profile, onProgress, reason?)`: 最大5件の順次キュー実行とプログレス制御

### 4. UI コンポーネントの実装
- **`src/components/dashboard/JobDashboard.tsx`**:
  - 複数選択上限（最大5件）のチェックボックス制御とトースト警告
  - 「🔄 選択した求人を再評価 (X件)」ボタン
  - 再評価進捗モーダル（進行プログレスバー、各求人の状態インジケーター、中止ボタン）
  - 各求人行のメニューに「最新プロファイルで再評価」アクション追加
- **`src/components/pane/PreviewPane.tsx`**:
  - ヘッダー右上に「🔄 最新プロファイルで再評価」ボタン
  - スコア推移バッジ（例: `88点 (+16pt ↗ 前回 72点)`）
  - 「📜 評価・更新履歴タイムライン」アコーディオンUIの追加

### 5. 自動テストの拡充
- **`tests/services/aiReevaluation.test.ts`**: 元テキストからの再評価ロジックと履歴蓄積の単体テスト
- **`tests/features/JobDashboardReeval.test.tsx`**: バッチ再評価キューとプログレス表示のUIテスト
- **`tests/features/PreviewPane.test.tsx`**: 個別再評価トリガーと履歴タイムライン表示のUIテスト

---

## 🧪 検証手順
1. `npm.cmd run check`（シークレットスキャン + ドキュメント整合性 + TypeScript型検査 + 全単体UIテスト + 本番ビルド）を実行し、全件 PASS を確認。
2. Git コミット・マージを実施。

---

# Phase 12: 4軸評価の動的重み付けカスタマイズ＆保存済求人の一括・リアルタイム再計算機能 実装計画書 (Issue #1)

## 🎯 実装目的・概要
ユーザーの転職志向（リスキリング重視、カルチャー重視、待遇重視、即戦力重視など）に応じて4軸の重み付け（％）を自由に変更可能にし、保存済みの全求人および閲覧中求人の適合度スコア（0〜100点）および判定ランク（S/A/B/C）をクライアント側で瞬時に再計算・一括更新できる機能を提供します。

---

## 📝 変更ファイル一覧と実装内容

### 1. 型定義の拡張
- **`src/types/profile.ts`**:
  - `ScoringWeights` インターフェース（`skill`, `condition`, `growth`, `environment` 各 %、合計100）
  - `ScoringPresetKey` 型（`"standard"` | `"reskilling"` | `"wlb_culture"` | `"salary_first"` | `"custom"`）
  - `DEFAULT_SCORING_WEIGHTS` 定数（40/30/20/10%）
  - `SCORING_PRESETS` 辞書定義
  - `ConditionMatrix.scoringWeights`（オプショナル、後方互換性担保）
- **`src/core/constants/defaultProfile.ts`**:
  - デフォルトプロファイルに `scoringWeights: DEFAULT_SCORING_WEIGHTS` を追加

### 2. コア再計算エンジンの実装
- **`src/core/scoring/scoringEngine.ts`**:
  - `recalculateScoreWithWeights(breakdown, weights, ngTriggered?)` 純粋関数
  - `getJudgmentRank(totalScore, hasNgTriggered?)` 判定ロジック

### 3. UI コンポーネントの実装
- **`src/features/profile/ProfileSettingsView.tsx`**:
  - 重み付けプリセット選択ボタン（5種類）
  - 4軸重みスライダー＆合計100%自動バランサー
  - 「保存時に既存の全求人に新しい重みを適用して一括再計算する」機能
- **`src/components/pane/PreviewPane.tsx`**:
  - 評価視点切り替えピル（🎯標準 / 🚀リスキリング / 🌿カルチャー / 💰待遇）
  - クリックによる即座のスコア再計算＆判定ランク連動プレビュー
- **`src/components/dashboard/JobDashboard.tsx`**:
  - 評価視点（プリセット）切り替えによる一覧スコア・ソート順の即時連動

### 4. フック & プロンプト連携
- **`src/hooks/useJobs.ts`**:
  - `recalculateAllJobsWithWeights(weights)` 一括更新関数
  - Markdown Frontmatter の `match_score` / `judgment` 同期更新
- **`src/core/prompt/jobAnalysisPrompt.ts`**:
  - ユーザーの選択重み付け方針（リスキリング重視等）を Gemini System Instruction に反映

### 5. 自動テストの拡充
- **`tests/core/scoringEngine.test.ts`**: 各プリセットでの再計算ロジック、合計100%バランサーテスト
- **`tests/features/PreviewPane.test.tsx`**: 視点切り替えピルの動作テスト
- **`tests/features/ProfileSettingsView.test.tsx`**: 重み付け設定UIテスト
- **`tests/features/JobDashboard.test.tsx`**: ダッシュボードでの視点連動テスト

---

## 🧪 検証手順
1. `npm.cmd run check`（シークレット + ドキュメント整合性 + 型検査 + 全単体UIテスト + 本番ビルド）を実行し、全件 PASS を確認。
2. Git Pre-commit Hook & Pre-push Hook による自動検査を経てコミットし、`gh pr create` で PR を起票。

---
JobEval を GitHub 上で外部に公開し、自身のスキル（AI統合力、フロントエンド/デスクトップアーキテクチャ設計力、開発ハーネス・テスト駆動品質担保力、UX設計力）を証明するための洗練された `README.md` を作成・反映します。

---

## 📝 変更ファイル一覧と実装内容

### 1. `README.md`
- **プロジェクトヘッダー & バッジ**: プロジェクト名、キャッチコピー、技術スタックバッジ（Tauri v2, React 18, TypeScript, Gemini 2.5, Vitest, Zero Secrets）。
- **Problem & Solution（開発背景と提供価値）**: 散乱する求人票の適合度を多軸AIで客観判定し、Obsidian管理と転職ロードマップまでを一気通貫で支援。
- **主要機能ハイライト（Features）**:
  - 4軸適合度スコアリング (40/30/20/10%)
  - 4画面の直観的UI（入力・プレビュー・ドキュメント一覧・ロードマップ・プロファイル設定）
  - 中長期キャリア展望 & Next Exit AI推論（オンデマンド深掘り生成）
  - AIフィードバック＆再評価（インクリメンタル学習）
  - デュアルストレージ（Tauri FS / LocalStorage / Markdown Import）
- **アーキテクチャ設計（Architecture）**: クリーンアーキテクチャ構成図、プラグイン型 AI Provider。
- **品質・セキュリティ・開発ハーネス（Engineering Excellence）**:
  - シークレット自動遮断 (`securityCheck.js`)
  - ドキュメント整合性検査 (`docCheck.js`)
  - Git Pre-commit & Pre-push Hook
  - Vitest 50テスト全件パス
- **クイックスタート（Getting Started）**: インストール・起動・テスト手順。

---

## 🧪 検証手順
1. `npm run check`（シークレット + ドキュメント整合性 + 型検査 + 全50件テスト + 本番ビルド）を実行し、全件パスを確認。
2. Git Pre-commit Hook & Pre-push Hook による自動検査を経てコミットし、`git push origin main` で GitHub へ即時反映。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/features/roadmap/CareerRoadmapView.tsx`
- **「🔄 データを再集計・更新」ボタンをヘッダー右上に新設**:
  - クリック時にストレージから最新求人一覧を再取得し、集計をリフレッシュ。更新完了のフィードバック（スピナー＋トースト）を表示。
- **資格名・スキルのスマート名寄せ正規化（Normalization & Deduplication）**:
  - AWS (SAA, SAP, SOA等), Azure (AZ-305, AZ-400等), GCP, CKA, LPIC, 応用情報 などの主要資格の表記ゆれを統一名称にマッピング。
  - 同一求人・同一企業からの重複カウントを厳密に排除。
- **出所企業・指定文脈（必須 vs 推奨）の個別明記**:
  - 各資格カード内に「🏢 企業ごとの指定状況」セクションを新設。
  - `【A社】: 必須要件として指定`、`【B社】: スキル補強のため推奨` のように、どの会社がどう言っているかを明確に表示。

### 2. `src/App.tsx`
- `CareerRoadmapView` に最新求人リスト再読み込み用の `onRefreshJobs` コールバックを連携。

### 3. 自動テストの拡充 (`tests/features/CareerRoadmapView.test.tsx`)
- 表記ゆれ資格の名寄せ集計テスト、企業別指定文脈の表示テスト、および更新ボタンの押下テストを追加。

---

## 🧪 検証手順
1. `npm run check`（シークレット + ドキュメント整合性 + 型検査 + 全単体UIテスト + 本番ビルド）の全件パスを確認。
2. Pre-commit Hook & Pre-push Hook による二重防御を経てコミット & GitHub リモートへ即時反映。

---

## 📝 変更ファイル一覧と実装内容

### 1. `src/components/pane/PreviewPane.tsx`
- キャリア展望カードのヘッダー右上に **「🔄 AIでキャリア展望を再生成・深掘り」ボタン** を常設。
- 生成中のスピナー・ローディング表示（`isGeneratingTrajectory`）をサポート。
- 過去求人の「未生成」状態だけでなく、「生成済み」状態からの深掘り再生成にもシームレスに対応。

### 2. `src/App.tsx`
- `isGeneratingTrajectory` ステートを追加し、再生成処理中の UI ロック・フィードバックを制御。
- `handleGenerateCareerTrajectory` 実行時に Markdown を自動更新し、ローカルストレージへ即時自動保存。

### 3. `src/core/prompt/jobAnalysisPrompt.ts`
- `buildCareerTrajectoryPrompt` のプロンプト指示をさらに深掘りし、2〜3年の技術進化や具体的な職種・年収根拠を強化。

### 4. 自動テストの拡充
- `tests/features/PreviewPane.test.tsx`: キャリア展望が既に存在する場合の再生成ボタン押下・コールバック呼び出しテストを追加。

---

## 🧪 検証手順
1. `npm run check`（シークレットスキャン + ドキュメント整合性検査 + 型検査 + 全単体UIテスト + 本番ビルド）を実行し、全件パスを確認。
2. Pre-commit Hook & Pre-push Hook による二重防御の確認。
3. Conventional Commits 形式でコミットし、`git push origin main` で GitHub へ即時反映。


# Phase 8: 中長期キャリア展望・獲得スキル・次の転職先 (Career Trajectory) AI & 可視化 実装計画

ユーザーからの追加要望（「このキャリアを選択した後の展望・得られるスキル・さらなる転職や方向性についても知っておきたい」）に応え、求人票を起点とした 2〜3 年後の中長期キャリアパス、獲得スキル、次の転職先候補（Exit Strategy）、市場年収展望を AI で自動分析・可視化する機能を実装します。

---

## 提案する変更点 (Proposed Changes)

### 1. 型定義・ドメイン拡張
#### [MODIFY] `src/types/job.ts`
- `CareerTrajectory` インターフェースを新設：
  ```ts
  export interface CareerTrajectory {
    acquiredSkills: string[];          // 2〜3年で身につく市場価値の高いスキル
    nextCareerOptions: string[];       // 次の転職で狙えるポジション・キャリアパス
    marketValueProjection: string;     // 2〜3年後の想定市場価値・年収レンジ
    careerRisksOrLockin?: string;      // 技術的ロックインやキャリア上の留意点
    overallOutlook: string;            // 中長期キャリア展望の総括アドバイス
  }
  ```
- `JobAnalysisResult` に `careerTrajectory?: CareerTrajectory` を追加。

---

### 2. コアAIプロンプト & プロバイダ拡張
#### [MODIFY] `src/core/prompt/jobAnalysisPrompt.ts`
- `buildJobAnalysisPrompt` および `buildJobReEvaluationPrompt` に「中長期キャリア展望（得られるスキル・次のキャリアパス・想定市場年収・ロックインリスク）」の推論指示を追加。
- `GEMINI_JOB_ANALYSIS_SCHEMA` に `career_trajectory` オブジェクトを定義。

#### [MODIFY] `src/services/ai/geminiProvider.ts`, `mockAiProvider.ts`
- Gemini Raw レスポンスから `careerTrajectory` へのパース・マッピングを実装。
- `MockAiProvider` にも業種・職種・ポジションに応じたキャリア展望シミュレーション生成を実装。

---

### 3. Markdown 生成 & パース拡張
#### [MODIFY] `src/core/markdown/markdownGenerator.ts`
- Markdown 出力テンプレートに **`## 🚀 キャリア展望・獲得スキル・次の転職先 (Career Trajectory)`** セクションを追加。
- インポート時（`parseJobMarkdownToJobResult`）にもキャリア展望セクションを復元。

---

### 4. UI 画面でのリッチ可視化
#### [MODIFY] `src/components/pane/PreviewPane.tsx`
- **「🚀 入社後のキャリア展望 & 次のキャリアパス」** リッチカードを新設：
  - 身につくスキルバッジ群
  - 次の転職で狙えるポジション・職種カード
  - 将来の市場価値・年収レンジ展望
  - キャリア上の留意点（ロックインリスク・留意事項）

#### [MODIFY] `src/features/roadmap/CareerRoadmapView.tsx`
- 保存された全求人のキャリア展望を集約し、**「将来のキャリア分岐マップ & 次の転職先候補集約」** を表示。

---

## 検証計画 (Verification Plan)

### 自動テスト
- `tests/core/jobAnalysisPrompt.test.ts`: キャリア展望プロンプトと JSON Schema の検証
- `tests/core/markdownGenerator.test.ts`: キャリア展望 Markdown の生成・パース検証
- `tests/features/PreviewPane.test.tsx`: キャリア展望リッチカードの描画検証
- `tests/features/CareerRoadmapView.test.tsx`: 全求人横断キャリア展望の表示検証
- `npm run check`: ワンショット総合品質・セキュリティゲートの全件合格
