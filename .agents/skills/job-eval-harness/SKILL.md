---
name: job-eval-harness
description: JobEval 開発ガイドライン、AIアシスト Issue/PR 連携、ADR設計決定記録、Issueフォルダ完結型ドキュメント管理、独立Fleetレビュー、品質・セキュリティゲート、および完全日本語ドキュメント標準化スキル。JobEval プロジェクトの機能追加・改修・検証時に必ず使用する。
---

# JobEval 開発・検証ハーネス スキル (刷新版)

このスキルは、**JobEval (AI求人適合度評価 & Markdown管理デスクトップアプリ)** の開発・検証・PR作成を最高品質で行うための公式ワークフローガイドです。

---

## 1. 開発フロー（標準ハイブリッド 8 ステップ）

```
[ 1. AIアシスト Issue 起票 ] ───> [ 2. ADR 作成 (必要時) ] ───> [ 3. ブランチ & 実装 ] ───> [ 4. 品質ゲート (npm run check) ]
                                                                                                        │
[ 8. 人間承認マージ ] <─── [ 7. 手元自己修復コミット ] <─── [ 6. 独立Fleetレビュー ] <─── [ 5. PR作成 (OPEN維持) ]
```

1. **AIアシスト Issue 起票**: 要件・受入基準・設計論点を確定。
2. **ADR（設計決定記録）の作成**: アーキテクチャ変更時は `docs/adr/000X-xxx.md` を作成し `docs/adr/README.md` に登録。
3. **ブランチ作成 & 実装**: `feature/issue-<番号>-<概要>` でブランチを作成。
4. **自動品質検査**: `npm.cmd run check`（ワンショット総合品質ゲート）で全件 PASS。
5. **Pull Request 作成**: `Closes #<Issue番号>` を記載し、PR は必ず OPEN 状態を維持。
6. **Antigravity Fleet による客観レビュー**: 独立サブエージェント（`.agents/subagents/fleet-reviewer/`）による第三者レビュー（Conventional Comments 接頭辞付き）を `gh pr comment` で投稿。
7. **レビュー指摘に基づく手元修正**: 指摘を反映し追加コミット＆プッシュ。
8. **人間（ユーザー）承認によるマージ**: ユーザーの明示的な指示または承認を得てからのみマージ。

---

## 2. ドキュメント管理規約 (`docs/` 配下)

すべての設計・検証資産はリポジトリの `docs/` 配下に完全な日本語で記録・保守します：

1. **設計決定記録 (`docs/adr/`)**:
   - スコアリング計算式や永続化形式、AIプロバイダー等の重要決定を番号付き不変レコードで蓄積。
2. **Issue フォルダ完結型ドキュメント (`docs/issues/ISSUE-XXX_<slug>/`)**:
   - 各 Issue ごとにフォルダを作成し、以下の4ファイルを完結配置：
     - `issue.md`: 要件定義・受入基準
     - `pre_verification.md`: 4軸事前検証ログ（技術的ボトルネック、UX、データ永続性、テスト自律性）
     - `plan.md`: 実装計画書（変更ファイル一覧、実装内容、検証手順）
     - `walkthrough.md`: 実装成果レポート（完了時の達成内容、検証結果）
3. **過去ログアーカイブ (`docs/archive/phases/`)**:
   - Issue に紐づかない過去フェーズを安全に退避・保全。
4. **最新ポインタドキュメント (`docs/pre_phase_verification.md`, `docs/implementation_plan.md`, `docs/walkthrough.md`)**:
   - 現在進行中の最新 Issue へのポインタ兼軽量サマリーを保持し、肥大化を防止。

---

## 3. ワンショット品質 & セキュリティゲート

変更後は必ず以下のコマンドで全件合格を確認します：

```bash
npm.cmd run check
```

**実行される自動検査**:
1. **シークレットスキャン (`node scripts/securityCheck.js`)**: APIキー・トークン・秘密鍵・個人情報の誤混入を自動検知。
2. **ドキュメント & ハーネス整合性検査 (`node scripts/docCheck.js`)**:
   - `scripts/checkers/adrChecker.js`: ADR 採番・インデックス整合性検証。
   - `scripts/checkers/agentSkillChecker.js`: AGENTS.md と SKILL.md の同期検証。
   - `scripts/checkers/issueDocChecker.js`: docs/issues/ フォルダ完結性の検証。
3. **TypeScript 型検査 (`tsc --noEmit`)**: Strict モードでの型完全性の検証。
4. **単体・統合・UIテスト & カバレッジ (`vitest run --coverage`)**: コアロジック 90% 以上の網羅率。
5. **本番バンドルビルド (`vite build`)**: バンドル破損・CSSリンク・循環参照の検証。

---

## 4. Git コミット & PR 規約

* **ブランチ命名**: `feature/issue-<番号>-<概要>`, `fix/issue-<番号>-<概要>`
* **Conventional Commits 規約**:
  - `feat:` 新機能追加
  - `fix:` バグ修正
  - `docs:` ドキュメント・ADR 作成・更新
  - `chore:` ハーネス・依存関係・設定更新
  - `test:` テストコード追加・修正
  - `refactor:` リファクタリング
  - `ci:` CI/CD 設定
* **PR 本文への Issue 紐付け**: `Closes #<Issue番号>` を必ず含める。
* **文字化け防止**: すべてのファイルは UTF-8 (LF) で保存（`.gitattributes` で強制）。
* **言語標準**: すべてのドキュメント・解説・PR本文は **完全日本語** で記述。

---

## 5. 自律的サブエージェント（並列実行）安全規約

* **発動条件**: 独立した 3 つ以上の新規ファイル/テスト作成、または並行調査時のみ自律起動。
* **安全ガードレール**:
  - 最大並列数は **最大 4 体まで**。
  - 各サブエージェントはコード編集のみ行い、**`npm run check` による最終一括品質検証およびコミット・プッシュは親エージェントが 1 回のみ実行**。
* **PR レビューサブエージェント (Fleet)**:
  - `.agents/subagents/fleet-reviewer/` の最小権限設定を使用。
  - ファイル書き込み禁止、対話型ウォッチモード（`npm test`）厳禁、単発終了コマンド（`npm.cmd run test:run`）を義務化。
