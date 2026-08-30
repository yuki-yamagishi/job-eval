import { describe, it, expect } from "vitest";
import { cleanJobText, buildJobAnalysisPrompt, GEMINI_JOB_ANALYSIS_SCHEMA } from "@/core/prompt/jobAnalysisPrompt";
import { TEST_MOCK_PROFILE } from "../fixtures/sampleProfile";

describe("jobAnalysisPrompt", () => {
  it("cleans up excess whitespace and newlines properly", () => {
    const raw = "  企業名:  テスト株式会社  \n\n\n\n\n職種:  アーキテクト  \t\t\n";
    const cleaned = cleanJobText(raw);
    expect(cleaned).toBe("企業名: テスト株式会社\n\n職種: アーキテクト");
  });

  it("builds prompt embedding user profile, skills, and NG conditions", () => {
    const { systemInstruction, userPrompt } = buildJobAnalysisPrompt(
      "募集職種: クラウドエンジニア",
      "レバテックキャリア",
      TEST_MOCK_PROFILE
    );

    // System instruction checks
    expect(systemInstruction).toContain("AI転職アドバイザー");
    expect(systemInstruction).toContain("スキル合致度 (40%)");

    // User prompt checks
    expect(userPrompt).toContain(TEST_MOCK_PROFILE.name);
    expect(userPrompt).toContain("Azure");
    expect(userPrompt).toContain("希望年収レンジ: 800万円 〜 1100万円");
    expect(userPrompt).toContain("客先常駐");
    expect(userPrompt).toContain("レバテックキャリア");
  });

  it("includes valid JSON schema with required fields and qualification_advice", () => {
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.type).toBe("object");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("company");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("match_score");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("judgment");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("score_breakdown");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("agent_questions");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("appeal_points");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.properties.qualification_advice).toBeDefined();
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.properties.qualification_advice.required).toContain("recommended_certifications");
  });

  it("separates acquired vs planned certifications and experienced vs learning skills", () => {
    const customProfile = {
      ...TEST_MOCK_PROFILE,
      skills: [
        { id: "s-1", name: "Go", category: "language" as const, status: "experienced" as const },
        { id: "s-2", name: "Rust", category: "language" as const, status: "learning" as const },
      ],
      certifications: [
        { id: "c-1", name: "AZ-305", issuer: "Microsoft", status: "acquired" as const, yearAcquired: 2024 },
        { id: "c-2", name: "AZ-400", issuer: "Microsoft", status: "studying" as const, targetPeriod: "2026年Q3" },
      ],
    };

    const { userPrompt } = buildJobAnalysisPrompt("求人票本文", "ビズリーチ", customProfile);
    expect(userPrompt).toContain("実務経験技術スタック: Go");
    expect(userPrompt).toContain("学習中・習得予定技術: Rust (独学・学習中)");
    expect(userPrompt).toContain("取得済み認定資格: AZ-305 (2024年取得, 発行元: Microsoft)");
    expect(userPrompt).toContain("学習中・取得目標資格: AZ-400 (現在学習中/受験予定, 目標: 2026年Q3, 発行元: Microsoft)");
  });
});
