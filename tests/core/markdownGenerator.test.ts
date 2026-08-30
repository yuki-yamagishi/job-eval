import { describe, it, expect } from "vitest";
import {
  generateJobMarkdown,
  getStandardMarkdownFilename,
  sanitizeFilename,
  parseJobMarkdown,
  parseJobMarkdownToJobResult,
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
      qualificationAdvice: {
        requiredCertifications: ["AZ-305"],
        recommendedCertifications: ["AZ-400 (DevOps)"],
        advice: "DevOps自動化経験をアピールすることを推奨します。",
      },
      mustRequirements: ["Azure設計経験 3年以上"],
      wantRequirements: ["AZ-305保有"],
      jobDescription: ["全社インフラ刷新推進"],
    });

    expect(md).toContain("---");
    expect(md).toContain("company: 株式会社テスト/テック:リード");
    expect(md).toContain("match_score: 88");
    expect(md).toContain("## 📊 AI適合度判定サマリー");
    expect(md).toContain("## 🎯 資格・スキルギャップ補強アクション");
    expect(md).toContain("- **求人指定・関連資格**: AZ-305");
    expect(md).toContain("`AZ-400 (DevOps)`");
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

  it("restores complete JobAnalysisResult from imported Markdown", () => {
    const sampleMd = `---
company: 株式会社インポートAI
title: シニアアーキテクト
match_score: 95
salary_min: 1000
salary_max: 1500
tags:
  - AWS
  - Rust
---

## 📊 AI適合度判定サマリー

### 🎯 適合ポイント (強み・推奨理由)
- 先進的なRustアーキテクチャの導入
- フルリモートワーク対応

### ⚠️ 懸念点・確認事項
- チーム立ち上げ期の負荷確認

### 💬 エージェントへの逆質問・確認事項
- アーキテクチャの選定裁量

### 📝 応募時アピールポイント案
- 大規模分散基盤の設計実績

## 📋 求人詳細情報
### 必須要件 (Must)
- Rust実務経験 3年以上
`;

    const result = parseJobMarkdownToJobResult(sampleMd);
    expect(result.metadata.company).toBe("株式会社インポートAI");
    expect(result.metadata.title).toBe("シニアアーキテクト");
    expect(result.metadata.matchScore).toBe(95);
    expect(result.metadata.judgment).toBe("S (即応募推奨)");
    expect(result.metadata.tags).toEqual(["AWS", "Rust"]);
    expect(result.positives.length).toBe(2);
    expect(result.concerns.length).toBe(1);
    expect(result.agentQuestions.length).toBe(1);
    expect(result.appealPoints.length).toBe(1);
    expect(result.jobDetails.mustRequirements).toContain("Rust実務経験 3年以上");
  });

  it("generates markdown with Career Trajectory section and parses it back", () => {
    const md = generateJobMarkdown({
      metadata: mockMetadata,
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
      careerTrajectory: {
        acquiredSkills: ["大規模マルチクラウド基盤設計", "IaC自動化"],
        nextCareerOptions: ["スタッフエンジニア", "VPoE"],
        marketValueProjection: "想定市場年収: 1,200万円 〜 1,500万円",
        careerRisksOrLockin: "運用固定化に注意",
        overallOutlook: "将来のCTOキャリアに直結する有望なポジションです。",
      },
      mustRequirements: ["AWS設計経験"],
      wantRequirements: [],
      jobDescription: ["インフラ刷新"],
    });

    expect(md).toContain("## 🚀 キャリア展望・獲得スキル・次の転職先 (Career Trajectory)");
    expect(md).toContain("大規模マルチクラウド基盤設計");
    expect(md).toContain("スタッフエンジニア");
    expect(md).toContain("想定市場年収: 1,200万円 〜 1,500万円");

    const parsed = parseJobMarkdownToJobResult(md);
    expect(parsed.careerTrajectory).toBeDefined();
    expect(parsed.careerTrajectory?.acquiredSkills.length).toBeGreaterThan(0);
  });
});
