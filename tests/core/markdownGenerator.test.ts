import { describe, it, expect } from "vitest";
import {
  generateJobMarkdown,
  getStandardMarkdownFilename,
  sanitizeFilename,
  parseJobMarkdown,
  updateJobMarkdownBody,
} from "@/core/markdown/markdownGenerator";
import { JobMetadata } from "@/types/job";

describe("markdownGenerator", () => {
  const mockMetadata: JobMetadata = {
    id: "job-20260829-001",
    company: "株式会社テスト/テック:リード",
    title: "クラウドエンジニア*AWS?",
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
    expect(md).toContain("company: 株式会社テスト/テック:リード");
    expect(md).toContain("match_score: 88");
    expect(md).toContain("## 📊 AI適合度判定サマリー");
    expect(md).toContain("## 💬 エージェントへの逆質問・確認事項");
    expect(md).toContain("## 📝 応募時アピールポイント案");
  });

  it("sanitizes OS forbidden characters from filenames properly", () => {
    const raw = "株式会社A/B\\C:D*E?F\"G<H>I|J";
    const sanitized = sanitizeFilename(raw);
    expect(sanitized).toBe("株式会社A_B_C_D_E_F_G_H_I_J");

    const filename = getStandardMarkdownFilename(mockMetadata);
    expect(filename).toBe("2026-08-29_株式会社テスト_テック_リード_クラウドエンジニア_AWS_.md");
  });

  it("parses Frontmatter and body accurately", () => {
    const sampleMd = `---
company: 株式会社サンプル
title: バックエンド
match_score: 90
tags:
  - Go
  - AWS
---

# タイトル
本文コンテンツ`;

    const parsed = parseJobMarkdown(sampleMd);
    expect(parsed.metadata.company).toBe("株式会社サンプル");
    expect(parsed.metadata.title).toBe("バックエンド");
    expect(parsed.metadata.matchScore).toBe(90);
    expect(parsed.metadata.tags).toEqual(["Go", "AWS"]);
    expect(parsed.body.trim()).toContain("# タイトル\n本文コンテンツ");
  });

  it("updates Markdown body while preserving Frontmatter", () => {
    const sampleMd = `---
company: 株式会社サンプル
title: バックエンド
---

旧本文`;

    const updated = updateJobMarkdownBody(sampleMd, "新本文メモ追記");
    expect(updated).toContain("company: 株式会社サンプル");
    expect(updated).toContain("新本文メモ追記");
    expect(updated).not.toContain("旧本文");
  });
});
