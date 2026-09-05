# Pre-Phase Verification: 開発ハーネス（Agent / Skill / Hook / Docs / Checkers）の抜本的リファクタリング＆責務分割刷新 (Issue #40)

## 1. 技術的ボトルネック & 実現可能性の検証 (Technical Feasibility)
- **ドキュメント検査エンジンの分割**: scripts/docCheck.js は現在約110行でADRチェックとdocsルート3ファイルチェックを行っている。これを scripts/checkers/ 配下の独立モジュール（drChecker.js, gentSkillChecker.js, issueDocChecker.js）へ分離し、docCheck.js はそれらを呼び出すオーケストレーターとする。ESモジュール形式（import/export）でスムーズに連携可能。
- **Git Hook の Windows stdin エラー**: .githooks/pre-push は git push 時に stdin から渡される <local ref> <local sha1> <remote ref> <remote sha1> を読み取らずに直接 
pm.cmd を呼んでいたため、Windows 環境の sh で構文エラーを起こしていた。while read -r local_ref local_sha remote_ref remote_sha; do :; done を先頭に配置することで完全に解消可能。
- **サブエージェント専用定義**: .agents/subagents/fleet-reviewer/subagent.json および SYSTEM_PROMPT.md を配置し、enable_write_tools: false, enable_subagent_tools: false で最小権限化。ウォッチモード禁止およびカレントディレクトリ固定をシステムプロンプトで強制。

## 2. UX & 開発者・エージェント体験の検証 (Developer & Agent Experience)
- **ドキュメント肥大化とトークン浪費の解消**: 過去ログ（Phase 4〜33）を各 Issue フォルダおよびアーカイブに切り分けたため、1ファイル50KB・1,000行超の巨大ファイルを毎度読み込む必要がなくなり、AIエージェントのコンテキスト消費と応答速度が劇的に改善。
- **検索性・追跡性の向上**: docs/issues/ISSUE-XXX/ を開くだけで、その Issue の要件・事前検証・計画・成果が一箇所で完結。

## 3. データ永続性 & 互換性の検証 (Data Integrity & Backward Compatibility)
- **過去ログの完全保全**: Phase 4〜33 までの全ログがスクリプトにより欠損なく切り分けられ、保全されている。
- **ADR-0014 の策定**: 開発ハーネス刷新の決定事項を不変レコードとして残し、docs/adr/README.md に登録。

## 4. テスト自律性 & 自動検証の検証 (Test Autonomy & Quality Gate)
- 
pm run doc-check が新チェッカー体制でパスすること。
- 
pm run check が 100% PASS し、シークレット・ドキュメント・型・テスト・ビルドの全ゲートが通ること。
