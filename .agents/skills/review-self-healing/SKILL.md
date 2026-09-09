---
name: review-self-healing
description: Pull Request 作成、GitHub Actions CI 監視、Fleet レビュー受領、指摘自己修復ループ、解決報告、および人間へのマージ依頼を行う Runbook。PR 発行から完了までに使用する。
---

# レビュー & 自己修復ループ Runbook (review-self-healing)

このスキルは、**JobEval** における PR 作成後の自律的自己修復ループ、リモート CI 監視、および人間マージ完了までの手順を定めます。

---

## 1. PR 作成 & 早期停止ガード発動

1. **PR 作成**:
   ```bash
   gh pr create --title "<タイトル>" --body-file <一時ファイル>
   ```
   - PR 本文には `Closes #<Issue番号>` を必ず含める。
   - `postToolHook.js` が PR 作成を自動検知し、`loopState.js` の状態が `PR_CREATED` に遷移します。
   - この時点で Stop フック（`stopHook.js`）による早期停止ガードが有効になります。

2. **★【必須】リモート CI (GitHub Actions) の待機 & 監視**:
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

## 3. レビューパース & 自己修復 & 解決報告

1. **レビュー結果のパース & loopState 更新**:
   ```bash
   node .agents/skills/review-self-healing/scripts/parseReviewResult.js <レビュー本文ファイル> --update-state
   ```
   - ブロッキング指摘（`[must]`, `[should]`）がある場合、状態は `STATUS.NEEDS_FIX` となります。
2. **手元自己修復コミット**:
   - 指摘事項を修正し、テストを追加。
   - `npm.cmd run check` で 100% PASS を確認後、追加コミット＆プッシュ。
3. **公式解決報告の投稿（収束）**:
   ```bash
   node .agents/skills/review-self-healing/scripts/resolveReview.js --commit <コミットハッシュ> --summary "<修正概要>"
   ```
   - PR スレッドに公式解決コメントが投稿され、全ブロッキング指摘解消時に状態が `STATUS.RESOLVED_LGTM` に収束します。
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
