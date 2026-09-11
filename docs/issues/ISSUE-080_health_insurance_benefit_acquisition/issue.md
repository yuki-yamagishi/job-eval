# Issue #80: 福利厚生情報（TJK/関東IT/協会けんぽ等）の精密取得・分類・可視化と求人票即時抽出機能の導入

## 1. 解決すべき課題・背景 (Problem Statement / Why)
- **現在の問題点**:
  - IT・ソフトウェア業界の求職者にとって、加入健康保険組合（関東ITソフトウェア健保 [ITS]、東京都情報サービス産業健保 [TJK]、全国健康保険協会 [協会けんぽ]、自社単一健保）は、月々の手取り額（保険料率の差による手取り格差）、高額療養費付加給付（自己負担限度額月2万円控除の独自手当）、直営保養所や提携施設、予防接種補助などの実質生涯待遇に直結する。
  - しかし現在の JobEval では、ADR-0015 で導入された企業・福利厚生Web調査において健保名が単なる自由記述文字列（`healthInsurance.name: string`）として保持されるのみで、機械的なカテゴリ分類（`type`）が存在しない。
  - さらに、求人票テキスト内に「関東ITソフトウェア健保加入」「TJK加入」と明記されている場合でも、初回解析スキーマで無視され、別途Web調査ボタンを押さない限り福利厚生が空白のままになる。
  - 求人一覧画面（JobDashboard）でも健保情報が一切表示されず、健保種別での絞り込みや比較ができない。
  - 面談やエージェントから口頭で判明した場合にユーザー自身が手動選択・修正するUIも存在しない。
- **放置した場合のリスク**:
  - 手取り有利な求人（ITS/TJK加入）と手取り標準の求人（協会けんぽ）の差を見落としたまま求人比較を行うことによるミスマッチ。
  - 求人票に記載されている事実情報を活かせず、無駄な外部Web検索API（Google Search Grounding）を実行することによるクォータ・処理時間浪費。
- **なぜ今解く必要があるのか**:
  - ユーザーからの直接要求であり、求人選定および条件比較の意思決定品質を大幅に向上させるため。

## 2. 期待される成果と価値 (Desired Outcome / Value)
- 健保種別（ITS、TJK、協会けんぽ、自社単一健保、その他、不明）が正規化された型として一元管理される。
- 求人票テキストからの初回即時抽出（Track 1）と、Gemini Webリサーチ（Track 2）の両方で健保種別が正確に判別・反映される。
- 一覧画面（JobDashboard）で健保バッジが表示され、健保フィルターによる絞り込みが可能になる。
- 詳細画面（PreviewPane）で健保バッジ・特長解説カードが表示され、手動変更・編集が可能になる。
- 既存の保存求人データとの100%後方互換性が保たれる。

## 3. 排除するリスク (Risks to Eliminate)
- **既存データ破壊リスク**: 既存の保存MarkdownおよびJSON構造を壊さず、オプショナル型定義（`healthInsurance.type?: HealthInsuranceType`）と自動推論フォールバックで既存求人を安全に継続利用可能とする。
- **APIコスト・クォータ浪費リスク**: 求人票テキストから正規表現・AI抽出により初回解析時に即座に抽出し、不要な追加API呼び出しを根絶する。
- **過度な断定による誤認リスク**: 確度表示（`confidence: high | medium | low`）を維持し、ユーザーによる手動訂正ドロップダウンを設けることで事実誤認を防止する。

## 4. スコープの定義 (Scope & Boundaries)
- **スコープ内 (In-Scope)**:
  - `HealthInsuranceType` 型およびマスター定数（`src/core/constants/healthInsurance.ts`）の新設
  - `CorporateBenefitResearch` 型への `type: HealthInsuranceType` 追加と自動推論ロジック
  - `jobAnalysisPrompt.ts` における求人票初回解析スキーマへの福利厚生抽出項目の追加
  - `geminiProvider.ts` および `mockAiProvider.ts` における TJK / ITS / 協会けんぽ 判定ロジックの実装
  - `JobDashboard.tsx` への健保バッジ表示および健保種別フィルター追加
  - `PreviewPane.tsx` への健保バッジ・特長表示および手動変更UIの追加
  - `markdownGenerator.ts` における Markdown 出力・復元対応
  - 単体テスト・統合テストの追加
- **スコープ外 (Non-Goals)**:
  - 年金事務所や健康保険組合APIへの直接HTTP通信（公開Web検索・求人票解析および手動編集で完結）
  - 健保以外の任意独自福利厚生制度の無制限なマッピング

## 5. 受け入れ基準 (Acceptance Criteria / Definition of Done)

### 5.1. 機能受け入れシナリオ (Feature-specific Acceptance Criteria: Given-When-Then)

