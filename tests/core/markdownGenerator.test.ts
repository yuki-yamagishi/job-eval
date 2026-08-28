import { describe, it, expect } from "vitest";
import { generateJobMarkdown, getStandardMarkdownFilename } from "@/core/markdown/markdownGenerator";
import { JobMetadata } from "@/types/job";

describe("markdownGenerator", () => {
  const mockMetadata: JobMetadata = {
    id: "job-20260829-001",
    company: "株式会社テスト",
    title: "クラウドエンジニア",
    agentSource: "レバテックキャリア",
    dateAnalyzed: "2026-08-29",
    salaryMin: 800,
    salaryMax: 1100,
    matchScore: 88,
    judgment: "A (即応募推奨)",
    status: "応募検討中",
    tags: ["AWS", "Azure", "Go"],
  };

  it("generates markdown containing valid YAML Frontmatter and summary sections", () => {
    const md = generateJobMarkdown({
      metadata: mockMetadata,
      scoreBreakdown: {
        skillMatchRatio: 90,
        conditionMatchRatio: 95,
        careerGrowthRatio: 85,
        environmentRiskRatio: 80,
      },
      positives: ["裁量が大きい", "リモート可"],
      concerns: ["リリース前の残業確認"],
      agentQuestions: ["プロジェクトのフェーズは？"],
      appealPoints: ["クラウド設計実績"],
      mustRequirements: ["Azure設計経験 3年以上"],
      wantRequirements: ["AZ-305保有"],
      jobDescription: ["全社インフラ刷新推進"],
    });

    expect(md).toContain("---");
    expect(md).toContain("company: 株式会社テスト");
    expect(md).toContain("match_score: 88");
    expect(md).toContain("# 【A (即応募推奨)】株式会社テスト - クラウドエンジニア");
    expect(md).toContain("## 📊 AI適合度判定サマリー");
    expect(md).toContain("## 💬 エージェントへの逆質問・確認事項");
    expect(md).toContain("## 📝 応募時アピールポイント案");
  });

  it("formats standard export filename correctly", () => {
    const filename = getStandardMarkdownFilename(mockMetadata);
    expect(filename).toBe("2026-08-29_株式会社テスト_クラウドエンジニア.md");
  });
});
