# ADR-0020: 高速 Inner Loop（単体反復）の確立と着手前 Impact & Duplication Check 物理検査の採用

## ステータス
**Accepted**

## 決定日
2026-09-09

## 関連 Issue
- Issue #70: パッチワーク負債解消（真のfast化・手動全量廃止）と着手前Impact Check物理フックの導入

---

## 1. 背景 (Context)
最上位の不変原則である Antigravity グローバル開発憲章（Global Rules: `~/.gemini/GEMINI.md`）において、以下のコア原則が制定された：
1. **Good intentions don't work. Mechanisms do.**（精神論の排除と物理的仕組み化）
2. **Why-First 原則 & 排除リスクの明確化**
3. **Impact & Duplication Check（パッチワーク・重複実装の根絶）**
4. **Inner Loop と Outer Loop の分離**

従来の JobEval 開発環境では、`npm run check:fast` が全 200 テストの全量実行となっており、軽微な 1 行修正のたびに重い検査が走ることで開発テンポ（Inner Loop）が停滞していた。すでに Git Pre-Push Hook (`.githooks/pre-push`) および GitHub Actions CI においてフル品質ゲート（`npm run check`）が二重に防衛しているため、Inner Loop で毎回全量テストを手動実行するのはパッチワーク的な運用負債であった。

また、実装に着手する前の事前調査において「既存コードベースや共通ユーティリティ、過去の ADR の横断調査（Impact & Duplication Check）」を怠ったまま、その場しのぎのつぎはぎ改修（パッチワーク）を重ねるリスクが、人間の注意任せ（Good intentions）になっており、物理的フック（Mechanisms）による検証が不足していた。

---

## 2. 決定事項 (Decisions)

### 2.1 Inner Loop と Outer Loop の責務分離
- **Inner Loop（開発中・TDD高速反復）**:
  - `npm run check:fast`: `tsc --noEmit`（型検査のみ、約1秒）に純化。
  - `npm run test:fast`: `vitest run`（全テスト実行、カバレッジ/ビルドなし）。
  - `npm run test:related`: `vitest related --run`（変更ファイルに関連するテストのみ約2〜3秒で自動抽出・実行）。
  - `npm run test:run <path>`: 特定テストファイルの直接実行。
  - 開発中はこれらの高速コマンドをミリ秒単位で反復し、思考のテンポを維持する。
- **Outer Loop（コミット後・プッシュ前・CI）**:
  - `npm run check`（シークレットスキャン + ドキュメント完全性 + 型検査 + 全単体テスト & カバレッジ + 本番ビルド）の実行を、Git Pre-Push Hook および GitHub Actions CI に集約・一本化する。

### 2.2 着手前 Impact & Duplication Check の物理強制（PreToolHook Block 3D）
- **事前検証記録テンプレートの標準化**:
  - `docs/issues/template_pre_verification.md` を新設し、「現状の課題分析」「重複・パッチワーク点検（Impact & Duplication Check）」「改修方針」の 3 軸構成を標準化。
- **ブランチ作成時（DoR）の物理フック検査**:
  - `.agents/hooks/preToolHook.js` の Block 3 に **Block 3D** を新設。
  - `git checkout -b` / `git switch -c` 実行時、`docs/issues/<targetIssueDir>/pre_verification.md` が存在し、かつ `重複・パッチワーク点検 (Impact & Duplication Check)` セクションが記述されているかを検証。
  - 不足している場合はブランチ作成を物理拒絶し、具体的な英語 Remediation Guidance を注入。

### 2.3 内外分離（Boundary Design）の遵守
- 人間向け意思決定層（Issue, ADR, 設計書, PR本文）は完全日本語で明瞭に記述。
- エージェント内部制御層（PreToolHook の拒絶メッセージ、Guidance）は英語を標準とし、トークン削減と自己修復性を極大化。

---

## 3. 結果・影響 (Consequences)

### ポジティブな影響
- **高速な開発反復**: Inner Loop が 1〜3 秒に短縮され、エージェントおよび開発者の思考テンポ・開発生産性が大幅に向上。
- **パッチワーク・重複実装の物理的根絶**: 着手前に既存コードと ADR の横断調査が強制され、車輪の再発明やつぎはぎコードの増殖が防止される。
- **ガバナンスと自動化の両立**: Git Hook と CI による強力な防衛線を維持しながら、手動の冗長な全量実行を排除。

### トレードオフ・留意事項
- 新しい Issue に着手する際は、必ず `docs/issues/` 配下に `issue.md`（Why/Risk）と `pre_verification.md`（Impact Check）の両方を作成してからブランチを切る必要がある（物理的制約）。
