# Issue #49: AGENTS.md / SKILL.md 規約改編・二重管理解消と自己修復ループ E2E 検証 4軸事前検証ログ

## 1. 技術的ボトルネック検証 (Technical Bottlenecks)
- **規約とスキルの二重管理によるメンテナンス不整合**:
  - これまで `AGENTS.md` と `.agents/skills/job-eval-harness/SKILL.md` に同一の文章が重複記載されており、一方のみの修正時に乖離が発生するリスクがあった。
  - **対策**: `AGENTS.md` を「開発原則・全体規約・DoD」として位置付け、`SKILL.md` を「開発エージェント向け実践 Runbook（実行手順書）」として役割分担を明確化し、二重管理を構造的に解消する。
- **E2E 結合における状態遷移デッドロック**:
  - Issue #44〜#48 で作成した各ツール（`loopState.js`, `postToolHook.js`, `stopHook.js`, `parseReviewResult.js`, `resolveReview.js`）が結合された際、意図せぬ状態の不整合や停止不能が発生しないか。
  - **対策**: `tests/harness/e2eLoop.test.ts` を新設し、初期化から PR 作成、Fleet レビュー、手元修正、解決報告、LGTM 到達、リセットまでの一連のライフサイクルを E2E で完全検証する。

## 2. UX / 開発者体験検証 (Developer Experience)
- **エージェントの早期停止の物理的撲滅**:
  - `AGENTS.md` に Definition of Done（DoD: 全指摘解消・LGTM 到達まで作業終了禁止）を明文化し、Stop フックと連動させることで、エージェントが「PRを作ったから終わり」と勝手に作業を中断することを物理的に防ぐ。
- **実践的 Runbook の提供**:
  - `SKILL.md` にコマンド例・手順を具体的に記載することで、エージェントが迷わず次に実行すべきコマンドを選択できるようにする。

## 3. データ永続性 & 状態整合性検証 (Data Persistence & State Consistency)
- **状態管理マシンの整合性**:
  - `loop_state.json` のスキーマ、フックのインターセプト条件、チェッカーの検査規則が 100% 同期していることを保証する。
- **チェッカースクリプトの同期**:
  - `scripts/checkers/agentSkillChecker.js` を改修し、新形式の規約とスキルの同期・必須ポリシーを自動検査する。

## 4. テスト自律性検証 (Test Autonomy)
- **E2E 結合テストの独立性**:
  - `tests/harness/e2eLoop.test.ts` は一時ファイルとインメモリ状態マシンを活用し、外部の GitHub API や実際のコミット操作に副作用を与えずに、完全な E2E サイクルを Vitest 内で高速（1秒未満）に自律検証可能とする。
