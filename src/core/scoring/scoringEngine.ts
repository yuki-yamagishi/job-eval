import { UserProfile } from "@/types/profile";
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

export interface ScoreCalculationResult {
  totalScore: number;
  judgment: JudgmentRank;
  breakdown: {
    skillMatchRatio: number; // 0 - 100
    conditionMatchRatio: number; // 0 - 100
    careerGrowthRatio: number; // 0 - 100
    environmentRiskRatio: number; // 0 - 100 (higher means lower risk / safer)
  };
  details: {
    matchedSkills: string[];
    unmatchedSkills: string[];
    ngTriggered: string[];
  };
}

/**
 * Multi-axis scoring engine based on FR-302 & FR-303
 */
export function calculateJobMatchScore(
  input: ScoreInput,
  profile: UserProfile
): ScoreCalculationResult {
  const userSkillNames = profile.skills.map((s) => s.name.toLowerCase());
  const userCerts = profile.certifications.map((c) => c.name.toLowerCase());
  const allUserTech = [...userSkillNames, ...userCerts];

  // 1. Skill Match Ratio (Weight 40%)
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

  // 2. Condition Match Ratio (Weight 30%)
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

  // 3. Career Growth (Weight 20%)
  let careerGrowthRatio = 80;
  const growthKeywords = ["刷新", "アーキテクチャ", "マイクロサービス", "新技術", "テックリード", "設計", "大規模", "新規事業", "リード"];
  const growthMatches = growthKeywords.filter((k) => input.jobDescriptionText.includes(k));
  careerGrowthRatio = Math.min(100, 65 + growthMatches.length * 7);

  // 4. Environment / Risk Factor (Weight 10%)
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

  // Calculate Weighted Total Score (100 Max)
  // Skill: 40%, Condition: 30%, Career: 20%, Environment: 10%
  let totalScore = Math.round(
    skillRatio * 0.4 +
    conditionRatio * 0.3 +
    careerGrowthRatio * 0.2 +
    environmentRiskRatio * 0.1
  );

  // Severe penalty if NG condition triggered
  if (ngTriggered.length > 0) {
    totalScore = Math.min(totalScore, 60);
  }

  totalScore = Math.max(10, Math.min(100, totalScore));

  // Determine Judgment Rank
  let judgment: JudgmentRank;
  if (totalScore >= 90) {
    judgment = "S (即応募推奨)";
  } else if (totalScore >= 80) {
    judgment = "A (即応募推奨)";
  } else if (totalScore >= 65) {
    judgment = "B (要確認・検討)";
  } else {
    judgment = "C (見送り推奨)";
  }

  return {
    totalScore,
    judgment,
    breakdown: {
      skillMatchRatio: skillRatio,
      conditionMatchRatio: conditionRatio,
      careerGrowthRatio,
      environmentRiskRatio,
    },
    details: {
      matchedSkills: [...matchedRequired, ...matchedPreferred],
      unmatchedSkills: input.requiredSkills.filter((r) => !matchedRequired.includes(r)),
      ngTriggered,
    },
  };
}
