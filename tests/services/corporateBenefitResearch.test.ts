import { describe, it, expect } from "vitest";
import { researchCorporateBenefitsWithProfile } from "@/services/ai/aiService";
import { DEFAULT_USER_PROFILE } from "@/core/constants/defaultProfile";
import { generateJobMarkdown, parseJobMarkdownToJobResult } from "@/core/markdown/markdownGenerator";
import { JobAnalysisResult } from "@/types/job";

describe("Corporate Benefit Research Service", () => {
  const mockJob: JobAnalysisResult = {
    metadata: {
      id: "job-benefits-001",
      company: "株式会社テストIT",
      title: "クラウドインフラエンジニア",
      agentSource: "直接応募",
      dateAnalyzed: "2026-09-06",
      salaryMin: 800,
      salaryMax: 1100,
      matchScore: 90,
      judgment: "S (即応募推奨)",
      status: "応募検討中",
      tags: ["AWS"],
    },
    scoreBreakdown: {
      skillMatchRatio: 90,
      conditionMatchRatio: 90,
      careerGrowthRatio: 90,
      environmentRiskRatio: 90,
    },
    positives: ["高待遇"],
    concerns: [],
    agentQuestions: [],
    appealPoints: [],
    jobDetails: {
      mustRequirements: ["AWS実務経験"],
      wantRequirements: [],
      jobDescription: ["クラウド設計"],
    },
  };

  it("researches corporate benefits using mock provider when API key is empty", async () => {
    const research = await researchCorporateBenefitsWithProfile(
      mockJob,
      DEFAULT_USER_PROFILE
    );

    expect(research).toBeDefined();
    expect(research.healthInsurance).toBeDefined();
    expect(research.healthInsurance.name).toBe("関東ITソフトウェア健康保険組合 (ITS健保)");
    expect(research.healthInsurance.benefits.length).toBeGreaterThan(0);
    expect(research.corporateDC).toBeDefined();
    expect(research.corporateDC.hasDC).toBe(true);
    expect(research.corporateDC.matchingContribution).toBe(true);
    expect(research.workEnvironment).toBeDefined();
    expect(research.summaryAdvice).toBeDefined();
    expect(research.sources.length).toBeGreaterThan(0);
  });

  it("integrates research results into job markdown and persists across serialization", async () => {
    const research = await researchCorporateBenefitsWithProfile(
      mockJob,
      DEFAULT_USER_PROFILE
    );

    const baseJob: JobAnalysisResult = {
      metadata: {
        id: "job-benefits-001",
        company: "株式会社サイバーテック",
        title: "リードエンジニア",
        agentSource: "直接応募",
        dateAnalyzed: "2026-09-06",
        salaryMin: 900,
        salaryMax: 1200,
        matchScore: 92,
        judgment: "S (即応募推奨)",
        status: "応募検討中",
        tags: ["TypeScript", "Next.js"],
      },
      scoreBreakdown: {
        skillMatchRatio: 95,
        conditionMatchRatio: 90,
        careerGrowthRatio: 90,
        environmentRiskRatio: 92,
      },
      positives: ["給与水準が高い"],
      concerns: [],
      agentQuestions: [],
      appealPoints: [],
      jobDetails: {
        mustRequirements: ["TypeScript実務経験"],
        wantRequirements: [],
        jobDescription: ["自社Webプラットフォーム開発"],
      },
      benefitResearch: research,
    };

    const markdown = generateJobMarkdown({
      ...baseJob,
      mustRequirements: baseJob.jobDetails.mustRequirements,
      wantRequirements: baseJob.jobDetails.wantRequirements,
      jobDescription: baseJob.jobDetails.jobDescription,
    });
    expect(markdown).toContain("## 🌐 企業・福利厚生Webリサーチ (健保・企業型DC等)");
    expect(markdown).toContain("関東ITソフトウェア健康保険組合 (ITS健保)");
    expect(markdown).toContain("✅ 導入あり (マッチング拠出可)");

    const parsed = parseJobMarkdownToJobResult(markdown);
    expect(parsed.benefitResearch).toBeDefined();
    expect(parsed.benefitResearch?.healthInsurance.name).toBe("関東ITソフトウェア健康保険組合 (ITS健保)");
    expect(parsed.benefitResearch?.corporateDC.hasDC).toBe(true);
  });
});
