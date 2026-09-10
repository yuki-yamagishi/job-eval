# ADR-0022: Antigravity公式仕様に準拠した自律レビューループ機構のプラグイン化パッケージング

## ステータス
**Accepted**

## 決定日
2026-09-10

## 関連 Issue
- Issue #74: AGY公式仕様に準拠した自律レビューループのプラグイン化パッケージング

---

## 1. 背景 (Context)
JobEval における自律レビューループ機構は、ADR-0016（ステートマシン）、ADR-0017（ライフサイクルフック）、ADR-0018（2者並行合議制）、ADR-0020（着手前Impact Check）、ADR-0021（フラットなライフサイクルフック責務分離）と進化を重ねてきた。

しかし、これらのコンポーネント（フック、スキル、ルール、ステートマシン）はプロジェクトルート直下の `.agents/` ディレクトリに平置きされており、以下の課題が存在していた：
1. **Antigravity 公式プラグイン仕様との乖離**:
   - Antigravity 公式ドキュメント（`https://antigravity.google/docs/plugins/`）では、機能バンドルを `plugins/<plugin-name>/` 配下に `plugin.json` マーカーマニフェストと共にパッケージングし、`hooks.json`, `hooks/`, `skills/`, `rules/` などをひとまとめにする仕様が定義されている。
   - `.agents/` 直下に平置きされていたため、Antigravity のプラグインディスカバリー（Workspace Level: `.agents/plugins/<plugin-name>/`）による自動認識や名前空間カプセル化の恩恵を受けられていなかった。
2. **プロジェクト固有設定とレビューループ機構の関心の混在**:
   - リポジトリ固有の設定と自律レビューループの機構が混在し、他プロジェクトへの再配布や移植性が損なわれていた。

---

## 2. 決定事項 (Decisions)

### 2.1 ワークスペースレベルプラグイン (`antigravity-review-loop`) のパッケージング
Antigravity 公式仕様に基づき、自律レビューループ機構全体を以下の構造で `.agents/plugins/antigravity-review-loop/` 配下にカプセル化・パッケージングする：
```text
.agents/plugins/antigravity-review-loop/
├── plugin.json       # Required marker file
├── hooks.json        # ライフサイクルフック定義
├── hooks/            # フック実体スクリプト群
│   ├── branchDoRGate.js
│   ├── hookUtils.js
│   ├── postPrCreate.js
│   ├── prePrAuditGate.js
│   ├── safetyGuard.js
│   └── stopHook.js
├── skills/           # 専門スキル群
│   ├── dev-lifecycle/
│   │   └── SKILL.md
│   ├── issue-lifecycle/
│   │   └── SKILL.md
│   └── review-self-healing/
│       ├── scripts/
│       │   ├── parseReviewResult.js
│       │   ├── postPrComment.js
│       │   └── resolveReview.js
│       └── SKILL.md
├── rules/            # ルール群
│   └── single-command.md
├── agents/           # 同梱サブエージェント群 (公式 subagents 仕様準拠)
│   ├── fleet_reviewer.md
│   └── fleet_completion_auditor.md
└── state/            # 状態マシン
    ├── loopState.js
    └── loop_state.json (git無視)
```

### 2.2 `plugin.json` マニフェストの配備
プラグインルートに必須マーカーである `plugin.json` を配置し、公式プラグインとして識別可能とする：
```json
{
  "name": "antigravity-review-loop",
  "description": "Autonomous self-healing PR review loop & quality governance plugin for Antigravity"
}
```

### 2.3 実行中セッション互換のための Delegation Adapter パターン
Antigravity IDE ランタイムはセッション起動時に `.agents/hooks.json` のコマンドパスをキャッシュしているため、プラグイン配下へ移設した際に実行時エラーとならないよう、`.agents/hooks/` に薄い Delegation Adapter を配備する。
- すべての検証・制御ロジックの Single Source of Truth（SSOT）はプラグイン本体（`.agents/plugins/antigravity-review-loop/hooks/`）に置く。
- `.agents/hooks/*.js` はプラグイン側のハンドラーをインポートして呼び出す委譲コードのみとし、重複実装（パッチワーク）を排除する。
- フック内のプロジェクトルート解決には、階層固定の相対パス（`../..`）ではなく、`package.json` および `.git` を動的探索する `findProjectRoot` を導入し、配置階層の変更に対する堅牢性を担保する。

### 2.4 テストスイート・チェッカーのプラグイン配下への直接追随
- ハーネステスト（`tests/harness/*.test.ts`）は、新プラグイン配下のスクリプトを直接インポート・検証する形に更新する。
- チェッカー（`scripts/checkers/agentSkillChecker.js`）は、公式プラグインマニフェスト（`plugin.json`）、プラグイン配下のスキル群、および同梱サブエージェント群の完全性を検証するよう更新する。

### 2.5 レビュー用サブエージェント群 (`agents/`) のプラグイン同梱
Antigravity 公式サブエージェント仕様（`https://antigravity.google/docs/subagents/`）の「Agent Location and Discovery」に基づき、プラグイン配下の `agents/`（スコープ: `Bundled Plugin Package`）は自動ディスカバリー対象として正式にサポートされている。
自律レビューループ機構を完全かつ自己完結したパッケージとして配布可能とするため、レビュー用サブエージェント 2 者（`fleet_reviewer.md`, `fleet_completion_auditor.md`）を `.agents/plugins/antigravity-review-loop/agents/` 配下にカプセル化する。
- **SSOT の一元化**: コード品質担当（`fleet_reviewer`）および完了性監査担当（`fleet_completion_auditor`）のペルソナ定義正本をプラグイン配下に集約。
- **後方互換性**: 稼働中セッションの直下探索に対応するため、`.agents/agents/` にも互換配置を保持。
- **自動検査**: `scripts/checkers/agentSkillChecker.js` により、プラグイン同梱エージェントおよび互換配置の両方の存在を常時自動検証。

---

## 3. 結果・影響 (Consequences)

### ポジティブな影響
- **公式仕様準拠とディスカバリー**: Antigravity 2.0 のプラグインディスカバリー仕様（Plugins & Subagents）に 100% 準拠し、ワークスペースプラグインとして自動認識される。
- **完全な自己完結性・可搬性**: レビューループに必要な全要素（Hooks, Skills, Rules, State, Agents）が 1 フォルダに集約され、他プロジェクトへの配布が極めて容易になった。
- **高い堅牢性とゼロ回帰**: 全単体テストおよび E2E 統合テストが 100% PASS しており、既存の品質ガードレール・安全制約が何一つ損なわれずに維持されている。
