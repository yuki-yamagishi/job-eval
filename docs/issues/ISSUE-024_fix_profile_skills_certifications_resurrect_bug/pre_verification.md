## Phase 24: プロファイル設定で削除したスキル・資格がクラウド同期で復活する不具合の修正 (Issue #24)

| 検証軸 | 検出事項・考慮点 | 実装・設計での解決策 |
| :--- | :--- | :--- |
| **1. 技術・環境** | `mergeProfile` で古いプロファイルのスキル・資格を UNION 結合しているため、削除操作が打ち消される。 | `mergeProfile` を厳格な LWW（Last-Write-Wins）とし、最新タイムスタンプのプロファイルの `skills`, `certifications`, `conditions` を正として完全採用。 |
| **2. UX・エッジケース** | ユーザーが「AWS」「AZ-305」を削除して保存した場合、別端末や D1 クラウド同期後も削除状態が確実に維持されること。 | 過去のプロファイルに含まれる要素を復活させない。Gemini APIキーのみ、新規側が空の場合のフォールバックを維持。 |
| **3. 永続性・互換性** | ローカルストレージ、D1 データベース、P2P 同期の各レイヤーで整合性が保たれること。 | D1 API（`WHERE excluded.profile_updated_at >= sync_rooms.profile_updated_at`）と整合する LWW 仕様に統一。 |
| **4. テスト容易性 & 自律性** | `tests/core/smartMerge.test.ts` でスキル・資格削除の永続化テストを実施し、全18テストが PASS すること。 | テストケースを更新・追加し、`npm run check` 100% PASS を確認。 |

---
