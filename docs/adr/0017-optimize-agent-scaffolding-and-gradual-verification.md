# ADR-0017: AI駆動開発のための補助資源最適化（憲章とスキルの分離・段階的検証・ワークスペース衛生・仕様SSOT一元化）

## ステータス
**Accepted**

## 決定日
2026-09-09

## コンテキストと課題
ADR-0016 によるループエンジニアリングハーネス配備および Issue #60 の信頼性向上を経て、決定論的かつ安全な自律自己修復ループが確立されました。
しかし、「AI駆動開発（Autonomous AI-Driven Development）」を真の目的として補助資源（Agent Scaffolding）を再レビューした結果、以下の構造的な課題・摩擦が確認されました：

1. **トークン圧迫 (Token Tax)**:
   - `AGENTS.md` (約17KB) がユーザー定義ルールとして毎ターン全量注入されており、コンテキストウィンドウの消費と推論レイテンシを圧迫していた。
2. **過剰なドキュメント制約**:
   - `issueDocChecker.js` が実装途中でも成果レポート（`walkthrough.md`）の存在を強制していたため、TDD や小さなステップでの中間コミットが拒否されていた。
3. **ワークスペース衛生の悪化**:
   - PR 作成時の一時ファイル（`.pr_body_*.md`, `pr_review_*.md`, `diff*.txt` 等）がルートディレクトリに残留し、誤コミットや認知負荷のリスクとなっていた。
4. **仕様 SSOT の曖昧さ**:
   - プロジェクト初期の構想メモである `requirement.md` がルート直下に放置され、ADR-0001〜0016 の最新設計との乖離・二重管理が生じていた。

---

## 決定事項 (Decision)

### 1. `AGENTS.md` の憲章化と `SKILL.md` への実践手順集約
- `AGENTS.md` は「エージェント憲章・DoD・絶対遵守事項・アーキテクチャ不可侵原則」に純化し、約 2〜3KB に圧縮して毎ターンのコンテキスト消費を最小化する。
- 7フェーズの詳細な実践手順・コマンドリファレンス・安全規約は、必要時にオンデマンドで参照可能な Antigravity スキル（`.agents/skills/job-eval-harness/SKILL.md`）に集約する。
- `agentSkillChecker.js` によるガバナンス整合性検査（7つの必須ポリシーキーワード）は引き続き厳格に維持する。

### 2. `issueDocChecker.js` の段階的検証導入
- ドキュメント整合性検査スクリプトにコミット時モード（`--pre-commit`）を導入する。
  - **コミット時 (`--pre-commit`)**: 進行中 Issue は `issue.md` と `plan.md` のみを必須とし、`walkthrough.md` が未完了でもコミットを許可する。
  - **プッシュ・PR前 (`npm run check` / `npm run doc-check`)**: 進行中 Issue も含む全 4 ドキュメント（`issue.md`, `pre_verification.md`, `plan.md`, `walkthrough.md`）の完全性を厳格に要求する。
- これにより、TDD によるレッド・グリーン・リファクターのサイクルや、こまめなコミットの自由度を確保する。

### 3. ワークスペース衛生管理と `.gitignore` の強化
- ルート直下のゴミファイル（一時ファイル・差分ログ）を削除。
- `.gitignore` に `.*pr_body*.md`, `*.pr_body*.md`, `*review*.md`, `*.tmp` 等の除外パターンを追加し、一時ファイルのコミット混入を物理的に防止する。

### 4. 仕様 SSOT の一元化 (`docs/architecture_overview.md`)
- 陳腐化した `requirement.md` を `docs/archive/legacy_requirement.md` へアーカイブ。
- 最新アーキテクチャ（ADR-0001〜0016）を体系的に俯瞰する `docs/architecture_overview.md` を新設し、プロジェクト仕様の唯一の正本（SSOT）とする。

---

## 結果と影響 (Consequences)

### ポジティブな影響
- **コンテキスト効率の大幅向上**: 毎ターンの Token Tax が大幅に軽減され、AI エージェントがタスク固有のコンテキストや深い推論にリソースを集中可能となった。
- **開発サイクルの迅速化**: 中間コミットが自由に行えるようになり、TDD や段階的実装のハードルが撤廃された。
- **仕様の明確化**: 仕様が `docs/architecture_overview.md` と `docs/adr/` に一本化され、コンテキストドリフトが防止された。

### トレードオフ・留意点
- `npm run check`（フル品質ゲート）の段階では、すべての Issue ドキュメント（`walkthrough.md` 含む）が揃っていなければ通過できないため、最終的な品質・ドキュメント完全性は一切妥協されない。
