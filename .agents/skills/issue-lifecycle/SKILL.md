---
name: issue-lifecycle
description: JobEval における GitHub Issue のステータスラベル運用規約（Definition of Ready）および着手・ブランチ作成プロトコル。Issue の着手判断や状態変更時に使用する。
---

# Issue ライフサイクル規定と着手プロトコル (issue-lifecycle)

このスキルは、**JobEval** における GitHub Issue のステータス遷移および着手可否の機械的判定ルールを定めます。

---

## 1. 進行ステータスラベル (`status:*`)

| ステータス / ラベル | 意味・状態 | AIエージェントの行動基準 |
| :--- | :--- | :--- |
| **🟡 `status: backlog`** | **アイデア・要件の保管**<br>価値はあるが、今すぐは着手しない。 | **自律着手禁止**。<br>ユーザーから明示的に「Issue #X を着手して」と指示されるまで待機。 |
| **🟠 `status: todo`** | **直近の実施候補**<br>方向性は合意したが、要件詳細化中。 | 要件・設計の整理・対話を優先。 |
| **🔵 `status: ready`** | **着手準備完了 (Definition of Ready 達成)**<br>要件・受入基準・設計論点が100%確定。 | **自律的に開発開始可能**。<br>トピックブランチを作成して実装を開始してよい。 |
| **🟣 `status: in-progress`** | **開発中**<br>トピックブランチで作業中。 | コミット・テスト・PR作成を実行中。 |
| **State: `CLOSED`** | **完了**（ラベル不要）<br>PRマージ＆品質ゲート合格完了。 | GitHub 標準機能で自動クローズ（statusラベルは剥がす）。 |

---

## 2. Issue 着手プロトコル

1. **着手判定**:
   - `status: backlog` の Issue は、ユーザーからの明示指示がない限り勝手に着手してはならない。
   - ユーザー指示または `status: ready` の Issue のみ自律着手可能。
2. **ラベル更新**:
   着手時は速やかにラベルを更新する：
   ```bash
   gh issue edit <id> --remove-label "status: backlog,status: ready" --add-label "status: in-progress"
   ```
3. **トピックブランチ作成**:
   ```bash
   git checkout -b feature/issue-<番号>-<概要>
   ```
4. **完了時クリーンアップ**:
   PR マージ後、自動クローズされた Issue から進行ラベルを剥がす：
   ```bash
   gh issue edit <id> --remove-label "status: in-progress"
   ```
