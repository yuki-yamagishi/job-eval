import { UserProfile, ScoringWeights, DEFAULT_SCORING_WEIGHTS } from "@/types/profile";
import { JudgmentRank } from "@/types/job";

export interface ScoreInput {
  jobTitle: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
  isRemote?: boolean;
  requiredSkills: string[];
  preferredSkills: string[];
  jobDescriptionText: string;
}

export interface ScoreBreakdown {
  skillMatchRatio: number; // 0 - 100
  conditionMatchRatio: number; // 0 - 100
  careerGrowthRatio: number; // 0 - 100
  environmentRiskRatio: number; // 0 - 100 (higher means lower risk / safer)
}

export interface ScoreCalculationResult {
  totalScore: number;
  judgment: JudgmentRank;
  breakdown: ScoreBreakdown;
  details: {
    matchedSkills: string[];
    unmatchedSkills: string[];
    ngTriggered: string[];
  };
}

/**
 * Determine Judgment Rank based on total score
 */
export function calculateJudgmentRank(totalScore: number): JudgmentRank {
  if (totalScore >= 90) {
    return "S (即応募推奨)";
  } else if (totalScore >= 80) {
    return "A (即応募推奨)";
  } else if (totalScore >= 65) {
    return "B (要確認・検討)";
  } else {
    return "C (見送り推奨)";
  }
}

/**
 * Pure calculation to recalculate totalScore and judgment given scoreBreakdown and weights
 */
export function recalculateScoreWithWeights(
  breakdown: ScoreBreakdown,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  hasNgPenalty: boolean = false
): { totalScore: number; judgment: JudgmentRank } {
  // Normalize weight factors (e.g. 40 -> 0.4)
  const totalWeight = (weights.skill + weights.condition + weights.growth + weights.environment) || 100;
  const wSkill = weights.skill / totalWeight;
  const wCondition = weights.condition / totalWeight;
  const wGrowth = weights.growth / totalWeight;
  const wEnv = weights.environment / totalWeight;

  let totalScore = Math.round(
    breakdown.skillMatchRatio * wSkill +
    breakdown.conditionMatchRatio * wCondition +
    breakdown.careerGrowthRatio * wGrowth +
    breakdown.environmentRiskRatio * wEnv
  );

  // Severe penalty if NG condition was triggered
  if (hasNgPenalty) {
    totalScore = Math.min(totalScore, 60);
  }

  totalScore = Math.max(10, Math.min(100, totalScore));
  const judgment = calculateJudgmentRank(totalScore);

  return {
    totalScore,
    judgment,
  };
}

/**
 * Multi-axis scoring engine based on FR-302 & FR-303 and ADR-0001 / ADR-0004
 */
export function calculateJobMatchScore(
  input: ScoreInput,
  profile: UserProfile
): ScoreCalculationResult {
  const userSkillNames = profile.skills.map((s) => s.name.toLowerCase());
  const userCerts = profile.certifications.map((c) => c.name.toLowerCase());
  const allUserTech = [...userSkillNames, ...userCerts];

  // 1. Skill Match Ratio
  // Check required skills
  const matchedRequired = input.requiredSkills.filter((req) =>
    allUserTech.some((tech) => req.toLowerCase().includes(tech) || tech.includes(req.toLowerCase()))
  );
  // Check preferred skills
  const matchedPreferred = input.preferredSkills.filter((pref) =>
    allUserTech.some((tech) => pref.toLowerCase().includes(tech) || tech.includes(pref.toLowerCase()))
  );

  let skillRatio = 60; // baseline
  if (input.requiredSkills.length > 0) {
    const requiredRatio = matchedRequired.length / input.requiredSkills.length;
    // Base requirement score (up to 75 points)
    const requiredPoints = requiredRatio * 75;
    // Preferred skills bonus (up to 25 points)
    const preferredPoints = input.preferredSkills.length > 0
      ? (matchedPreferred.length / input.preferredSkills.length) * 25
      : 15;
    // Experience bonus if candidate has > 5 years experience
    const expBonus = profile.yearsOfExperience >= 5 ? 10 : 5;

    skillRatio = Math.min(100, Math.round(requiredPoints + preferredPoints + expBonus));
  } else {
    // If no explicit required skills, check text occurrences
    const matchesInText = profile.skills.filter((s) =>
      input.jobDescriptionText.toLowerCase().includes(s.name.toLowerCase())
    );
    skillRatio = Math.min(95, Math.max(50, matchesInText.length * 20));
  }

  // 2. Condition Match Ratio
  let conditionRatio = 70;
  // Salary matching
  if (input.salaryMax && profile.conditions.targetSalaryMin) {
    if (input.salaryMax >= profile.conditions.targetSalaryMax) {
      conditionRatio += 20; // exceeds target max
    } else if (input.salaryMax >= profile.conditions.targetSalaryMin) {
      conditionRatio += 15; // satisfies min target
    } else {
      conditionRatio -= 25;
    }
  }
  // Remote work matching
  if (profile.conditions.preferredWorkStyle === "フルリモート") {
    if (input.isRemote || input.jobDescriptionText.includes("フルリモート") || input.jobDescriptionText.includes("在宅")) {
      conditionRatio += 15;
    } else if (input.jobDescriptionText.includes("出社必須") || input.jobDescriptionText.includes("常駐")) {
      conditionRatio -= 30;
    }
  }
  conditionRatio = Math.min(100, Math.max(20, conditionRatio));

  // 3. Career Growth
  let careerGrowthRatio = 80;
  const growthKeywords = ["刷新", "アーキテクチャ", "マイクロサービス", "新技術", "テックリード", "設計", "大規模", "新規事業", "リード"];
  const growthMatches = growthKeywords.filter((k) => input.jobDescriptionText.includes(k));
  careerGrowthRatio = Math.min(100, 65 + growthMatches.length * 7);

  // 4. Environment / Risk Factor
  let environmentRiskRatio = 90;
  const ngTriggered: string[] = [];

  for (const ng of profile.conditions.ngConditions) {
    // Simple NG detection
    const keywords = ng.split(/[・\s/]+/);
    for (const kw of keywords) {
      if (kw.length >= 2 && input.jobDescriptionText.includes(kw)) {
        ngTriggered.push(ng);
        environmentRiskRatio -= 35;
        break;
      }
    }
  }
  if (input.jobDescriptionText.includes("みなし残業") || input.jobDescriptionText.includes("固定残業")) {
    environmentRiskRatio -= 10;
  }
  environmentRiskRatio = Math.min(100, Math.max(10, environmentRiskRatio));

  const breakdown: ScoreBreakdown = {
    skillMatchRatio: skillRatio,
    conditionMatchRatio: conditionRatio,
    careerGrowthRatio,
    environmentRiskRatio,
  };

  // Get active weights from profile or fallback to default
  const activeWeights = profile.conditions.scoringWeights || DEFAULT_SCORING_WEIGHTS;
  const { totalScore, judgment } = recalculateScoreWithWeights(
    breakdown,
    activeWeights,
    ngTriggered.length > 0
  );

  return {
    totalScore,
    judgment,
    breakdown,
    details: {
      matchedSkills: [...matchedRequired, ...matchedPreferred],
      unmatchedSkills: input.requiredSkills.filter((r) => !matchedRequired.includes(r)),
      ngTriggered,
    },
  };
}
