# ADR-0018: Google Antigravity 公式仕様に準拠した Customization Layer への抜本的刷新

- **ステータス**: Accepted
- **決定日**: 2026-09-09
- **関連Issue**: Issue #66

---

## 1. コンテキスト (Context)
ADR-0016 による自律自己修復ループ配備および ADR-0017 による憲章とスキルの分離を経て開発ハーネスは成熟しました。
しかし、Google Antigravity 公式ドキュメント（https://antigravity.google/docs/ および agy-customizations）との厳密な整合性検証を実施した結果、以下の構造的課題が判明しました：

1. **スクリプト配置の混在**:
   - ルート直下の `scripts/harness/` にエージェント用ツールが配置され、アプリ本体のビルド・検証スクリプトと混在していた。
2. **スキルの巨大モノリス化 (God Skill)**:
   - `job-eval-harness/SKILL.md`（13KB）が、Issue管理・実装手順・コマンド集・安全規約・レビューパース等を一括で抱え込み、Progressive Disclosure（段階的開示）に反してトークン消費を圧迫していた。
3. **Subagent 仕様の乖離**:
   - `.agents/subagents/fleet-reviewer/`（subagent.json + SYSTEM_PROMPT.md）が非公式独自構造のため、Antigravity の自動認識（Available subagents）から外れていた。
4. **Hooks 実行パスの複雑性**:
   - `hooks.json` のコマンドが `if exist ../scripts/... else ...` という CWD 依存のワンライナーになっていた。
5. **リモート CI 失敗の見落とし**:
   - 手順書（Runbook）に GitHub Actions CI の待機・確認ステップがなく、過去に 2 回 CI 失敗を見落としたまま進む事象が発生した。
6. **PR マージ方針との不整合**:
   - 「PR マージは人間が行う」方針と、エージェント手順書（「エージェントが承認マージを実行」）に齟齬があった。

---

## 2. 決定事項 (Decisions)
Google Antigravity の公式アーキテクチャに準拠し、本プロジェクトのガバナンス機構を **「Customization Layer（カスタマイズ層）」** として純化・リファクタリングする。

1. **ルート直下 `scripts/harness/` の完全撤廃**:
   - すべてのエージェント専用スクリプトを `.agents/` 配下へ完全移行・カプセル化する。
2. **スキルの単一責務 3 分割 (Progressive Disclosure)**:
   - `.agents/skills/issue-lifecycle/`: Issue 管理・ラベル運用（DoR）
   - `.agents/skills/dev-lifecycle/`: 実装・TDD反復・品質ゲート（Phase 1〜3）
   - `.agents/skills/review-self-healing/`: PR作成・**リモートCI待機**・Fleetレビュー・自己修復・**人間マージ依頼**（Phase 4〜7）
3. **公式 Subagent 仕様への完全アラインメント**:
   - `.agents/agents/fleet_reviewer.md`（YAML frontmatter 形式）へ移行し、ネイティブ自動ロードを実現する。
4. **Hooks のパス純化とデッドロック根絶**:
   - `hooks.json` を `node ./hooks/<name>.js` の直下参照に刷新する。
   - `stopHook.js` において公式の `payload.fullyIdle === false`（サブエージェント稼働中）を検知して安全に待機（Stop）を許可し、デッドロックを防止する。
5. **人間マージへの規約統一**:
   - `preToolHook.js` で `gh pr merge` をブロックする安全弁を維持しつつ、Runbook 上は「人間へマージを依頼して待機」に整流化する。

---

## 3. 結果・影響 (Consequences)

### ポジティブ
- **アプリコードベースの清浄化**: ルート直下の `scripts/` にエージェント用内部ツールが一切混在しなくなる。
- **コンテキスト効率の劇的向上**: フェーズごとに必要な 1〜3KB の特化スキルのみがオンデマンドで注入され、トークン消費と推論レイテンシが大幅に削減される。
- **CI 失敗見落としの撲滅**: PR 作成後に `gh pr checks` でリモート CI のグリーンを確認する工程が義務化され、品質ゲートの信頼性が向上する。
- **公式仕様への 100% 整合**: Subagent, Skills, Hooks, Rules のすべてが Antigravity 公式ベストプラクティスに合致する。
