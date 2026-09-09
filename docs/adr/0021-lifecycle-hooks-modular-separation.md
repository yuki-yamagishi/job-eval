# ADR-0021: AGY公式仕様に準拠したライフサイクルフックの責務分離とモジュール化アーキテクチャの採用

## ステータス
**Accepted**

## 決定日
2026-09-10

## 関連 Issue
- Issue #72: AGY公式仕様準拠のライフサイクルフック責務分離とプラグイン化下準備

---

## 1. 背景 (Context)
JobEval における自律エージェントのガバナンス機構は、ADR-0016（ステートマシン）、ADR-0017（ライフサイクルフック）、ADR-0018（2者並行合議制）、ADR-0020（Impact Check強制）と段階的に進化を重ねてきた。

しかし、以下のアーキテクチャ上の課題（技術的負債）が顕在化していた：
1. **`preToolHook.js` の Monolithic 肥大化 (God Hook 化)**:
   - ツール安全性（`gh pr merge` 禁止）、開発環境保護（インタラクティブテスト抑止）、着手品質（ブランチ作成前 DoR / Why-First / 重複点検）、提出品質（PR作成前 4軸書類 / DoD / ADR同期）という、全く異なるライフサイクルの関心事が 1 つのファイル（254行）に直列ベタ書きされていた。
2. **AGY 公式仕様との乖離**:
   - AGY（Antigravity）公式のライフサイクルフック仕様（`https://antigravity.google/docs/hooks/`）では、`hooks.json` のトップレベルキーは名前付きフック（`safety-gate`, `lint-checker` 等）として関心事ごとに分割し、キーごとに `"enabled": false` による個別無効化ができる設計になっている。
   - 従来の JobEval は `"loop-engineering-gate"` という単一キーに全イベントを詰め込んでいたため、個別フックの一時的無効化や柔軟な制御ができなかった。
3. **将来の独立プラグイン（Plugin）化への構造的障壁**:
   - プロジェクトからガバナンス基盤を分離し、独立した GitHub プラグインリポジトリ（`antigravity-loop-plugin`）として再利用・公開するにあたり、Monolithic なフック構造は移植性と保守性の大きなボトルネックとなっていた。

---

## 2. 決定事項 (Decisions)

### 2.1 AGY 公式仕様に基づく `hooks.json` の名前付きフック分割
`hooks.json` を関心事に応じて以下の 4 つの独立した名前付きフックに分割する：
1. **`safety-guard`**: ツール実行の直接的安全性担保（`gh pr merge` 直接実行の禁止、`npm test` インタラクティブ実行の抑止）。
2. **`branch-dor-gate`**: トピックブランチ作成時の着手品質ゲート（ワーキングツリー清浄度、LoopState IDLE、Why / 排除リスク、重複点検の検証）。
3. **`pre-pr-audit-gate`**: PR作成時の提出品質ゲート（4軸ドキュメント完備性、Pre-PR DoD 完了、SSOT / ADR 同期の検証）。
4. **`review-loop-guard`**: 自律レビューループの進行と停止ガード（`PostToolUse` での PR 作成検知・状態遷移、`Stop` での `RESOLVED_LGTM` 未達時の早期停止ブロック）。

### 2.2 ハンドラーのモジュール分離 (`.agents/hooks/handlers/`)
単一責任の原則（Single Responsibility Principle: SRP）に基づき、各判定ロジックを独立したモジュールとして切り出す：
- `hooks/handlers/safetyGuard.js`
- `hooks/handlers/branchDoRGate.js`
- `hooks/handlers/prePrAuditGate.js`
- `hooks/handlers/postPrCreate.js`

各ハンドラーは、CLI からの直接実行（`node ...` ＋ stdin/stdout JSON プロトコル）と、他のスクリプトからの関数インポート呼び出し（`handleSafetyGuard(payload)` 等）のデュアル実行に対応する。

### 2.3 ファサード（Facade）による 100% 後方互換性の保証
- 既存の `preToolHook.js` および `postToolHook.js` は、内部で上記ハンドラー群を合成（Compose）して呼び出すファサードとしてリファクタリングする。
- 関数シグネチャ `handlePreTool(payload, options)` および戻り値の互換性を完全に維持し、既存の 755 行に及ぶテストスイート（`tests/harness/hooks.test.ts`）を 1 行も弱体化させずに全件 PASS させる。

---

## 3. 結果・影響 (Consequences)

### ポジティブな影響
- **単一責任と保守性の極大化**: 各ライフサイクルガードの関心事が明確に分離され、安全ガードの追加・修正が他モジュールに副作用を与えない。
- **AGY 公式機能の完全活用**: 必要に応じて特定ゲート（例: `branch-dor-gate`）のみを `"enabled": false` に切り替える運用が可能になった。
- **テスト容易性の向上**: 各ハンドラーを独立して単体テストできるようになり、テストの網羅性と信頼性が向上。
- **プラグイン化の準備完了**: ガバナンスロジックが自律完結したモジュール群となり、将来の GitHub プラグイン化（`antigravity-loop-plugin`）への切り出しが極めてスムーズになった。

### トレードオフ・留意事項
- ファイル数が増加（ハンドラー 4 ファイルの新設）したが、各ファイルの行数は 50〜100 行程度に抑えられ、コードの認知負荷は大幅に低減されている。
