# ADR-0019: Fleet レビュー体制の 2 者合議制（コード品質担当 ＋ 批判的完了性監査担当）への拡張

- **ステータス**: Accepted
- **決定日**: 2026-09-09
- **対象**: Customization Layer, Fleet Subagents, Review State Machine, PreToolHook

---

## 1. 背景と課題 (Context)

ADR-0018 により、プロジェクトの自律開発基盤は Google Antigravity 公式の「Customization Layer（カスタマイズ層）」へと刷新され、決定論的ガードレール（Why-First 検査、Pre-PR 最終監査、CI Gate、Merge Gate）が確立された。

しかし、実際の運用と分析を通じて、以下の本質的課題が特定された：

1. **単一レビュアーにおけるアテンションの偏りと確証バイアス**:
   - 単一のサブエージェント（`fleet_reviewer`）に「コード品質・型・セキュリティ（How）」と「Issue の Why・排除リスク・受け入れ基準・やり残し（What / Why）」を同時に評価させると、眼前のコード差分に認知リソースが奪われ、マクロな目的達成度や「エージェントの慢心によるやり残し」を批判的に掘り下げる視線が鈍る。
2. **Antigravity 2.0 のコア哲学「The Agent Fleet is the unit of work」の具現化**:
   - Antigravity 2.0 では、単一エージェントにすべてを委ねるのではなく、目的別に思考コンテキストが完全分離された複数のサブエージェント（Fleet）を並行起動し、分担して品質を担保することが推奨されている。
3. **着手フック（Block 3A）における形式デッドロックの解消**:
   - ブランチ作成（`git checkout -b`）前に `docs/issues/` の作成を要求する Block 3C と、作業ツリーの変更を一切許さない Block 3A が競合し、新規作成した `docs/issues/` が dirty と判定されてブランチが切れないエッジケースが存在した。

---

## 2. 決定事項 (Decisions)

### 決定 1: 2者 Fleet の責任分離（専門性の純化）
常設レビュー体制として、直交する 2 つの視点を独立したサブエージェントに完全分離する：
- **`fleet_reviewer`（コード品質・堅牢性専門）**:
  - 観点: TypeScript Strict 型安全性、アーキテクチャ原則、セキュリティ・シークレット保護、既存テスト弱体化防止、デッドロック防止。
  - 問い: 「このコードは安全・堅牢・高品質か？」（How の検証）
- **`fleet_completion_auditor`（批判的完了性・Why専門）**:
  - 観点: Issue の Why（課題背景）と Problem が真に解消されたか、排除すべき Risk は封じ込められたか、受け入れ基準（DoD）の形骸化はないか、エージェントの慢心によるやり残しやユーザー視点での死角はないか。
  - 問い: 「本当にこれで終わりか？ 目的は達成されたか？」（Why / What の検証）

### 決定 2: 並行起動プロトコル (Parallelism with Isolated Context)
- 親エージェントは `invoke_subagent` の配列指定により、両エージェントを**同時に並行起動**する。
- 思考履歴・プロンプトが完全に分離されているため、各エージェントは互いのコンテキストに汚染されず、専門観点のみに 100% のアテンションを集中できる。
- 並行実行により、レビュー待機時間は単一エージェント実行時とほぼ同等を維持する。

### 決定 3: レビュー状態マシンの合議制ゲート (Review Consortium Consensus Gate)
- `loopState.js` において、`reviews: { codeReviewer, completionAuditor }` の個別スロットを管理する。
- **合議判定ルール**:
  - **両者 LGTM**: `codeReviewer` と `completionAuditor` の両方が `LGTM`（未解決ブロッキング指摘 0 件）の場合のみ、状態マシンは `STATUS.RESOLVED_LGTM` に収束し、人間へのマージ依頼が可能となる。
  - **片方でも REQUEST_CHANGES**: いずれか片方でも未解決の `[must]` または `[should]` 指摘がある場合、状態は `STATUS.NEEDS_FIX` となり、全指摘事項が集約される。
  - **片方のみ完了時**: もう片方の完了を待つため、`STATUS.REVIEW_REQUESTED` に留まり、親エージェントの Reactive Wakeup 待機用停止が安全に許可される（デッドロック防止）。
  - **修正コミット時の全スロット無効化 (Stale Invalidation)**: コード修正後に `resolveIssues` が実行された際、過去のレビュー判定はすべて Stale（無効）としてクリアされ、両スロットは `{ codeReviewer: null, completionAuditor: null }` にリセットされる。これにより、片方の修正後に他方の再監査を経ずに合議が成立する抜け穴を物理的に排除し、両者からの再承認（Re-review & Re-audit）を強制する。

### 決定 4: レビュー結果パーススクリプトの個別更新対応
- `parseReviewResult.js` に `--agent-type <codeReviewer|completionAuditor>` 引数を追加し、各レビューアーの判定を対応するスロットに安全に記録する。また、Markdown 内の JSON ブロックに `agentType` が明記されている場合は自動識別する。

### 決定 5: 着手フック (Block 3A) の調和
- `preToolHook.js` の Block 3A において、`?? docs/issues/` のみの untracked は「これから着手する新 Issue ドキュメント」として許容し、既存ファイルの未コミット変更（modified/deleted）や他ディレクトリの untracked のみを dirty として厳格に拒絶する。

---

## 3. 影響と評価 (Consequences)

### ポジティブな影響
- **確証バイアスの完全根絶**: コードが動いているからといって安易に合格を出すエージェントの慢心を、独立した完了性監査アーが批判的視点で確実に阻止する。
- **「本当にこれで終わりか？」の仕組み化**: 人間が指摘して初めて気づくような目的乖離ややり残しを、レビュー段階で自律的に炙り出すことができる。
- **Antigravity 公式仕様との高度な合致**: 複数サブエージェントによる協調作業（Fleet Consortium）が標準ワークフローとして定着する。

### トレードオフ・受容コスト
- **トークン消費量の増加**: 1 回のレビューサイクルで 2 体のエージェントが起動するため、レビュー時のトークン消費は従来の約 2 倍となる。しかし、Antigravity 2.0 の 5 時間枠コンピュートモデルにおいては十分に許容範囲内であり、手戻りやリグレッション防止による価値が圧倒的に上回る。
