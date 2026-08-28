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

export interface ParsedJobMarkdown {
  frontmatterRaw: string;
  metadata: Partial<JobMetadata>;
  body: string;
}

/**
 * Generate formatted Markdown matching Requirement.md Section 5
 */
export function generateJobMarkdown(input: MarkdownGenerationInput): string {
  const {
    metadata,
    scoreBreakdown,
    positives,
    concerns,
    agentQuestions,
    appealPoints,
    mustRequirements,
    wantRequirements,
    jobDescription,
    selectionProcess,
  } = input;

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
${metadata.salaryMin !== undefined ? `salary_min: ${metadata.salaryMin}\n` : ""}${metadata.salaryMax !== undefined ? `salary_max: ${metadata.salaryMax}\n` : ""}match_score: ${metadata.matchScore}
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
 * Sanitize filename to prevent invalid OS filesystem characters
 * Windows/Mac/Linux forbidden: / \ : * ? " < > |
 */
export function sanitizeFilename(name: string): string {
  if (!name) return "untitled";
  return name
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate standard export filename
 * Format: YYYY-MM-DD_[company]_[title].md
 */
export function getStandardMarkdownFilename(metadata: Partial<JobMetadata>): string {
  const date = metadata.dateAnalyzed || new Date().toISOString().split("T")[0];
  const company = sanitizeFilename(metadata.company || "Company");
  const title = sanitizeFilename(metadata.title || "Job");
  return `${date}_${company}_${title}.md`;
}

/**
 * Parse Markdown file into Frontmatter and Body
 */
export function parseJobMarkdown(markdown: string): ParsedJobMarkdown {
  const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return {
      frontmatterRaw: "",
      metadata: {},
      body: markdown,
    };
  }

  const frontmatterRaw = frontmatterMatch[1];
  const body = frontmatterMatch[2];
  const metadata: Partial<JobMetadata> = {};

  // Simple key-value parser for basic YAML fields
  const lines = frontmatterRaw.split(/\r?\n/);
  let isParsingTags = false;
  const tags: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("tags:")) {
      isParsingTags = true;
      continue;
    }

    if (isParsingTags) {
      if (trimmed.startsWith("- ")) {
        tags.push(trimmed.slice(2).trim());
        continue;
      } else if (trimmed && !trimmed.startsWith("#")) {
        isParsingTags = false;
      }
    }

    const kvMatch = line.match(/^([a-zA-Z_0-9]+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      let val = kvMatch[2].trim().replace(/^["']|["']$/g, "");

      if (key === "company") metadata.company = val;
      if (key === "title") metadata.title = val;
      if (key === "id") metadata.id = val;
      if (key === "match_score") metadata.matchScore = Number(val) || 0;
      if (key === "salary_min") metadata.salaryMin = Number(val) || undefined;
      if (key === "salary_max") metadata.salaryMax = Number(val) || undefined;
      if (key === "date_analyzed") metadata.dateAnalyzed = val;
    }
  }

  if (tags.length > 0) {
    metadata.tags = tags;
  }

  return {
    frontmatterRaw,
    metadata,
    body,
  };
}

/**
 * Update Markdown content while preserving or updating Frontmatter
 */
export function updateJobMarkdownBody(originalMarkdown: string, newBody: string): string {
  const parsed = parseJobMarkdown(originalMarkdown);
  if (!parsed.frontmatterRaw) {
    return newBody;
  }
  return `---\n${parsed.frontmatterRaw}\n---\n\n${newBody.trim()}\n`;
}
