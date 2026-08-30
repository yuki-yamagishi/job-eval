import { describe, it, expect } from "vitest";
import { 
  calculateJobMatchScore, 
  recalculateScoreWithWeights, 
  calculateJudgmentRank, 
  ScoreInput,
  ScoreBreakdown 
} from "@/core/scoring/scoringEngine";
import { SCORING_PRESETS, DEFAULT_SCORING_WEIGHTS } from "@/types/profile";
import { TEST_MOCK_PROFILE } from "../fixtures/sampleProfile";

describe("scoringEngine", () => {
  it("calculates high score (Rank S/A) for a well-matched job with default weights", () => {
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

  it("recalculates score deterministically with dynamic weights (Reskilling vs Standard)", () => {
    // A job with low skill match (e.g. 30%), but high growth (95%) and great culture (90%)
    const breakdown: ScoreBreakdown = {
      skillMatchRatio: 30,
      conditionMatchRatio: 70,
      careerGrowthRatio: 95,
      environmentRiskRatio: 90,
    };

    // Standard preset (40/30/20/10%)
    // 30*0.4 + 70*0.3 + 95*0.2 + 90*0.1 = 12 + 21 + 19 + 9 = 61 -> Rank C
    const standardResult = recalculateScoreWithWeights(breakdown, SCORING_PRESETS.standard.weights);
    expect(standardResult.totalScore).toBe(61);
    expect(standardResult.judgment).toBe("C (見送り推奨)");

    // Reskilling preset (10/20/45/25%)
    // 30*0.1 + 70*0.2 + 95*0.45 + 90*0.25 = 3 + 14 + 42.75 + 22.5 = 82.25 -> 82 -> Rank A!
    const reskillingResult = recalculateScoreWithWeights(breakdown, SCORING_PRESETS.reskilling.weights);
    expect(reskillingResult.totalScore).toBe(82);
    expect(reskillingResult.judgment).toBe("A (即応募推奨)");
  });

  it("recalculates score for culture/environment priority", () => {
    const breakdown: ScoreBreakdown = {
      skillMatchRatio: 50,
      conditionMatchRatio: 60,
      careerGrowthRatio: 50,
      environmentRiskRatio: 95,
    };

    // Culture preset (20/30/10/40%)
    // 50*0.2 + 60*0.3 + 50*0.1 + 95*0.4 = 10 + 18 + 5 + 38 = 71 -> Rank B
    const cultureResult = recalculateScoreWithWeights(breakdown, SCORING_PRESETS.wlb_culture.weights);
    expect(cultureResult.totalScore).toBe(71);
    expect(cultureResult.judgment).toBe("B (要確認・検討)");
  });

  it("handles custom weights and normalizes correctly even if weights do not sum to 100", () => {
    const breakdown: ScoreBreakdown = {
      skillMatchRatio: 100,
      conditionMatchRatio: 100,
      careerGrowthRatio: 100,
      environmentRiskRatio: 100,
    };

    const result = recalculateScoreWithWeights(breakdown, { skill: 50, condition: 50, growth: 50, environment: 50 });
    expect(result.totalScore).toBe(100);
    expect(result.judgment).toBe("S (即応募推奨)");
  });

  it("correctly determines judgment rank thresholds", () => {
    expect(calculateJudgmentRank(95)).toBe("S (即応募推奨)");
    expect(calculateJudgmentRank(85)).toBe("A (即応募推奨)");
    expect(calculateJudgmentRank(75)).toBe("B (要確認・検討)");
    expect(calculateJudgmentRank(50)).toBe("C (見送り推奨)");
  });
});
