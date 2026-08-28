import { UserProfile } from "@/types/profile";
import { AgentSource } from "@/types/job";

export interface CleanedJobInput {
  cleanedText: string;
  source: AgentSource;
}

/**
 * Clean up job text by stripping excess whitespace/newlines and limiting character length
 */
export function cleanJobText(rawText: string, maxLength: number = 12000): string {
  if (!rawText) return "";
  return rawText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

/**
 * Build a structured system and user prompt for Gemini API analysis
 */
export function buildJobAnalysisPrompt(
  jobText: string,
  source: AgentSource,
  profile: UserProfile
): { systemInstruction: string; userPrompt: string } {
  const cleanedText = cleanJobText(jobText);

  const userSkillsList = profile.skills
    .map((s) => `${s.name} (${s.category}, ${s.yearsOfExperience || 0}年, ${s.level || "intermediate"})`)
    .join(", ");

  const userCertsList = profile.certifications
    .map((c) => `${c.name} (発行元: ${c.issuer})`)
    .join(", ");

  const ngConditionsList = profile.conditions.ngConditions.map((ng) => `- ${ng}`).join("\n");

  const systemInstruction = `あなたはIT・ソフトウェア業界の求職活動を支援する最高峰のAI転職アドバイザーです。
提供された「求人票テキスト」を精密に構造化解析し、候補者の「職務経歴・スキル・希望条件・NG条件」と照合して、客観的でバイアスのない適合度判定とアクション提案（逆質問・アピール点）をJSON形式で出力してください。

【評価軸と配点ガイドライン (100点満点)】
1. スキル合致度 (40%): 必須要件(Must)・歓迎要件(Want)と候補者スキル・資格の一致度
2. 希望条件合致度 (30%): 想定年収レンジ（最低${profile.conditions.targetSalaryMin}万〜目標${profile.conditions.targetSalaryMax}万円）、勤務形態（${profile.conditions.preferredWorkStyle}）、勤務地の一致度
3. キャリア成長性 (20%): クラウド刷新、モダンアーキテクチャ、テックリード裁量等の成長機会
4. 労働環境・リスク (10%): 固定残業多寡、客先常駐比率、裁量、オンコール体制
※ NG条件に抵触している場合は、総合スコアを大幅に減点し、判定ランクを「C (見送り推奨)」または「B (要確認・検討)」としてください。

【判定ランク基準】
- "S (即応募推奨)": 90点以上。スキル・条件・成長性すべてが極めて高水準。
- "A (即応募推奨)": 80点〜89点。主要スキルと希望条件を満たし即応募を推奨。
- "B (要確認・検討)": 65点〜79点。概ね良好だが要確認事項やスキルギャップあり。
- "C (見送り推奨)": 64点以下またはNG条件に重大抵触。`;

  const userPrompt = `---
【候補者プロファイル】
- 氏名/呼称: ${profile.name} (${profile.title}, 実務経験 ${profile.yearsOfExperience}年)
- スキル要約: ${profile.summary}
- 保有技術スタック: ${userSkillsList || "特になし"}
- 保有資格: ${userCertsList || "特になし"}
- 希望年収レンジ: ${profile.conditions.targetSalaryMin}万円 〜 ${profile.conditions.targetSalaryMax}万円
- 希望勤務形態: ${profile.conditions.preferredWorkStyle}
- 希望勤務地: ${profile.conditions.preferredLocation}
- 志向ポジション: ${profile.conditions.preferredRoles.join(", ")}
- NG条件 / 除外キーワード:
${ngConditionsList || "なし"}

---
【求人情報】
- エージェント/情報ソース: ${source}
- 求人テキスト本文:
${cleanedText}

---
必ず以下のJSONスキーマに従い、有効なJSONのみを出力してください。`;

  return { systemInstruction, userPrompt };
}

/**
 * Gemini API Structured Outputs JSON Schema
 */
export const GEMINI_JOB_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    company: { type: "string", description: "企業名（特定可能な場合。不明な場合は'不明'）" },
    title: { type: "string", description: "募集職種 / ポジション名" },
    salary_min: { type: "number", description: "想定年収下限（万円単位の数値。不明な場合はnull）" },
    salary_max: { type: "number", description: "想定年収上限（万円単位の数値。不明な場合はnull）" },
    location: { type: "string", description: "勤務地 / リモートワーク可否" },
    is_remote: { type: "boolean", description: "フルリモートまたはリモートワークが可能か" },
    match_score: { type: "number", description: "100点満点の総合適合度スコア (0-100)" },
    judgment: {
      type: "string",
      enum: ["S (即応募推奨)", "A (即応募推奨)", "B (要確認・検討)", "C (見送り推奨)"],
      description: "総合判定ランク",
    },
    score_breakdown: {
      type: "object",
      properties: {
        skill_match_ratio: { type: "number", description: "スキル合致度 (0-100)" },
        condition_match_ratio: { type: "number", description: "希望条件合致度 (0-100)" },
        career_growth_ratio: { type: "number", description: "キャリア成長性 (0-100)" },
        environment_risk_ratio: { type: "number", description: "労働環境・リスク健全度 (0-100)" },
      },
      required: ["skill_match_ratio", "condition_match_ratio", "career_growth_ratio", "environment_risk_ratio"],
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "技術タグや特徴タグ (例: AWS, Azure, Go, FullRemote)",
    },
    positives: {
      type: "array",
      items: { type: "string" },
      description: "ポジティブ要素・強み (箇条書き 2〜4項目)",
    },
    concerns: {
      type: "array",
      items: { type: "string" },
      description: "リスク・懸念点・確認推奨事項 (箇条書き 2〜3項目)",
    },
    agent_questions: {
      type: "array",
      items: { type: "string" },
      description: "転職エージェントへの確認・逆質問文 (2〜3項目)",
    },
    appeal_points: {
      type: "array",
      items: { type: "string" },
      description: "応募時の自己アピールポイント案 (2〜3項目)",
    },
    must_requirements: {
      type: "array",
      items: { type: "string" },
      description: "必須要件 (Must)",
    },
    want_requirements: {
      type: "array",
      items: { type: "string" },
      description: "歓迎要件 (Want)",
    },
    job_description: {
      type: "array",
      items: { type: "string" },
      description: "担当業務内容の要約箇条書き",
    },
    selection_process: {
      type: "string",
      description: "選考プロセス（例: 書類選考 → 一次面接 → 最終面接）",
    },
  },
  required: [
    "company",
    "title",
    "match_score",
    "judgment",
    "score_breakdown",
    "tags",
    "positives",
    "concerns",
    "agent_questions",
    "appeal_points",
    "must_requirements",
    "want_requirements",
    "job_description",
  ],
};
