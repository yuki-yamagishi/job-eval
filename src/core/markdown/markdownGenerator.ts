import { JobMetadata } from "@/types/job";

export interface MarkdownGenerationInput {
  metadata: JobMetadata;
  scoreBreakdown: {
    skillMatchRatio: number;
    conditionMatchRatio: number;
    careerGrowthRatio: number;
    environmentRiskRatio: number;
  };
  positives: string[];
  concerns: string[];
  agentQuestions: string[];
  appealPoints: string[];
  mustRequirements: string[];
  wantRequirements: string[];
  jobDescription: string[];
  selectionProcess?: string;
}

/**
 * Generate formatted Markdown matching Requirement.md Section 5
 */
export function generateJobMarkdown(input: MarkdownGenerationInput): string {
  const { metadata, scoreBreakdown, positives, concerns, agentQuestions, appealPoints, mustRequirements, wantRequirements, jobDescription, selectionProcess } = input;

  const tagsFormatted = metadata.tags.map((t) => `  - ${t}`).join("\n");
  const positivesFormatted = positives.map((p) => `- ${p}`).join("\n");
  const concernsFormatted = concerns.map((c) => `- ${c}`).join("\n");
  const questionsFormatted = agentQuestions.map((q, idx) => `${idx + 1}. ${q}`).join("\n");
  const appealFormatted = appealPoints.map((a) => `- ${a}`).join("\n");
  const mustFormatted = mustRequirements.map((m) => `- ${m}`).join("\n");
  const wantFormatted = wantRequirements.map((w) => `- ${w}`).join("\n");
  const descriptionFormatted = jobDescription.map((d) => `- ${d}`).join("\n");

  return `---
id: ${metadata.id}
company: ${metadata.company}
title: ${metadata.title}
agent_source: ${metadata.agentSource}
${metadata.url ? `url: ${metadata.url}\n` : ""}date_analyzed: ${metadata.dateAnalyzed}
${metadata.salaryMin ? `salary_min: ${metadata.salaryMin}\n` : ""}${metadata.salaryMax ? `salary_max: ${metadata.salaryMax}\n` : ""}match_score: ${metadata.matchScore}
judgment: "${metadata.judgment}"
status: "${metadata.status}"
tags:
${tagsFormatted}
---

# 【${metadata.judgment}】${metadata.company} - ${metadata.title}

## 📊 AI適合度判定サマリー
- **総合スコア**: **${metadata.matchScore} / 100**
- **スキル合致度**: ${scoreBreakdown.skillMatchRatio}%
- **希望条件合致度**: ${scoreBreakdown.conditionMatchRatio}%
- **キャリア成長性**: ${scoreBreakdown.careerGrowthRatio}%
- **リスク/懸念点**: ${scoreBreakdown.environmentRiskRatio}%

### 👍 ポジティブ要素
${positivesFormatted}

### ⚠️ 懸念点・確認事項
${concernsFormatted}

---

## 💬 エージェントへの逆質問・確認事項
${questionsFormatted}

---

## 📝 応募時アピールポイント案
${appealFormatted}

---

## 📌 求人詳細情報

### 企業・ポジション情報
- **企業名**: ${metadata.company}
- **職種**: ${metadata.title}
- **想定年収**: ${metadata.salaryMin ?? "応相談"}万円 〜 ${metadata.salaryMax ?? "応相談"}万円
- **勤務地**: 東京都港区（フルリモート勤務可）
- **選考フロー**: ${selectionProcess || "書類選考 → 一次面接(オンライン) → 最終役員面接"}

### 必須要件 (Must)
${mustFormatted}

### 歓迎要件 (Want)
${wantFormatted}

### 業務内容
${descriptionFormatted}
`;
}

/**
 * Generate standard export filename
 * Format: YYYY-MM-DD_[company]_[title].md
 */
export function getStandardMarkdownFilename(metadata: JobMetadata): string {
  const sanitize = (str: string) => str.replace(/[/\\?%*:|"<>]/g, "_").trim();
  const date = metadata.dateAnalyzed || new Date().toISOString().split("T")[0];
  const company = sanitize(metadata.company || "Company");
  const title = sanitize(metadata.title || "Job");
  return `${date}_${company}_${title}.md`;
}
