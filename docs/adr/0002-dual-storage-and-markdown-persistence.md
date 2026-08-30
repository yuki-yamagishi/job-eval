# ADR-0002: Tauri FS / Web Dual Storage と Frontmatter Markdown 永続化の採用

- **ステータス**: **Accepted**
- **決定日**: 2026-08-30
- **決定者**: JobEval 開発チーム

---

## 1. 背景と課題 (Context & Problem Statement)
求人票の評価結果を保存・管理するにあたり、独自バイナリ形式や単一 JSON ファイルに全データを詰め込むと、他ツール（Obsidian, VS Code, Notion 等）との連携性が損なわれ、データのポータビリティが著しく低下する課題があった。
また、デスクトップアプリ（Tauri によるローカルファイル直接読み書き）と、ブラウザプレビュー環境（LocalStorage / File System Access API）の双方で同一のデータアクセス体験を提供する必要があった。

## 2. 検討された選択肢 (Considered Options)
1. **選択肢 1: 単一 SQLite / IndexedDB データベースへの格納**
2. **選択肢 2: YAML Frontmatter 付き Markdown ファイル + Dual StorageAdapter パターン**

## 3. 決定内容と理由 (Decision Outcome & Rationale)
- **採用**: **選択肢 2（Markdown 永続化 + Dual StorageAdapter）**
- **理由**:
  1. 評価結果は 1 求人 = 1 Markdown ファイル（`[社名]_[ポジション名].md`）として保存され、Obsidian などのナレッジベースツールでそのまま開いて編集・検索可能。
  2. メタデータ（企業名、総合スコア、各軸小計、ステータス、URL 等）を YAML Frontmatter に格納し、本文には AI の詳細講評・マッチ度解説を Markdown 形式で記録。
  3. `StorageAdapter` インターフェースにより、デスクトップ（Tauri FS）と Web（LocalStorage）の環境差分を完全隠蔽。

## 4. トレードオフと影響 (Consequences & Trade-offs)
### メリット
- 圧倒的なデータポータビリティ（Obsidian, Notion, Git 連携が容易）。
- 人間がテキストエディタで直接閲覧・編集可能。
### 制約
- Frontmatter のパースおよびサニタイズ処理（`src/core/markdown/`）が必要。
