---
name: review-self-healing
description: Pull Request 作成、GitHub Actions CI 監視、Fleet レビュー受領、指摘自己修復ループ、解決報告、および人間へのマージ依頼を行う Runbook。PR 発行から完了までに使用する。
---

# レビュー & 自己修復ループ Runbook (review-self-healing)

このスキルは、**JobEval** における PR 作成後の自律的自己修復ループ、リモート CI 監視、および人間マージ完了までの手順を定めます。

---

## 1. PR 作成 & 早期停止ガード発動

1. **★【物理制約】PR 作成前最終監査 (Pre-PR Final Audit) の確認**:
   `gh pr create` 実行前に、以下が満たされている必要があります（満たされていない場合は `preToolHook` (Block 4) により物理ブロックされます）：
   - **4軸ドキュメントの完備**: `docs/issues/<Issue>/` 配下に `issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md` がすべて存在し、内容が記載されていること。
   - **DoD（受け入れ基準）チェックボックスの完全達成**: `issue.md` 内に未チェック項目（`- [ ]`）が 1 つも残っていないこと（すべて `[x]` に更新済であること）。
   - **SSOT (`architecture_overview.md`) と最新 ADR の同期**: `docs/adr/` 配下の最新 ADR が `docs/architecture_overview.md` に登録・反映されていること。

2. **PR 作成**:
   ```bash
   gh pr create --title "<タイトル>" --body-file <一時ファイル>
   ```
   - PR 本文には `Closes #<Issue番号>` を必ず含める。
   - `postToolHook.js` が PR 作成を自動検知し、`loopState.js` の状態が `PR_CREATED` に遷移します。
   - この時点で Stop フック（`stopHook.js`）による早期停止ガードが有効になります。

3. **★【必須】リモート CI (GitHub Actions) の待機 & 監視**:
   PR 作成直後、Fleet レビューに進む前に、GitHub Actions CI が正常にパスすることを確認します：
   ```bash
   gh pr checks
   ```
   - CI が失敗している場合は、手元で原因を調査・修正して追加プッシュし、CI がグリーンになるまで待機します。

---

## 2. Antigravity Fleet レビュー

1. **レビュー待機状態への遷移**:
   ```bash
   node .agents/state/loopState.js review-requested --active-subagents
   ```
2. **Fleet サブエージェントの起動**:
   - `invoke_subagent` で `fleet_reviewer` を起動。
   - Fleet は `git diff` を読み取り、Conventional Comments 形式（`[must]`, `[should]`, `[imo]`, `[nits]`, `[ask]`, `[good]`）で客観的レビューを作成して返却。
   - 親エージェントが一時ファイル経由で PR スレッドに公式コメントとして投稿：
     ```bash
     node .agents/skills/review-self-healing/scripts/postPrComment.js <PR番号> <一時ファイル>
     ```
3. **Reactive Wakeup 待機**:
   - 親エージェントはツール呼び出しを行わずにターンを終了し、Fleet の完了通知を待ちます。

---

## 3. レビューパース & 自己修復 & 再レビュー受領（セルフLGTMの物理禁止）

1. **レビュー結果のパース & loopState 更新**:
   ```bash
   node .agents/skills/review-self-healing/scripts/parseReviewResult.js <レビュー本文ファイル> --update-state
   ```
   - ブロッキング指摘（`[must]`, `[should]`）がある場合、状態は `STATUS.NEEDS_FIX` となります。
   - 初回でブロッキング指摘が 0 件かつ `[LGTM]` の場合は、直ちに `STATUS.RESOLVED_LGTM` に収束します。
2. **手元自己修復コミット**:
   - 指摘事項を修正し、テストを追加。
   - `npm.cmd run check` で 100% PASS を確認後、追加コミット＆プッシュ。
   - GitHub Actions CI がパスするまで待機（`gh pr checks`）。
3. **公式修正報告の投稿 & 再レビュー待機遷移**:
   ```bash
   node .agents/skills/review-self-healing/scripts/resolveReview.js --commit <コミットハッシュ> --summary "<修正概要>"
   ```
   - PR スレッドに公式修正報告が投稿され、状態は `STATUS.REVIEW_REQUESTED`（再レビュー待ち）に遷移します。
   - **【最重要】親エージェントによる自己承認（セルフLGTM）は物理的に禁止されています。`resolveReview.js` を実行しただけでは `RESOLVED_LGTM` には到達できません。**
4. **★【必須】Fleet サブエージェントの再起動（Re-review）**:
   - `invoke_subagent` で `fleet_reviewer` を再起動し、修正内容の客観的再検証（Re-review）を依頼します。
   - Fleet が再レビュー結果として `[LGTM]`（未解決指摘 0 件）を判定し、`parseReviewResult.js <再レビューファイル> --update-state` を実行して初めて、状態マシンが正真正銘の `STATUS.RESOLVED_LGTM` に収束します。
   - `RESOLVED_LGTM` に達して初めて、ループエンジニアリング完了定義（DoD: Definition of Done）が達成され、Stop フックの停止ガードが解除されます。

---

## 4. 人間へのマージ依頼 & 完了

1. **人間（ユーザー）への報告**:
   - 全指摘解消と総合判定 `[LGTM (All Resolved)]` を確認し、ユーザーにマージを依頼します。
   - **【最重要】PR のマージは人間（ユーザー）が実施します。エージェント自身が `gh pr merge` を実行することは `preToolHook` により禁止されています。**
2. **状態リセット**:
   マージ完了後、ループ状態をリセットします：
   ```bash
   node .agents/state/loopState.js reset
   ```
