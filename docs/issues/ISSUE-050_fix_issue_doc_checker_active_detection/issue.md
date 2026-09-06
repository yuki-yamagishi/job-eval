# Issue #50: issueDocChecker の現在進行中 Issue 動的判定とバックログ複数起票のサポート

## 1. 開発の背景と課題 (Problem Statement)
- `scripts/checkers/issueDocChecker.js` は、`docs/issues/` 配下のフォルダ名をアルファベット順（辞書順）にソートし、無条件に「一番最後のフォルダ」を現在進行中の Issue と見なして 4 ファイル完結（`issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md`）を要求する仕様になっていた。
- そのため、ADR-0016 のように大きなロードマップに沿って細かな Issue（#44〜#49）を先行してバックログ起票した場合、まだ着手していない一番最後のフォルダ（#49）に対して 4 ファイルを要求し、チェッカーが誤検知エラーを起こす構造的欠陥があった。
- これを回避するために未来の Issue に中身のないダミーの `plan.md` や `walkthrough.md` を置くという場当たり的な欺瞞が発生していた。
- 今後も大きなロードマップを複数の子 Issue に分割起票する運用を正常に行うため、チェッカーの判定ロジックを根本から改修する必要がある。

## 2. 実装要件 (Requirements)
1. **現在進行中 Issue（`activeIssueDir`）の動的特定**:
   - ルートポインタ（`docs/implementation_plan.md` または `docs/pre_phase_verification.md`）から、現在作業中の Issue フォルダ名を正規表現（`ISSUE-\d+_[a-zA-Z0-9_-]+`）で動的に抽出する。
2. **Issue フォルダの分類と要求ドキュメントの適正化**:
   - **現在進行中 Issue (`activeIssueDir`)**: 4 ファイル完結（`issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md`）を必須検証。
   - **完了済みの過去 Issue（進行中より前のフォルダ）**: 4 ファイル完結を必須検証（成果物保全）。
   - **未着手のバックログ Issue（進行中より後のフォルダ）**: `issue.md`（要件定義）のみ必須とし、未着手の 3 ファイルは不要とする。
3. **ダミーファイルの削除**:
   - `docs/issues/ISSUE-049_governance_harness_integration/` に誤って配置された不要なダミー 3 ファイル（`pre_verification.md`, `plan.md`, `walkthrough.md`）を削除する。

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] バックログ Issue（#45〜#49）が `issue.md` のみで存在している状態で、`npm.cmd run doc-check` が全件合格すること。
- [ ] ルートポインタが指す進行中 Issue に対しては、正しく 4 ファイル完結が要求・検査されること。
- [ ] 過去の完了済み Issue（#40, #42等）に対しても、引き続き 4 ファイル完結が保証されること。
