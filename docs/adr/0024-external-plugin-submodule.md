# ADR-0024: antigravity-review-loop プラグインの外部リポジトリ分離と Git Submodule 運用への移行

- **ステータス**: Accepted
- **決定日**: 2026-09-11
- **対象**: Customization Layer, Plugin Packaging, Git Submodule, CI Quality Gate
- **関連 Issue**: Issue #78

---

## 1. 背景と課題 (Context)

ADR-0022（プラグインパッケージング）および ADR-0023（2段階監査体制）により、自律レビューループ機構（Hooks, Skills, Rules, Agents, State Machine）は `.agents/plugins/antigravity-review-loop/` 配下に完全カプセル化され、高品質なガバナンス基盤として確立された。

しかし、以下の運用上の課題が存在していた：
1. **他プロジェクトへのポータビリティの欠如**:
   - プラグインが JobEval リポジトリ内に直埋め込みされていたため、別プロジェクトで同様の自律レビューループ機構を導入する際、手動でファイルをコピー＆ペーストする必要があった。
2. **コードドリフト（乖離）と保守の分散**:
   - 複数プロジェクトにコピーされたプラグインが個別に修正されることでバージョンが乖離し、バグ修正や機能向上が他のプロジェクトへ還元されない構造的負債が生じていた。
3. **独立した品質保証・リリースの欠如**:
   - プラグイン単体での CI やテスト実行環境が整備されておらず、JobEval 本体側の変更に巻き込まれて品質が左右されるリスクがあった。

---

## 2. 決定事項 (Decisions)

### 2.1 独立 GitHub リポジトリ（`yuki-yamagishi/antigravity-review-loop`）の公開
自律レビューループ機構を単独のオープンソース/外部リポジトリ（`https://github.com/yuki-yamagishi/antigravity-review-loop`）として公開し、以下を配備した：
- **自己完結型パッケージ**: `package.json`, `tsconfig.json`, `vitest.config.ts`, `LICENSE (MIT)`。
- **プラグイン単体 CI**: GitHub Actions（Node.js 20.x, 22.x での `npm test` 自動検証）。
- **完全ドキュメント**: 日本語＆英語対応の `README.md`。

### 2.2 Git Submodule による JobEval への取り込み
JobEval プロジェクトでは、直埋め込みを廃止し、Git Submodule としてプラグインを管理する：
- **登録パス**: `.agents/plugins/antigravity-review-loop`
- **リポジトリ URL**: `https://github.com/yuki-yamagishi/antigravity-review-loop.git`
- **コミット固定**: Git ツリーオブジェクトによるコミットハッシュピン留め。プラグインの更新は明示的なサブモジュールコミット更新によってのみ行う。

### 2.3 CI（GitHub Actions）での物理的自動チェックアウト
`.github/workflows/ci.yml` の `actions/checkout@v4` において、`submodules: true` を指定する。
これにより、新規クローンや CI ランナー環境でプラグインが未取得となる事故を物理的に遮断する。

### 2.4 完全後方互換性の保証 (Zero-Regression)
サブモジュールの配置パスを従前と同一の `.agents/plugins/antigravity-review-loop` とすることで、以下の一切のコード変更を不要とした：
- `scripts/checkers/agentSkillChecker.js`: プラグイン整合性チェッカーの完全継続。
- `tests/harness/*.test.ts`: ハーネステストスイートの完全継続。
- Antigravity ライフサイクルフックディスカバリー: プラグイン自動認識の完全継続。

---

## 3. 結果と影響 (Consequences)

### ポジティブな影響
- **極大化された再利用性**: 任意のリポジトリで `git submodule add https://github.com/yuki-yamagishi/antigravity-review-loop.git .agents/plugins/antigravity-review-loop` を実行するだけで、一瞬で同一の自律レビューループ環境を構築可能となった。
- **強固なバージョン管理**: コミットハッシュで厳密に固定されるため、プラグインの予期せぬ破壊的変更が親プロジェクトに波及しない。
- **独立したテスト・CI**: プラグイン自身のリポジトリで CI が稼働し、単体での信頼性が担保される。

### トレードオフ・留意事項
- **クローン時のサブモジュール初期化**: 新規に JobEval をクローンする際は、`git clone --recurse-submodules` を実行するか、クローン後に `git submodule update --init --recursive` を実行する必要がある（CI では自動化済み）。
