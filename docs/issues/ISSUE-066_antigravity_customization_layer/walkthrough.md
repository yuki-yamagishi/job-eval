# Issue #66: 実装成果レポート (Walkthrough)

## 1. 実施概要
- Google Antigravity 公式仕様に準拠した Customization Layer への刷新を完了。
- ルート直下の `scripts/harness/` を完全撤廃し、`.agents/` 配下へ完全集約。
- 巨大モノリスだった `job-eval-harness` を `issue-lifecycle`, `dev-lifecycle`, `review-self-healing` の 3 つの単一責務スキルへ分割。
- サブエージェントを公式仕様 `.agents/agents/fleet_reviewer.md` へ移行。
- Hooks コマンドを簡素化し、`stopHook.js` に `payload.fullyIdle` 判定を追加。
- リモート CI（GitHub Actions）待機手順および人間マージ方針を Runbook に統合。

## 2. 検証結果
- `npm.cmd run check:fast`: 全単体テスト PASS。
- `npm.cmd run doc-check`: ADR・Agent・Issue ドキュメント整合性検査 PASSED。
- `npm.cmd run check`: ワンショットフル品質ゲート PASSED。
- リモート GitHub Actions CI (PR #67): 全ジョブ PASS。

## 3. Fleet レビュー & 自己修復ループ
- **受領レビュー**: `fleet_reviewer` による客観的第三者コードレビューを受領（PR #67 に公式コメント記録）。
- **指摘事項**:
  - `[should]`: `tests/harness/hooks.test.ts` に `payload.fullyIdle === false`（Antigravity 公式仕様によるデッドロック防止判定）のテスト追加。
  - `[nits]`: `AGENTS.md` の仕様正本記述を「ADR-0001〜0018」へ更新。
- **自己修復実施**:
  - `tests/harness/hooks.test.ts` に `PR_CREATED` および `REVIEW_REQUESTED` における `payload.fullyIdle === false` 判定の単体テストケース 2 件を追加（全 23 テスト PASS）。
  - `AGENTS.md` の ADR レンジを「ADR-0001〜0018」に更新。
- **解決報告**: `resolveReview.js` により PR #67 へ解決報告を投稿し、`RESOLVED_LGTM` に収束。

## 4. ガードレール恒久強化（自己承認の物理禁止 & Re-review 必須化）
- **課題分析**: 従来の `resolveReview.js` は全指摘対応時に直接 `STATUS.RESOLVED_LGTM` に遷移していたため、親エージェントが自ら修正完了を宣言して第三者検証なしにターン終了できるセルフ承認の抜け穴が存在していた。
- **恒久改善の適用**:
  - `loopState.js`: `resolveIssues` は全指摘解消時でも `STATUS.REVIEW_REQUESTED`（再レビュー待ち）にのみ遷移させ、親エージェントによる自律的な LGTM 収束を物理禁止。
  - `resolveReview.js`: PR コメントおよび CLI 判定を「修正完了 / 再レビュー待機中 (Pending Re-review)」に更新し、Fleet 再起動を義務化。
  - `review-self-healing` (Runbook): 指摘修正後の `fleet_reviewer` 再起動（Re-review）受領を必須ステップとして定義。
  - テスト追従: `loopState.test.ts`, `resolveReview.test.ts`, `e2eLoop.test.ts` を更新し、Fleet の再レビュー判定なしには `canStop` が通過しないことを完全検証。
  - ADR-0018: 設計決定事項およびポジティブ影響に自己承認根絶と Re-review 必須化を追記。

## 5. Why-First 原則とガバナンス（DoR検査・CI Gate・Merge確認）の物理的仕組み化
- **背景と課題**:
  - エージェントが作業を進める際、文章の規約だけでは「Why（課題・背景・目的）」や「排除するリスク」を見落とし、チェックリスト思考・タスク思考に陥るリスクがあった。
  - さらに、CI 未通過状態でのレビュー要求、dirty ツリーや前タスク未完了状態でのブランチ作成、人間マージ前の勝手なリセットといったプロトコルの抜け穴が残存していた。
- **物理的仕組み化の内容**:
  1. **標準 Issue テンプレート統一 (`docs/issues/template_issue.md`)**:
     - Why（課題・背景・なぜやるのか）、Problem（具体的な課題）、Risk（排除するリスク・副作用）、Scope（スコープ）、Criteria（完了の定義）、SSOT の 6 軸構成を定義。
     - `ISSUE-066` の `issue.md` も本テンプレートに準拠して刷新。
  2. **ブランチ作成時の 3 重物理検査 (`preToolHook.js`)**:
     - `git checkout -b` または `git switch -c` を検知した際、以下を検査して違反時はブロック：
       - `3A`: 作業ツリーが dirty（未コミット変更あり）の場合は拒絶。
       - `3B`: 前回の PR が未完了（`loopState !== 'IDLE'`）の場合は拒絶。
       - `3C`: `docs/issues/` に該当 Issue の `issue.md` が存在しない、または「Why（課題・背景）」および「排除するリスク」が不足している場合は、具体的な修正案内を表示して物理拒絶。
  3. **CI Status Gate (`loopState.js`)**:
     - `setReviewRequested` 実行時、PR の GitHub Actions CI（`gh pr checks`）が `pending` または `failure` の場合はエラーを投げてレビュー依頼状態への遷移を物理拒絶。
  4. **Merge Verification Gate (`loopState.js`)**:
     - `reset()` 実行時、PR が GitHub 上で `MERGED` になっていない場合はリセットを物理拒絶（`--force` フラグ時のみ緊急オーバーライド許可）。
  - `tests/harness/hooks.test.ts`: Block 3 の各検査ケース（dirty拒絶、非IDLE拒絶、Issue不在拒読、Why/Risk欠落拒絶、合格時通過）の 5 テストを追加（計 28 テスト PASS）。
  - `tests/harness/loopState.test.ts`: CI Gate（pending/fail 拒絶、全通過時許可、skipCiCheck時バイパス）および Reset Gate（OPEN 拒絶、MERGED 許可、force 許可）の 8 テストを追加（計 20 テスト PASS）。

## 6. 内外分離（Boundary Design）に基づく Hook / State メッセージの英語統一と Remediation Guidance 強化
- **設計方針と背景**:
  - 人間向け情報（意思決定・承認）と機械・エージェント向け情報（内部統制・自動修復）の境界を明確に分離（Boundary Design）。
  - 人間向け（`docs/` 配下の設計書・ADR・Issue、PR 本文、チャット報告）は母国語である完全日本語を維持。
  - エージェント向け（Hooks、ステートマシン、エラーメッセージ、Remediation Guidance）は、トークン消費量を約 60〜70% 削減でき、モデルの指示追従性（Instruction Following）が最も堅牢な英語に完全統一。
- **改修内容**:
  1. **`preToolHook.js`**:
     - Block 3C のメッセージを英語に統一し、`docs/issues/template_issue.md` を参照・コピーして作成する具体的な Remediation Guidance を注入。
  2. **`loopState.js`**:
     - `canStop()` の拒絶理由をステータス別（`PR_CREATED`, `REVIEW_REQUESTED`, `NEEDS_FIX`）に完全分岐。
     - 各ステータスで「次に実行すべき具体的コマンド（`review-requested`, `fleet_reviewer` 起動, `resolveReview.js` 実行）」を手取り足取り案内する Remediation Guidance を英語で提供。
  3. **単体テスト追従**:
     - `tests/harness/hooks.test.ts` のアサーションを英語に追従。
     - `tests/harness/loopState.test.ts` に各ステータスの Remediation Guidance を検証する単体テスト 3 件を追加（計 23 テスト PASS）。
     - ハーネステスト全 81 件、プロジェクト全体 185 単体テストが 100% PASS。

## 7. 「本当にこれで終わりか？」の物理的仕組み化 (Pre-PR Final Audit Gate)
- **背景と目的**:
  - 人間から「本当にこれで終わりでよいですか？」と指摘されて初めて監査し、ADR追従やDoDチェックボックスの同期漏れが発覚した反省から、「エージェントの注意力や作文に頼る精神論」を完全根絶。
  - PR 作成（`gh pr create`）の直前に、システムが機械的に「本当にこれで終わりか？」を検証する物理ゲートを配備。
- **改修内容**:
  1. **`preToolHook.js` (Block 4)**:
     - `gh pr create` の呼び出しを捕捉し、以下の 3 項目を物理検証：
       - **4A-1**: `docs/issues/<Issue>/` 配下の 4軸ドキュメント（`issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md`）が完備されていること。
       - **4A-2**: `issue.md` 内に未チェック項目（`- [ ]`）が 1 件も残っていないこと。
       - **4B**: `docs/adr/` の最新 ADR が `docs/architecture_overview.md`（SSOT）に登録・同期されていること。
     - 違反時は PR 作成を物理拒絶し、具体的な修復指示（Remediation Guidance）を出力。
  2. **Runbook 同期**:
     - `.agents/skills/review-self-healing/SKILL.md` のセクション 1 に Pre-PR Final Audit の事前確認要件を明文化。
  3. **単体テスト (`tests/harness/hooks.test.ts`)**:
     - Block 4 の全分岐（4軸ドキュメント欠落拒絶、未完了チェックボックス拒絶、SSOT最新ADR未登録拒絶、全合格時許可）の単体テスト 4 件を追加（計 32 テスト PASS）。
     - ハーネステスト全 85 件が 100% PASS。





