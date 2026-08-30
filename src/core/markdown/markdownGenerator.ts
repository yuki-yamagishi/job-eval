import { JobMetadata, CareerTrajectory, EvaluationHistoryItem } from "@/types/job";

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
  qualificationAdvice?: {
    requiredCertifications: string[];
    recommendedCertifications: string[];
    advice: string;
  };
  careerTrajectory?: CareerTrajectory;
  evaluationHistory?: EvaluationHistoryItem[];
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
    qualificationAdvice,
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

  let qualificationSection = "";
  if (qualificationAdvice) {
    const reqCerts = qualificationAdvice.requiredCertifications.length > 0
      ? qualificationAdvice.requiredCertifications.join(", ")
      : "特になし";
    const recCerts = qualificationAdvice.recommendedCertifications.length > 0
      ? qualificationAdvice.recommendedCertifications.map((c) => `\`${c}\``).join(" / ")
      : "特になし";

    qualificationSection = `

## 🎯 資格・スキルギャップ補強アクション
- **求人指定・関連資格**: ${reqCerts}
- **アピール強化・推奨資格**: ${recCerts}
- **戦略アドバイス**: ${qualificationAdvice.advice}
`;
  }

  let careerTrajectorySection = "";
  if (input.careerTrajectory) {
    const ct = input.careerTrajectory;
    const skills = ct.acquiredSkills.map((s) => `  - \`${s}\``).join("\n");
    const nextOptions = ct.nextCareerOptions.map((o) => `  - ${o}`).join("\n");

    careerTrajectorySection = `

## 🚀 キャリア展望・獲得スキル・次の転職先 (Career Trajectory)
- **2〜3年で身につく市場価値スキル**:
${skills}
- **次の転職で狙えるポジション・キャリアパス (Next Career)**:
${nextOptions}
- **将来想定市場年収**: ${ct.marketValueProjection}
${ct.careerRisksOrLockin ? `- **キャリア上の留意点・リスク**: ${ct.careerRisksOrLockin}\n` : ""}- **中長期展望アドバイス**: ${ct.overallOutlook}
`;
  }

  let evaluationHistorySection = "";
  if (input.evaluationHistory && input.evaluationHistory.length > 0) {
    const historyList = input.evaluationHistory
      .map((h) => {
        const reasonText = h.triggerReason === "profile_update"
          ? "プロファイル更新"
          : h.triggerReason === "user_feedback"
          ? "ユーザーフィードバック"
          : h.triggerReason === "initial"
          ? "初回評価"
          : "再評価";
        const note = h.summaryNote ? ` - *${h.summaryNote}*` : "";
        return `- **${h.date.split("T")[0]} (${reasonText})**: 総合 **${h.score}点 (${h.judgment})** [スキル: ${h.scoreBreakdown.skillMatchRatio}% / 条件: ${h.scoreBreakdown.conditionMatchRatio}% / 成長: ${h.scoreBreakdown.careerGrowthRatio}% / 環境: ${h.scoreBreakdown.environmentRiskRatio}%]${note}`;
      })
      .join("\n");

    evaluationHistorySection = `

## 📜 適合度評価・再評価履歴 (Evaluation History)
${historyList}
`;
  }

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
${qualificationSection}${careerTrajectorySection}${evaluationHistorySection}
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
      if (key === "judgment") metadata.judgment = val as import("@/types/job").JudgmentRank;
      if (key === "status") metadata.status = val as import("@/types/job").JobStatus;
      if (key === "agent_source") metadata.agentSource = val as import("@/types/job").AgentSource;
      if (key === "reject_reason") metadata.rejectReason = val;
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

/**
 * Restore a full JobAnalysisResult from imported Markdown text
 */
