import { describe, it, expect } from "vitest";
import { calculateJobMatchScore, ScoreInput } from "@/core/scoring/scoringEngine";
import { TEST_MOCK_PROFILE } from "../fixtures/sampleProfile";

describe("scoringEngine", () => {
  it("calculates high score (Rank S/A) for a well-matched job", () => {
    const input: ScoreInput = {
      jobTitle: "クラウドアーキテクト / バックエンドリード",
      salaryMin: 800,
      salaryMax: 1100,
      isRemote: true,
      requiredSkills: ["Azure", "Go"],
      preferredSkills: ["AWS", "AZ-305"],
      jobDescriptionText: "大規模システムのクラウド刷新。フルリモート勤務可。モダンマイクロサービス化。",
    };

    const result = calculateJobMatchScore(input, TEST_MOCK_PROFILE);
    expect(result.totalScore).toBeGreaterThanOrEqual(80);
    expect(["S (即応募推奨)", "A (即応募推奨)"]).toContain(result.judgment);
    expect(result.breakdown.skillMatchRatio).toBeGreaterThanOrEqual(80);
    expect(result.details.ngTriggered.length).toBe(0);
  });

  it("applies penalty and downgrades rank if NG conditions are detected", () => {
    const input: ScoreInput = {
      jobTitle: "インフラエンジニア",
      salaryMin: 500,
      salaryMax: 650,
      isRemote: false,
      requiredSkills: ["COBOL", "Java"],
      preferredSkills: [],
      jobDescriptionText: "大手金融向け客先常駐案件。みなし残業45時間超過あり。",
    };

    const result = calculateJobMatchScore(input, TEST_MOCK_PROFILE);
    expect(result.totalScore).toBeLessThan(70);
    expect(["B (要確認・検討)", "C (見送り推奨)"]).toContain(result.judgment);
    expect(result.details.ngTriggered.length).toBeGreaterThan(0);
  });
});
