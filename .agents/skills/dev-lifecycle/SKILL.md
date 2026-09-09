---
name: dev-lifecycle
description: JobEval における実装・TDD高速反復・4軸ドキュメント作成・段階的コミット・ワンショット品質ゲート（npm run check）の実行 Runbook。機能開発や改修時に使用する。
---

# 開発・TDD反復 Runbook (dev-lifecycle)

このスキルは、**JobEval** におけるクリーンアーキテクチャ実装、4軸ドキュメント整備、段階的コミット、およびフル品質ゲートの実行手順を定めます。

---

## 1. コア実装 & 4軸ドキュメント整備

1. **クリーンアーキテクチャ原則**:
   - 純粋ビジネスロジック（`src/core/`）は UI・外部依存ゼロ、100% 単体テスト可能を維持する。
2. **Issue フォルダ完結型ドキュメントの作成**:
   `docs/issues/ISSUE-XXX_<slug>/` 配下に以下の 4 ファイルを完全日本語で作成：
   - `issue.md`: 要件定義・受入基準
   - `pre_verification.md`: 4軸事前検証ログ（技術的ボトルネック、UX、データ永続性、テスト自律性）
   - `plan.md`: 実装計画書（変更ファイル一覧、実装内容、検証手順）
   - `walkthrough.md`: 実装成果レポート（作業完了時に成果を記録）
3. **ルートポインタの更新**:
   `docs/pre_phase_verification.md`, `docs/implementation_plan.md`, `docs/walkthrough.md` を対象 Issue フォルダを指すよう更新。
4. **ADR（設計決定記録）の作成**:
   - 設計変更や計算式・永続化の変更時は `docs/adr/000X-xxx.md` を作成し、`docs/adr/README.md` の一覧テーブルにも登録する。

---

## 2. 高速反復・段階的コミット・品質検証

1. **開発中の高速反復 (2〜3秒)**:
   ```bash
   npm.cmd run check:fast
   ```
2. **段階的コミット (TDD中間コミット)**:
   - コミット時は `issue.md` と `plan.md` さえあれば中間コミット可能（`pre-commit` フックで `docCheck.js --pre-commit` が自動検証）。
   - Conventional Commits 規約に準拠（`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `ci:`）。
3. **プッシュ前のフル品質ゲート**:
   ```bash
   npm.cmd run check
   ```
   ※ シークレットスキャン + ドキュメント完全性 + 型検査 + 全単体テスト & カバレッジ + 本番ビルドが一括検証されます。
4. **リモートプッシュ**:
   ```bash
   git push origin <ブランチ名>
   ```