export function parseJobMarkdownToJobResult(markdown: string): import("@/types/job").JobAnalysisResult {
  const parsed = parseJobMarkdown(markdown);
  const meta = parsed.metadata;
  const today = new Date().toISOString().split("T")[0];

  const id = meta.id || `job-${today.replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;
  const company = meta.company || "インポート求人";
  const title = meta.title || "エンジニア / 専門職";
  const matchScore = meta.matchScore ?? 75;
  const validRanks = ["S (即応募推奨)", "A (即応募推奨)", "B (要確認・検討)", "C (見送り推奨)"] as const;
  const judgment = validRanks.find((r) => r === meta.judgment) || (matchScore >= 90 ? "S (即応募推奨)" : matchScore >= 80 ? "A (即応募推奨)" : matchScore >= 65 ? "B (要確認・検討)" : "C (見送り推奨)");
  const status = meta.status || "未検討";
  const agentSource = meta.agentSource || "その他";

  // Helper to extract list items under a markdown header
  const extractSectionList = (headerRegex: RegExp): string[] => {
    const lines = parsed.body.split(/\r?\n/);
    let inSection = false;
    const items: string[] = [];

    for (const line of lines) {
      if (headerRegex.test(line)) {
        inSection = true;
        continue;
      }
      if (inSection) {
        if (/^##+\s+/.test(line)) {
          break; // Next section
        }
        const listMatch = line.match(/^[-*]\s+(.*)$/);
        if (listMatch) {
          items.push(listMatch[1].trim());
        }
      }
    }
    return items;
  };

  const positives = extractSectionList(/^##+\s+.*(適合ポイント|強み|メリット|ポジティブ)/i);
  const concerns = extractSectionList(/^##+\s+.*(懸念点|リスク)/i);
  const agentQuestions = extractSectionList(/^##+\s+.*(逆質問|エージェント)/i);
  const appealPoints = extractSectionList(/^##+\s+.*(アピール|自己PR)/i);
  const mustRequirements = extractSectionList(/^##+\s+.*(必須要件|Must)/i);
  const wantRequirements = extractSectionList(/^##+\s+.*(歓迎要件|Want)/i);
  const jobDescription = extractSectionList(/^##+\s+.*(業務内容|募集概要)/i);

  const careerSkills = extractSectionList(/^##+\s+.*(キャリア展望|獲得スキル|市場価値スキル)/i);
  const nextCareers = extractSectionList(/^##+\s+.*(次の転職|上位ポジション|キャリアパス)/i);

  let careerTrajectory: import("@/types/job").CareerTrajectory | undefined = undefined;
  if (careerSkills.length > 0 || nextCareers.length > 0 || parsed.body.includes("Career Trajectory")) {
    careerTrajectory = {
      acquiredSkills: careerSkills.length > 0 ? careerSkills : ["実務領域における専門設計・構築スキル"],
      nextCareerOptions: nextCareers.length > 0 ? nextCareers : ["シニアエンジニア / アーキテクト", "テックリード"],
      marketValueProjection: "想定市場年収: 1,000万円 〜 1,300万円",
      overallOutlook: "インポートされた求人に基づく中長期キャリア展望です。",
    };
  }

  const historyLines = extractSectionList(/^##+\s+.*(適合度評価.*履歴|Evaluation History)/i);
  const evaluationHistory: import("@/types/job").EvaluationHistoryItem[] = [];
  for (const hLine of historyLines) {
    const dateMatch = hLine.match(/\*\*(\d{4}-\d{2}-\d{2})\s*\(([^)]+)\)\*\*/);
    const scoreMatch = hLine.match(/総合\s*\*\*(\d+)点/);
    if (dateMatch && scoreMatch) {
      const hDate = dateMatch[1];
      const hReasonRaw = dateMatch[2];
      const hScore = Number(scoreMatch[1]) || 75;

      const rankMatch = hLine.match(/総合\s*\*\*\d+点(?:\s*\((.*?)\))?\*\*/);
      const hJudgmentRaw = rankMatch && rankMatch[1]
        ? rankMatch[1]
        : (hScore >= 90 ? "S (即応募推奨)" : hScore >= 80 ? "A (即応募推奨)" : hScore >= 65 ? "B (要確認・検討)" : "C (見送り推奨)");

      const triggerReason = hReasonRaw.includes("プロファイル")
        ? "profile_update"
        : hReasonRaw.includes("フィードバック")
        ? "user_feedback"
        : hReasonRaw.includes("初回")
        ? "initial"
        : "manual_re_eval";

      evaluationHistory.push({
        id: `eval-${hDate.replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`,
        date: `${hDate}T00:00:00.000Z`,
        triggerReason,
        score: hScore,
        judgment: hJudgmentRaw as import("@/types/job").JudgmentRank,
        scoreBreakdown: {
          skillMatchRatio: 75,
          conditionMatchRatio: 75,
          careerGrowthRatio: 75,
          environmentRiskRatio: 75,
        },
        positives: [],
        concerns: [],
      });
    }
  }

  const fullMetadata: import("@/types/job").JobMetadata = {
    id,
    company,
    title,
    agentSource: agentSource as import("@/types/job").AgentSource,
    dateAnalyzed: meta.dateAnalyzed || today,
    salaryMin: meta.salaryMin,
    salaryMax: meta.salaryMax,
    matchScore,
    judgment,
    status: status as import("@/types/job").JobStatus,
    tags: meta.tags || ["インポート"],
  };

  return {
    metadata: fullMetadata,
    scoreBreakdown: {
      skillMatchRatio: 75,
      conditionMatchRatio: 75,
      careerGrowthRatio: 75,
      environmentRiskRatio: 75,
    },
    positives: positives.length > 0 ? positives : ["インポートされた求人ドキュメントです。"],
    concerns: concerns.length > 0 ? concerns : ["詳細条件をご確認ください。"],
    agentQuestions: agentQuestions.length > 0 ? agentQuestions : [],
    appealPoints: appealPoints.length > 0 ? appealPoints : [],
    careerTrajectory,
    evaluationHistory: evaluationHistory.length > 0 ? evaluationHistory : undefined,
    jobDetails: {
      mustRequirements,
      wantRequirements,
      jobDescription: jobDescription.length > 0 ? jobDescription : ["インポート本文を参照"],
      location: "東京都",
      selectionProcess: "書類選考 → 面接",
    },
    markdownContent: markdown,
  };
}
