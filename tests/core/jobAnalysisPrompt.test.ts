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

  it("includes valid JSON schema with required fields", () => {
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.type).toBe("object");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("company");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("match_score");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("judgment");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("score_breakdown");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("agent_questions");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("appeal_points");
  });
});
