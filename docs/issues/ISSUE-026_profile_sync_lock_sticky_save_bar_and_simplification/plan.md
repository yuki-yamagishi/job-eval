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
