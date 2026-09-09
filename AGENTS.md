# JobEval エージェント憲章 (AGENTS.md)

JobEval は、**Tauri v2 + React 18 (TypeScript Strict) + Vite + Tailwind CSS** で構築された、AI求人適合度評価 & Markdownドキュメント管理デスクトップ/PWAアプリケーションです。
本憲章は、AI エージェントが開発時に厳格に遵守すべき **「コア原則・不可侵規約・完了定義 (DoD)」** を定めます。

> 📖 **詳細実践ガイド**:
> 開発フェーズに応じた詳細な実践手順書は、Customization Layer のスキル群（`.agents/skills/issue-lifecycle/`, `.agents/skills/dev-lifecycle/`, `.agents/skills/review-self-healing/`）に Progressive Disclosure（段階的開示）として分離・集約されています。作業フェーズに合わせて各スキルを参照してください。

---

## 1. アーキテクチャ原則 & 仕様 SSOT

1. **クリーンアーキテクチャの不可侵**:
   - `src/core/`（純粋ビジネスロジック: スコアリング、Markdown、プロンプト）は UI・外部依存ゼロ、100% 単体テスト可能を維持すること。
2. **仕様正本 (Single Source of Truth: SSOT) の遵守**:
   - システム仕様および ADR-0001〜0018 の統合正本は **`docs/architecture_overview.md`** および **`docs/adr/`** です。
   - すべての Issue は **`docs/issues/`** 配下に 4 ファイル完結（`issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md`）で記録・保全すること。

---

## 2. コンテキストドリフト & 仕様破壊の絶対防止ルール

1. **既存テストの弱体化・削除の厳禁**:
   - スコアリングや Markdown パーサー等の既存テストが失敗した際、テストの期待値やアサーションを安易に書き換えて合格させてはならない。仕様変更時は ADR の更新とユーザー合意が必須。
2. **ADR（設計決定記録）の遵守**:
   - 実装前に `docs/adr/` 配下のレコードを確認し、過去の設計決定（40/30/20/10%配分等）と矛盾するコードを書いてはならない。
3. **完全日本語標準化 (内外分離: Boundary Design)**:
   - `docs/` 配下のすべての設計書・ADR・Issue・レポート、および PR 本文・チャット報告は完全日本語で記述・更新すること（人間向け意思決定レイヤー）。
   - 一方で、エージェント自身の内部統制（Hooks の判定メッセージ、ステートマシンのエラー、Remediation Guidance）は、トークン消費量を 60〜70% 削減し指示追従性を最大化するため、英語を標準とする（機械向け制御レイヤー）。
4. **Windows PowerShell 環境での実行規約**:
   - スクリプト実行ポリシーを回避するため、必ず `npm.cmd`（例: `npm.cmd run check`）を使用すること。

---

## 3. ガバナンス & ループ完了定義 (Definition of Done: DoD)

1. **Conventional Commits 規約**:
   - すべてのコミットは Conventional Commits（`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `ci:`）に厳格に準拠すること。
2. **ワンショット品質ゲート (`npm run check`)**:
   - コミット・プッシュ前には必ず `npm run check`（シークレットスキャン + ドキュメント検査 + 型検査 + 全単体テスト & カバレッジ + 本番ビルド）を実行し、全項目 100% PASS を確認すること。
3. **PR 作成後の自動マージ厳禁**:
   - PR 発行直後の自動マージは厳禁。PR は必ず OPEN 状態を維持すること。
4. **独立 Fleet レビューの必須受領**:
   - PR 発行後、思考コンテキストを切り離した独立サブエージェント（Fleet: `fleet_reviewer`）を起動し、最上位モデルによる客観的第三者コードレビューを受領して PR スレッドに記録すること。
5. **ループエンジニアリング完了定義 (DoD) & 早期停止ガード**:
   - ループ状態マシン（`loopState`）により、PR 作成後の早期停止・会話終了は物理的にブロックされる。
   - レビュー指摘の修正後、解決報告ツール `resolveReview` を実行し、さらに Fleet の再レビュー（Re-review）を受領して状態を `RESOLVED_LGTM` に収束させること（自己承認は物理禁止）。
6. **人間（ユーザー）によるマージ**:
   - 全指摘解消後、ユーザーに報告してマージを依頼し、承認・マージ完了をもって作業を完了とすること（エージェントによる `gh pr merge` の直接実行はフックにより禁止）。
