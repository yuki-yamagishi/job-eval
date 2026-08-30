# ADR-0003: MockAiProvider & GeminiAiProvider のプラグイン型 AI 設計の採用

- **ステータス**: **Accepted**
- **決定日**: 2026-08-30
- **決定者**: JobEval 開発チーム

---

## 1. 背景と課題 (Context & Problem Statement)
AI 求人適合度評価の機能開発および CI/CD 自動テスト環境において、毎回実際の Gemini API を呼び出すと、API コストの発生、レート制限（429 Too Many Requests）、ネットワーク遅延、および API キーがない環境でのテスト失敗が発生する課題があった。

## 2. 検討された選択肢 (Considered Options)
1. **選択肢 1: 実 Gemini API への直接呼び出しのみ**
2. **選択肢 2: `AiProvider` インターフェースによるプラグイン型設計（`MockAiProvider` と `GeminiAiProvider` の分離）**

## 3. 決定内容と理由 (Decision Outcome & Rationale)
- **採用**: **選択肢 2（プラグイン型 AI プロバイダー）**
- **理由**:
  1. `AiProvider` インターフェースを定義し、UI やビジネスロジックは特定の AI SDK に直接依存しない。
  2. 自動テスト（Vitest）やオフライン開発時には `MockAiProvider` が瞬時に決定論的な評価結果を返し、API キー不要でテストが 100% 自律合格する。
  3. 実運用時には `GeminiAiProvider`（Gemini 2.5 Flash / Flash-Lite / Pro）を透過的に使用可能。将来的な OpenAI や Claude 等の他社 LLM への拡張も容易。

## 4. トレードオフと影響 (Consequences & Trade-offs)
### メリット
- CI/CD およびローカルテストの 100% 安定動作・ゼロコスト化。
- 将来的なマルチ LLM 対応の容易性。
### 制約
- `MockAiProvider` にリアルな求人票（レバテック、ビズリーチ等）のサンプルフィクスチャを保持・保守する必要がある。