- **シナリオ 1: 求人票本文に「TJK」または「東京都情報サービス産業健康保険組合」が含まれる場合の初回即時抽出**
  - **Given (前提)**: 求人票テキスト内に「福利厚生: 東京都情報サービス産業健康保険組合（TJK）加入」という記載が存在する。
  - **When (操作・入力)**: 求人解析を実行する。
  - **Then (期待結果)**: 生成された `JobAnalysisResult.benefitResearch.healthInsurance.type` が `"tjk"`、`name` が `"東京都情報サービス産業健康保険組合 (TJK)"`、`confidence` が `"high"` と設定され、Web検索を実行せずとも即座に福利厚生情報が反映される。

- **シナリオ 2: 求人票本文に「関東ITソフトウェア」または「ITS」が含まれる場合の初回即時抽出**
  - **Given (前提)**: 求人票テキスト内に「社会保険完備（関東ITソフトウェア健康保険組合）」という記載が存在する。
  - **When (操作・入力)**: 求人解析を実行する。
  - **Then (期待結果)**: 生成された `JobAnalysisResult.benefitResearch.healthInsurance.type` が `"its"`、`name` が `"関東ITソフトウェア健康保険組合 (ITS健保)"`、`confidence` が `"high"` と設定される。

- **シナリオ 3: 求人票に記載がなくWebリサーチを実行した場合の健保判別**
  - **Given (前提)**: 求人票に健保の記載がない求人（`benefitResearch` が未取得、または `type` が `"unknown"`）。
  - **When (操作・入力)**: PreviewPane の「Web調査」ボタンをクリックする。
  - **Then (期待結果)**: Gemini Webリサーチが実行され、返却された結果から `type`（`"tjk"` / `"its"` / `"kyokai"` / `"corporate"` / `"other"` / `"unknown"`）が設定され、対応するバッジとメリットが表示される。

- **シナリオ 4: PreviewPane での健保種別の手動変更と保存**
  - **Given (前提)**: 健保種別が `"unknown"` または誤った種別に設定されている求人詳細を開いている。
  - **When (操作・入力)**: PreviewPane の健保編集ドロップダウンから `"tjk"`（TJK健保）を選択して保存する。
  - **Then (期待結果)**: `analysisResult.benefitResearch.healthInsurance.type` が `"tjk"` に更新され、バッジが TJK 表示（スカイブルー）に切り替わり、Markdown にも反映されて保存される。

- **シナリオ 5: JobDashboard での健保バッジ表示と健保フィルター**
  - **Given (前提)**: ITS健保の求人2件、TJK健保の求人1件、協会けんぽの求人1件が保存されている。
  - **When (操作・入力)**: JobDashboard の健保フィルターで「TJK健保」を選択する。
  - **Then (期待結果)**: 一覧に TJK健保の求人1件のみが表示され、各求人行・カードに「TJK」バッジが表示される。

- **シナリオ 6: 既存データ（type フィールドが存在しない古いデータ）の後方互換性**
  - **Given (前提)**: `benefitResearch` に `type` プロパティが存在せず、`name: "関東ITソフトウェア健康保険組合 (ITS健保)"` のみが存在する古い JSON / Markdown データ。
  - **When (操作・入力)**: 当該データを読み込み表示する。
  - **Then (期待結果)**: エラーで停止することなく、`name` の文字列から自動推論されて `type: "its"` として扱われ、正常にバッジとカードが表示される。

### 5.2. PR作成前プロセス完了基準 (Pre-PR Process DoD)
- [x] 上記 5.1 の全機能受け入れシナリオを検証する実質的な単体テストが存在し PASS すること。
- [x] 排除対象のリスクに対する物理的ガードレール（Hook / 状態マシン）が機能していること。
- [x] 重複・パッチワーク点検（Impact & Duplication Check）が pre_verification.md に完了・記録されていること。
- [x] 4軸ドキュメント（issue, pre_verification, plan, walkthrough）が揃っていること。
- [x] フル品質ゲート（npm.cmd run check）が 100% PASS すること。

### 5.3. マージ前完了ゲート (Pre-Merge Gate)
- [ ] GitHub Actions CI が PASS していること。
- [ ] 2者合議レビュー（fleet_reviewer ＋ fleet_completion_auditor）による客観的再レビューで両者 LGTM を受領すること。
- [ ] 人間（ユーザー）による最終確認とマージが完了していること。

## 6. 関連ドキュメント・仕様正本 (References & SSOT)
- 事前検証記録: docs/issues/ISSUE-080_health_insurance_benefit_acquisition/pre_verification.md
- 関連 ADR: ADR-0015 (企業・福利厚生Web調査), ADR-0025 (健保種別分類・求人票即時抽出)
- 影響を受けるアーキテクチャ設計書: docs/architecture_overview.md
