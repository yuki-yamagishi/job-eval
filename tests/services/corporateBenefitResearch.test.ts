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
    expect(parsed.benefitResearch?.healthInsurance.type).toBe("its");
    expect(parsed.benefitResearch?.corporateDC.hasDC).toBe(true);
  });

  it("accurately identifies TJK健保 when company or job mentions TJK", async () => {
    const tjkJob: JobAnalysisResult = {
      ...mockJob,
      metadata: {
        ...mockJob.metadata,
        company: "株式会社情報サービスソリューションズ (TJK)",
      },
      originalJobText: "福利厚生: 東京都情報サービス産業健康保険組合 (TJK) 加入、保養所利用可能",
    };

    const research = await researchCorporateBenefitsWithProfile(tjkJob, DEFAULT_USER_PROFILE);
    expect(research.healthInsurance.type).toBe("tjk");
    expect(research.healthInsurance.name).toContain("TJK");
    expect(research.healthInsurance.benefits.some((b) => b.includes("白樺") || b.includes("箱根"))).toBe(true);
  });

  it("extracts health insurance immediately from job text using mock provider", async () => {
    const { MockAiProvider } = await import("@/services/ai/mockAiProvider");
    const provider = new MockAiProvider();
    const textWithTJK = `
      企業名: 株式会社テストデータ
      募集職種: クラウドエンジニア
      【福利厚生】
      社会保険完備（東京都情報サービス産業健康保険組合/TJK加入）
      退職金制度、確定拠出年金制度導入済み
    `;

    const result = await provider.analyzeJob(textWithTJK, "直接応募", DEFAULT_USER_PROFILE);
    expect(result.benefitResearch).toBeDefined();
    expect(result.benefitResearch?.healthInsurance.type).toBe("tjk");
    expect(result.benefitResearch?.healthInsurance.confidence).toBe("high");
    expect(result.benefitResearch?.corporateDC.hasDC).toBe(true);
    expect(result.markdownContent).toContain("[TJK健保]");
  });

  it("maintains backward compatibility with legacy markdown without bracketed type", () => {
    const legacyMarkdown = `---
company: 株式会社レガシー
title: インフラエンジニア
match_score: 85
judgment: A (即応募推奨)
date_analyzed: 2026-09-01
---

## 🌐 企業・福利厚生Webリサーチ (健保・企業型DC等)
- **加入健康保険組合**: **関東ITソフトウェア健康保険組合 (ITS健保)** (確度: 高)
  - 保険料率割安
- **企業型確定拠出年金 (DC)**: ✅ 導入あり (マッチング拠出可)
  - 導入済み
- **総合アドバイス**: 手厚い福利厚生環境です。
`;

    const parsed = parseJobMarkdownToJobResult(legacyMarkdown);
    expect(parsed.benefitResearch).toBeDefined();
    expect(parsed.benefitResearch?.healthInsurance.name).toBe("関東ITソフトウェア健康保険組合 (ITS健保)");
    expect(parsed.benefitResearch?.healthInsurance.type).toBe("its");
  });
});
