# ADR-0029: antigravity-review-loop プラグイン更新の完全自律 Pull 型自動検知・品質検証・PR 起票ワークフローの導入

- **ステータス**: Accepted
- **決定日**: 2026-09-18
- **対象**: Customization Layer, Git Submodule, CI/CD Automation, GitHub Actions, Dependabot, Governance
- **関連 Issue**: Issue #89

---

## 1. 背景と課題 (Context)

ADR-0024 において、自律レビューループ機構（Hooks, Skills, Rules, Agents, State Machine）は外部リポジトリ（`yuki-yamagishi/antigravity-review-loop`）に分離され、JobEval には Git Submodule として取り込む構成へ移行した。

`antigravity-review-loop` は JobEval 専用のコンポーネントではなく、複数のリポジトリやプロジェクトで共通利用される **独立した汎用ガバナンス基盤** である。
サブモジュールの最新コミット自動同期を設計するにあたり、以下のアーキテクチャ上の課題と原則を遵守する必要があった：

1. **アップストリーム非干渉・疎結合の原則 (Zero Upstream Coupling)**:
   - アップストリーム（`antigravity-review-loop`）に特定の下流プロジェクト（JobEval）への通知設定（`repository_dispatch`）、PAT（Personal Access Token）、Secrets をハードコードすることは、**依存関係の逆流アンチパターン（上流が下流を知る密結合）** である。
   - 下流プロジェクトが複数存在する環境において、アップストリームが個別下流の存在や宛先を管理する構造にしてはならない。
2. **手動同期への精神論依存の排除 (Mechanisms do)**:
   - 「更新に気づいたら手動で `git submodule update` を叩く」という個人の注意深さ（Good intentions）に依存していては、セキュリティ修正等の取り込み漏れや古いバージョンへの滞留が発生する。
3. **下流プロジェクトの完全自律完結 (Autonomous Pull)**:
   - 依存の方向は常に **「下流（JobEval）➔ 上流（antigravity-review-loop）の一方通行」** でなければならず、更新検知・取り込み・事前検証・PR 起票は下流側が自律的に Pull する責任を負うべきである。

---

## 2. 決定内容 (Decision)

以上のアーキテクチャ方針に基づき、**「アップストリームに一切の変更を求めない、下流完全自律 Pull 型（定期ポーリング ＋ 手動即時実行 ＋ Dependabot）および事前品質保証付き PR 自動起票メカニズム」** を採用する：

### 2.1 アップストリーム完全非干渉（設定 0 件・PAT 不要）の保証
- `antigravity-review-loop` 側には、ワークフローの追加、PAT の発行・登録、Secrets の設定などを一切行わない。
- GitHub Actions 標準の `GITHUB_TOKEN` のみで動作するため、PAT の有効期限管理や漏洩リスクが恒久的にゼロとなる。
- アップストリームは JobEval の存在や宛先を一切知る必要がなく、独立した汎用ライブラリとしての純粋性を 100% 保持する。

### 2.2 親リポジトリ自律の定期ポーリング (`schedule` cron)
- JobEval 側の GitHub Actions（`.github/workflows/update-review-loop-submodule.yml`）が、6 時間間隔（`cron: '0 */6 * * *'`）で自律的にリモートの最新コミットをチェックする。

### 2.3 手動即時トリガー (`workflow_dispatch`)
- 「今すぐ最新の review-loop を取り込みたい」場合は、GitHub Actions UI からワンクリックで即座に同期ワークフローを実行可能とする。

### 2.4 プラットフォーム標準 Dependabot (`gitsubmodule`) の併設
- `.github/dependabot.yml` を配備し、GitHub 公式の依存関係更新機能による日次 Submodule 更新検知も多重配備する。

### 2.5 厳格な事前品質検査と PR 自動起票
- サブモジュールの更新を `main` に直接 push することは厳禁とし、専用ブランチ（`chore/update-antigravity-review-loop`）で PR を自動起票する（`peter-evans/create-pull-request@v7`）。
- PR 起票前に、Node 24 環境下で `npm ci` および `npm run check`（シークレットスキャン、ADR・スキル検査、TypeScript 厳格型検査、Vitest 全テスト、プロダクションビルド）を実行し、破壊的変更がないことを 100% 事前保証する。
- 自動マージは行わず、人間（ユーザー）が PR 上で最新コミットログと検証状況を確認してマージするガバナンス憲章を堅持する。

### 2.6 Git Submodule 追跡設定の明示化
- `.gitmodules` に `branch = main` を明記し、リモート追跡ブランチを決定論的に固定する。

---

## 3. 代替案の検討と却下理由 (Alternatives Considered)

| 方式 | 判定 | 理由 |
| :--- | :---: | :--- |
| **A. アップストリームからの Push 通知 (`repository_dispatch`) ＋ PAT** | ❌ **却下** | 汎用基盤（上流）に個別プロジェクト（下流）の宛先や PAT を設定する密結合アンチパターン。他プロジェクトへの展開性を阻害し、PAT 管理リスクを生むため却下。 |
| **B. main への直接自動プッシュ** | ❌ 却下 | 万一の破壊的変更混入時に本番環境・開発環境が即座にクラッシュする。憲章 2.3（人間マージ専権）に違反。 |
| **C. 完全自律 Pull 型 (Cron + 手動 + Dependabot)（採用）** | ✅ **採用** | アップストリームに 1 行の変更も求めず、下流側の責任で自律同期・事前検証・PR起票を完結させる世界標準ベストプラクティス。 |

---

## 4. 結果・影響 (Consequences)

### メリット (Positive)
- **ゼロ設定・疎結合**: `antigravity-review-loop` に一切の追加設定（PAT やワークフロー）が不要。
- **高信頼性・安全性**: ワークフロー内での事前品質ゲート（`npm run check`）により、壊れたコードが PR になることを構造的に防止。
- **運用の自由度**: 6 時間ごとの自動チェックに加え、必要時にボタン一つで即時同期が可能。
- **トークン失敗リスクゼロ**: GitHub Actions 標準の `GITHUB_TOKEN` のみで動作するため、PAT の期限切れや漏洩リスクが恒久的にゼロ。

### 留意点 (Trade-offs)
- プッシュされた瞬間のミリ秒同期ではなく、スケジュール間隔（最大 6 時間）または手動トリガーでの同期となる（開発中の急ぎの更新は手動トリガーで即座に解決可能）。
