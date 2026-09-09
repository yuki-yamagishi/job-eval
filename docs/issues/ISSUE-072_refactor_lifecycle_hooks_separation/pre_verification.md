# Issue #72: 事前検証記録 (Pre-Verification)

## 1. 検証日時
2026-09-10

## 2. 現状の課題分析 (Problem Analysis)
- **現状のコード・アーキテクチャの振る舞い**:
  - `preToolHook.js`（254行）が 1 つのファイルで `gh pr merge` 抑止、インタラクティブテスト抑止、ブランチ作成時のワーキングツリー/LoopState/Why/Risk/重複点検、PR作成時の4軸書類/DoD/ADR同期のすべてを判定している。
  - `hooks.json` では、`loop-engineering-gate` という単一キーの中に `Stop`, `PreToolUse`, `PostToolUse` がまとめて定義されている。
  - `postToolHook.js`（88行）が `gh pr create` の成功をパースして `setPrCreated` を呼んでいる。
  - `stopHook.js`（91行）がサブエージェント判定と `canStop` 判定を行っている。
- **根本原因 (Root Cause)**:
  - これまで個別の Issue（Issue #46, #48, #56, #60, #66, #70）で段階的に機能追加を重ねてきた結果、`preToolHook.js` が「God Hook」として肥大化し、AGY の公式仕様である名前付きフックによる責務分離が後回しになっていた。

## 3. 重複・パッチワーク点検 (Impact & Duplication Check)
- **既存基盤・ユーティリティ・ASTの横断調査**:
  - `hooks/hookUtils.js`: `readStdinJson` や `writeStdoutJson` など標準入出力の JSON パイプラインが整備されており、極めて高品質。これはそのまま全ハンドラーで再利用可能。
  - `scripts/checkers/issueDocChecker.js`: 4軸ドキュメントの存在判定や文字数判定を行っているが、`preToolHook.js` 側でも独自にファイル存在や文字数をチェックしており、ロジックが二重管理になっている。
  - `tests/harness/hooks.test.ts`: 755 行に及ぶ詳細なテストスイートが存在し、`handleStop`, `handlePreTool`, `handlePostTool` の入力と出力を網羅している。
- **車輪の再発明・パッチワークの防止方針**:
  - 新たなフック機構をつぎはぎするのではなく、AGY 公式の `hooks.json` スキーマ（名前付きキー分割）にネイティブ準拠させる。
  - 各ハンドラーは単一責任を持つ独立モジュール（関数）として `.agents/hooks/handlers/` に配置する。
  - 既存の `preToolHook.js` は、それらのハンドラーを順次呼び出すファサード（Facade）として残すことで、`tests/harness/hooks.test.ts` の既存テストに対する 100% の後方互換性を保証する。
  - つまり、既存テストの書き換えやテスト削除を行わず、新しいハンドラー単位のテストを追加する形で「無破壊リファクタリング」を実現する。

## 4. 改修方針 (Implementation Strategy)
1. **ハンドラーモジュールの新規作成 (`.agents/hooks/handlers/`)**:
   - `safetyGuard.js`: `gh pr merge` 禁止、インタラクティブテスト抑止
   - `branchDoRGate.js`: ワーキングツリー清浄度、LoopState IDLE、Why / 排除リスク、重複点検の検証
   - `prePrAuditGate.js`: 4軸ドキュメント完備、Pre-PR DoD 完了、SSOT / ADR 同期の検証
   - `postPrCreate.js`: PR 作成検知と `loopState` 遷移
2. **`preToolHook.js` のリファクタリング**:
   - 上記ハンドラーを合成（Compose）して実行するスリムな構造へ再編成。
3. **`hooks.json` のスキーマ更新**:
   - `safety-guard`, `branch-dor-gate`, `pre-pr-audit-gate`, `review-loop-guard` の 4 つの名前付きフックに分割。
4. **テスト検証**:
   - `npm.cmd run test:fast` で `tests/harness/hooks.test.ts` の全件 PASS を確認。
   - `npm.cmd run check`（フル品質ゲート）の PASS を確認。
