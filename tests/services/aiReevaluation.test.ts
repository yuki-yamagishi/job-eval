import { describe, it, expect } from "vitest";
import { reEvaluateJobFromOriginalText, constructJobTextFallback } from "@/services/ai/aiService";
import { JobAnalysisResult } from "@/types/job";
import { DEFAULT_USER_PROFILE } from "@/core/constants/defaultProfile";
import { parseJobMarkdownToJobResult } from "@/core/markdown/markdownGenerator";

describe("AI Re-evaluation with History Service", () => {
  const initialJob: JobAnalysisResult = {
    metadata: {
      id: "job-test-101",
      company: "株式会社テストクラウド",
      title: "クラウドエンジニア",
      agentSource: "レバテックキャリア",
      dateAnalyzed: "2026-08-20",
      salaryMin: 800,
      salaryMax: 1000,
      matchScore: 75,
      judgment: "B (要確認・検討)",
      status: "応募検討中",
      tags: ["AWS", "Azure"],
    },
    originalJobText: "企業名: 株式会社テストクラウド\n職種: クラウドエンジニア\n年収: 800〜1000万円\n必須要件:\n- Azure/AWSの設計・構築経験\n- GoでのWeb開発",
    scoreBreakdown: {
      skillMatchRatio: 70,
      conditionMatchRatio: 75,
      careerGrowthRatio: 80,
      environmentRiskRatio: 75,
    },
    positives: ["クラウド案件の経験が活かせる"],
    concerns: ["Azureの専門資格が不足"],
    agentQuestions: ["体制について"],
    appealPoints: ["AWS実務経験"],
    jobDetails: {
      mustRequirements: ["Azure/AWSの設計・構築経験 3年以上", "GoでのWeb開発"],
      wantRequirements: ["AZ-305保有"],
      jobDescription: ["全社クラウド移行"],
      location: "東京都港区",
      selectionProcess: "書類 → 面接",
    },
    markdownContent: "Markdown Content",
  };

  it("re-evaluates job from original text, preserving metadata ID and recording evaluation history", async () => {
    // Update profile with higher experience and added skills
    const updatedProfile = {
      ...DEFAULT_USER_PROFILE,
      skills: [
        ...DEFAULT_USER_PROFILE.skills,
        { name: "Azure", category: "cloud", level: "advanced", years: 4, status: "experienced" as const },
        { name: "AZ-305", category: "qualification", level: "advanced", years: 2, status: "experienced" as const },
      ],
    };

    const reEvaluated = await reEvaluateJobFromOriginalText(
      initialJob,
      updatedProfile,
      "profile_update",
      "Azure・AZ-305スキル追加後の再評価"
    );

    // Metadata ID and status must remain identical
    expect(reEvaluated.metadata.id).toBe("job-test-101");
    expect(reEvaluated.metadata.status).toBe("応募検討中");
    expect(reEvaluated.originalJobText).toContain("株式会社テストクラウド");

    // Evaluation history must contain previous snapshot (score: 75)
    expect(reEvaluated.evaluationHistory).toBeDefined();
    expect(reEvaluated.evaluationHistory?.length).toBe(1);
    expect(reEvaluated.evaluationHistory?.[0].score).toBe(75);
    expect(reEvaluated.evaluationHistory?.[0].judgment).toBe("B (要確認・検討)");
    expect(reEvaluated.evaluationHistory?.[0].triggerReason).toBe("profile_update");

    // Markdown content should contain history section
    expect(reEvaluated.markdownContent).toContain("## 📜 適合度評価・再評価履歴 (Evaluation History)");
    expect(reEvaluated.markdownContent).toContain("総合 **75点 (B (要確認・検討))**");
  });

  it("constructs fallback text if originalJobText is missing", () => {
    const jobWithoutText: JobAnalysisResult = {
      ...initialJob,
      originalJobText: undefined,
    };

    const fallback = constructJobTextFallback(jobWithoutText);
    expect(fallback).toContain("企業名: 株式会社テストクラウド");
    expect(fallback).toContain("Azure/AWSの設計・構築経験");
  });

  it("parses evaluation history correctly from Markdown document", async () => {
    const updatedProfile = { ...DEFAULT_USER_PROFILE };
    const reEvaluated = await reEvaluateJobFromOriginalText(initialJob, updatedProfile);

    // Import back from generated Markdown
    const imported = parseJobMarkdownToJobResult(reEvaluated.markdownContent);

    expect(imported.evaluationHistory).toBeDefined();
    expect(imported.evaluationHistory?.length).toBeGreaterThanOrEqual(1);
    expect(imported.evaluationHistory?.[0].score).toBe(75);
  });
});
