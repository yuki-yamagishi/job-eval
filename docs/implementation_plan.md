# Phase 4: Markdown生成 & リッチプレビュー & Vault保存 計画

要件定義書（Requirement.md）の Phase 4 に基づき、AI解析結果からの標準Markdown生成、react-markdown によるリッチプレビュー表示、双方向編集エディタ、および Obsidian 等の Vault へのローカル保存機能を実装します。

---

## 提案する変更点 (Proposed Changes)

### 1. Markdown 生成 & パーサーエンジンの強化
#### [MODIFY] `src/core/markdown/markdownGenerator.ts`
- YAML Frontmatter と本文のパース・再構築関数（`parseJobMarkdown`, `updateJobMarkdown`）。
- OS 禁止文字のサニタイズ処理。

---

### 2. プレビューペイン & エディタの高度化
#### [MODIFY] `src/components/pane/PreviewPane.tsx`
- 「リッチ表示」「スプリット編集」「生Markdown表示」の切り替え。
- 「逆質問のみコピー」「アピールポイントのみコピー」「全文コピー」のワンクリックボタン。
- ファイル名プレビューと Obsidian / ローカルフォルダ保存ボタン。

---

### 3. ストレージアダプターの強化
#### [MODIFY] `src/services/storage/storageAdapter.ts`
- Web File System Access API / Blob ダウンロードによるファイル書き出し処理。

---

### 4. テストハーネスの追加
#### [MODIFY] `tests/core/markdownGenerator.test.ts`
- 禁止文字サニタイズ、Frontmatter パース＆更新の単体テスト。

#### [NEW] `tests/features/PreviewPane.test.tsx`
- プレビュー表示・モード切り替え・コピー・保存操作の UI テスト。

---

## 検証計画 (Verification Plan)

### 自動テスト
- `npm run check` (tsc + vitest + vite build) による一括検証。

### コミット & プッシュ
- 接頭辞 `feat(phase4): ...` を付与してコミットおよびプッシュを実施。
